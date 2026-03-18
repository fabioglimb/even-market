import { EvenHubBridge } from 'even-toolkit/bridge';
import type { PageMode } from 'even-toolkit/types';
import { notifyTextUpdate } from 'even-toolkit/gestures';
import { encodeTilesBatch, resetTileCache } from 'even-toolkit/png-utils';
import { IMAGE_TILES, G2_IMAGE_MAX_W, G2_IMAGE_MAX_H, CHART_CANVAS_W, CHART_CANVAS_H, VIEWPORT_PER_RESOLUTION } from 'even-toolkit/layout';
import { activateKeepAlive } from 'even-toolkit/keep-alive';
import { buildActionBar } from 'even-toolkit/action-bar';
import { marketSplash } from './splash';
import { createStore } from '../state/store';
import type { AppState, GraphicEntry, ChartResolution } from '../state/types';
import { makeGraphicId } from '../state/types';
import { getDisplayData } from '../state/selectors';
import { mapEvenHubEvent } from '../input/action-map';
import { renderToCanvasDirect, drawCandlesInto, getCanvas, resetViewport, getViewportStart } from './canvas-renderer';
import { formatPrice, formatPercent, formatVolume, formatResolutionShort, formatCandleTime } from '../utils/format';
import { t, MARKET_LANGUAGES, getLanguageName } from '../utils/i18n';
import type { MarketLanguage } from '../utils/i18n';
import { Poller } from '../data/poller';

type PageLayout = PageMode;

// ── Splash candle persistence ──

const SPLASH_CANDLES_KEY = 'even-market-splash-candles';

function saveSplashCandles(candles: { open: number; high: number; low: number; close: number; volume: number }[]): void {
  try {
    const slice = candles.slice(-16).map((c) => ({
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
    }));
    localStorage.setItem(SPLASH_CANDLES_KEY, JSON.stringify(slice));
  } catch { /* ignore */ }
}

let hub: EvenHubBridge | null = null;
let store: ReturnType<typeof createStore>;
let poller: Poller;
let flashTimer: ReturnType<typeof setInterval> | null = null;

// ── Layout management ──

function getDesiredLayout(state: AppState): PageLayout {
  if (state.screen === 'splash') return 'splash';
  if (state.screen === 'home') return 'home' as PageLayout;
  if (state.screen === 'stock-detail') return 'chart';
  return 'text';
}

async function ensureLayout(state: AppState): Promise<void> {
  if (!hub || !hub.pageReady) return;
  const desired = getDesiredLayout(state);
  if (hub.currentLayout === desired) return;
  if (desired === 'splash') return;

  if (state.screen === 'home') {
    // Only use the first tile (logo) for home — "Loading..." tile is splash-only
    const tiles = marketSplash.getTiles();
    const t = tiles[0];
    const imageTiles = t ? [{ id: t.id, name: t.name, x: t.x, y: t.y, w: t.w, h: t.h }] : undefined;
    await hub.switchToHomeLayout(buildHomeText(state), imageTiles);
  } else if (desired === 'chart') {
    await hub.switchToChartLayout(buildChartTopText(state));
  } else if (state.screen === 'watchlist') {
    const cols = buildWatchlistColumns(state);
    await hub.switchToWatchlist(cols.sym, cols.price, cols.pct);
  } else if (state.screen === 'settings') {
    await hub.switchToSettings(buildFullText(state));
  }
}

// ── Text updates (instant) ──

let textInFlight = false;
let textPending = false;

async function flushText(state: AppState): Promise<void> {
  if (!hub || !hub.pageReady) return;
  if (state.screen === 'splash') return;

  if (textInFlight) { textPending = true; return; }
  textInFlight = true;
  try {
    const desired = getDesiredLayout(state);
    if (hub.currentLayout !== desired && desired !== 'splash') {
      await ensureLayout(state);
    }

    notifyTextUpdate();

    let updatePromise: Promise<void>;
    if (state.screen === 'home') {
      updatePromise = hub.updateHomeText(buildHomeText(state));
    } else if (hub.currentLayout === 'chart') {
      updatePromise = hub.updateChartText(buildChartTopText(state));
    } else if (state.screen === 'watchlist') {
      const cols = buildWatchlistColumns(state);
      updatePromise = hub.updateWatchlist(cols.sym, cols.price, cols.pct);
    } else if (state.screen === 'settings') {
      updatePromise = hub.updateSettings(buildFullText(state));
    } else {
      updatePromise = hub.updateText(buildFullText(state));
    }

    updatePromise.catch(() => {}).finally(() => {
      textInFlight = false;
      if (textPending) {
        textPending = false;
        flushText(store.getState()).catch(() => {});
      }
    });
  } catch {
    textInFlight = false;
  }
}

// ── Image updates (throttled, chart layout only) ──

let imgBusy = false;
let imgDirty = false;
const IMG_INTERVAL = 80;
const tileHashes = new Map<number, number>();
let prevHighlightTile = -1;

/** Which tile index (0,1,2) does a candle pixel position fall in? */
function candleToTile(candleIdx: number, totalCandles: number, viewportSize: number): number {
  const canvasW = 576;
  const vp = Math.min(totalCandles, viewportSize);
  if (vp <= 0) return 0;
  const candleW = Math.floor((canvasW - 12) / vp);
  const px = 6 + candleIdx * candleW + candleW / 2;
  if (px < 200) return 0;
  if (px < 400) return 1;
  return 2;
}

async function flushImages(state: AppState, prev?: AppState): Promise<void> {
  if (!hub || !hub.pageReady || (hub.currentLayout !== 'chart' && hub.currentLayout !== 'home')) return;
  if (state.screen === 'splash') return;
  if (imgBusy) { imgDirty = true; return; }

  imgBusy = true;
  imgDirty = false;
  try {
    // Home screen: send only the first tile (logo) — home layout has 1 image container
    if (state.screen === 'home') {
      const tile = marketSplash.getTiles()[0];
      if (tile) await hub.sendImage(tile.id, tile.name, tile.bytes);
      imgBusy = false;
      return;
    }

    const data = getDisplayData(state);
    if (!data.chartData || data.chartData.candles.length === 0) return;

    const canvas = renderToCanvasDirect(data);

    // Determine which tiles to encode
    const fullRedraw = !prev || prev.candles !== state.candles ||
      prev.settings !== state.settings || prev.selectedGraphicId !== state.selectedGraphicId ||
      prev.screen !== state.screen;

    let tilesToEncode: number[];
    if (fullRedraw) {
      tilesToEncode = [0, 1, 2];
    } else {
      // Only encode tiles affected by highlight movement
      const vp = (data.resolution && VIEWPORT_PER_RESOLUTION[data.resolution]) || 40;
      const dirtyTiles = new Set<number>();
      if (state.highlightedCandleIndex >= 0) {
        const localIdx = state.highlightedCandleIndex - (getViewportStart() >= 0 ? getViewportStart() : 0);
        dirtyTiles.add(candleToTile(localIdx, data.chartData.candles.length, vp));
      }
      if (prevHighlightTile >= 0) dirtyTiles.add(prevHighlightTile);
      tilesToEncode = dirtyTiles.size > 0 ? [...dirtyTiles] : [0, 1, 2];
    }

    // Encode only dirty tiles
    for (const i of tilesToEncode) {
      const tile = IMAGE_TILES[i]!;
      const enc = encodeTilesBatch(canvas, [tile], G2_IMAGE_MAX_W, G2_IMAGE_MAX_H)[0]!;
      if (tileHashes.get(tile.id) === enc.hash) continue;
      tileHashes.set(tile.id, enc.hash);
      await hub.sendImage(tile.id, tile.name, enc.bytes);
      if (textPending) break;
    }

    // Track highlight tile for next diff
    if (state.highlightedCandleIndex >= 0 && data.chartData) {
      const vp = (data.resolution && VIEWPORT_PER_RESOLUTION[data.resolution]) || 40;
      const localIdx = state.highlightedCandleIndex - (getViewportStart() >= 0 ? getViewportStart() : 0);
      prevHighlightTile = candleToTile(localIdx, data.chartData.candles.length, vp);
    } else {
      prevHighlightTile = -1;
    }
  } catch { /* skip */ }
  finally {
    imgBusy = false;
    if (imgDirty) {
      setTimeout(() => {
        imgDirty = false;
        flushImages(store.getState()).catch(() => {});
      }, IMG_INTERVAL);
    }
  }
}

// ── Combined flush ──

function flushDisplay(state: AppState, prev?: AppState): void {
  flushText(state).catch(() => {});
  const layout = getDesiredLayout(state);
  if (layout === 'chart' || layout === 'home') {
    if (prev && (
      prev.screen !== state.screen ||
      prev.candles !== state.candles ||
      prev.selectedGraphicId !== state.selectedGraphicId ||
      prev.settings !== state.settings
    )) {
      tileHashes.clear();
      resetViewport();
    }
    flushImages(state, prev).catch(() => {});
  }
}

function needsImageUpdate(state: AppState, prev: AppState): boolean {
  if (state.screen !== prev.screen) return true;
  if (state.quotes !== prev.quotes) return true;
  if (state.candles !== prev.candles) return true;
  if (state.selectedGraphicId !== prev.selectedGraphicId) return true;
  if (state.settings !== prev.settings) return true;
  return false;
}

// ── Text builders ──

function padR(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function padL(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s;
}

/** Home screen text (below chart image tiles): EvenMarket + Watchlist/Settings buttons. */
function buildHomeText(state: AppState): string {
  const lang = state.settings.language;
  const hi = state.highlightedIndex;
  const wlCursor = hi === 0 ? '\u25B6 ' : '  ';
  const setCursor = hi === 1 ? '\u25B6 ' : '  ';
  return `\n${wlCursor}${t('home.watchlist', lang)}\n${setCursor}${t('home.settings', lang)}`;
}

/** Build 3 column strings for the watchlist (symbol, price, percent). */
function buildWatchlistColumns(state: AppState): { sym: string; price: string; pct: string } {
  const lang = state.settings.language;
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hi = state.highlightedIndex;
  const totalItems = state.settings.graphics.length;

  const MAX_VISIBLE = 5;

  // Sliding window
  let winStart = 0;
  if (totalItems > MAX_VISIBLE) {
    winStart = Math.max(0, Math.min(totalItems - MAX_VISIBLE, hi - Math.floor(MAX_VISIBLE / 2)));
  }
  const winEnd = Math.min(totalItems, winStart + MAX_VISIBLE);

  // Column 1: title + cursor + symbol
  const symLines: string[] = [];
  symLines.push(t('watchlist.symbol', lang));
  symLines.push(winStart > 0 ? '  \u25B2' : '');
  for (let i = winStart; i < winEnd; i++) {
    const g = state.settings.graphics[i]!;
    const res = formatResolutionShort(g.resolution);
    const cursor = i === hi ? '\u25B6 ' : '  ';
    symLines.push(`${cursor}${g.symbol} ${res}`);
  }
  while (symLines.length < 2 + MAX_VISIBLE) symLines.push('');
  symLines.push(winEnd < totalItems ? '  \u25BC' : '');

  // Column 2: title + price
  const priceLines: string[] = [];
  priceLines.push(t('watchlist.price', lang));
  priceLines.push(''); // up arrow row
  for (let i = winStart; i < winEnd; i++) {
    const g = state.settings.graphics[i]!;
    const q = state.quotes[g.symbol];
    priceLines.push(q ? formatPrice(q.price) : '---.--');
  }
  while (priceLines.length < 2 + MAX_VISIBLE) priceLines.push('');
  priceLines.push(''); // down arrow row

  // Column 3: title + percent
  const pctLines: string[] = [];
  pctLines.push(t('watchlist.change', lang));
  pctLines.push(''); // up arrow row
  for (let i = winStart; i < winEnd; i++) {
    const g = state.settings.graphics[i]!;
    const q = state.quotes[g.symbol];
    pctLines.push(q ? formatPercent(q.changePercent) : '--.--');
  }
  while (pctLines.length < 2 + MAX_VISIBLE) pctLines.push('');
  pctLines.push(''); // down arrow row

  return {
    sym: symLines.join('\n'),
    price: priceLines.join('\n'),
    pct: pctLines.join('\n'),
  };
}

/** Full-screen text for settings/splash. */
function buildFullText(state: AppState): string {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  switch (state.screen) {
    case 'splash':
      return '';

    case 'watchlist': {
      // Watchlist uses 3-column layout via buildWatchlistColumns
      const cols = buildWatchlistColumns(state);
      return cols.sym; // fallback — actual rendering uses updateWatchlist
    }

    case 'settings': {
      const lang = state.settings.language;
      const s = state.settings;
      const hi = state.highlightedIndex;
      const editing = state.settingsEditActive;
      const lines: string[] = [];

      lines.push(`${t('settings.title', lang)}${' '.repeat(19)}${time}`);
      lines.push('');

      // Refresh row
      const refreshLabel = `${s.refreshInterval}s`;
      const refreshActive = editing && hi === 0 ? t('settings.refresh', lang) : null;
      const refreshBar = buildActionBar(
        [t('settings.refresh', lang)],
        hi === 0 ? 0 : -1,
        refreshActive,
        state.candleFlashPhase,
      );
      if (editing && hi === 0) {
        lines.push(`${refreshBar}  \u25C0 [${refreshLabel}] \u25B6`);
      } else {
        lines.push(`${refreshBar}  ${refreshLabel}`);
      }

      // Chart type row
      const chartLabel = s.chartType === 'sparkline' ? t('settings.sparkline', lang) : t('settings.candles', lang);
      const chartActive = editing && hi === 1 ? t('settings.chart', lang) : null;
      const chartBar = buildActionBar(
        [t('settings.chart', lang)],
        hi === 1 ? 0 : -1,
        chartActive,
        state.candleFlashPhase,
      );
      if (editing && hi === 1) {
        lines.push(`${chartBar}    \u25C0 [${chartLabel}] \u25B6`);
      } else {
        lines.push(`${chartBar}    ${chartLabel}`);
      }

      // Language row
      const langName = getLanguageName(s.language);
      const langActive = editing && hi === 2 ? t('settings.language', lang) : null;
      const langBar = buildActionBar(
        [t('settings.language', lang)],
        hi === 2 ? 0 : -1,
        langActive,
        state.candleFlashPhase,
      );
      if (editing && hi === 2) {
        lines.push(`${langBar}    \u25C0 [${langName}] \u25B6`);
      } else {
        lines.push(`${langBar}    ${langName}`);
      }

      return lines.join('\n');
    }

    default:
      return `${time}\nEvenMarket`;
  }
}

/** Text below chart: header + scrollable candle table. */
function buildChartTopText(state: AppState): string {
  const lang = state.settings.language;
  const g = state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
  if (!g) return t('chart.noGraphic', lang);
  const q = state.quotes[g.symbol];
  if (!q) return `${g.symbol}  ${t('chart.loading', lang)}`;

  const res = formatResolutionShort(g.resolution);
  const inBtnMode = !state.candleNavActive && !state.tfNavActive;
  const activeLabel = state.tfNavActive ? res : state.candleNavActive ? t('chart.nav', lang) : null;
  const selectedIdx = inBtnMode ? state.highlightedIndex : 0;
  const btnBar = buildActionBar([res, t('chart.nav', lang)], selectedIdx, activeLabel, state.candleFlashPhase);

  const lines: string[] = [];

  // Row 1: symbol, price, change, buttons
  lines.push(`${g.symbol} $${formatPrice(q.price)} ${formatPercent(q.changePercent)}  ${btnBar}`);

  // Candle list — each candle takes 2 lines (OHLC + Volume/Date)
  const candles = state.candles;
  if (candles.length > 0) {
    const MAX_CANDLES = 2; // 2 candles x 2 lines = 4 lines
    const ci = state.highlightedCandleIndex;
    const reversed = [...candles].reverse();
    const hiReversed = ci >= 0 ? candles.length - 1 - ci : -1;

    let winStart = 0;
    if (reversed.length > MAX_CANDLES && hiReversed >= 0) {
      winStart = Math.max(0, Math.min(reversed.length - MAX_CANDLES, hiReversed - Math.floor(MAX_CANDLES / 2)));
    }
    const winEnd = Math.min(reversed.length, winStart + MAX_CANDLES);

    for (let i = winStart; i < winEnd; i++) {
      const cd = reversed[i]!;
      const selected = i === hiReversed;
      const row1 = `O:${formatPrice(cd.open)}  H:${formatPrice(cd.high)}  L:${formatPrice(cd.low)}  C:${formatPrice(cd.close)}`;
      const row2 = `V:${formatVolume(cd.volume)}  ${formatCandleTime(cd.time, g.resolution)}`;
      if (selected) {
        lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
        lines.push(row1);
        lines.push(row2);
        lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
      } else {
        lines.push(row1);
        lines.push(row2);
      }
    }
  } else {
    lines.push(t('chart.noData', lang));
  }

  return lines.join('\n');
}

// ── State change detection ──

function shouldUpdateDisplay(state: AppState, prev: AppState): boolean {
  if (state.screen !== prev.screen) return true;
  if (state.highlightedIndex !== prev.highlightedIndex) return true;
  if (state.quotes !== prev.quotes) return true;
  if (state.candles !== prev.candles) return true;
  if (state.selectedGraphicId !== prev.selectedGraphicId) return true;
  if (state.candleNavActive !== prev.candleNavActive) return true;
  if (state.highlightedCandleIndex !== prev.highlightedCandleIndex) return true;
  if (state.tfNavActive !== prev.tfNavActive) return true;
  if (state.settingsEditActive !== prev.settingsEditActive) return true;
  if (state.candleFlashPhase !== prev.candleFlashPhase) return true;
  if (state.settings !== prev.settings) return true;
  if (state.loading !== prev.loading) return true;
  if (state.lastError !== prev.lastError) return true;
  return false;
}

// ── Side effects ──

function getSelectedGraphic(state: AppState): GraphicEntry | undefined {
  return state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
}

function handleSideEffects(state: AppState, prev: AppState): void {
  if (state.screen === 'stock-detail' && state.selectedGraphicId) {
    const graphic = getSelectedGraphic(state);
    if (graphic) {
      const enteringDetail = state.screen !== prev.screen || state.selectedGraphicId !== prev.selectedGraphicId;
      const resolutionChanged = state.settings !== prev.settings && state.selectedGraphicId;
      if (enteringDetail || resolutionChanged) {
        poller.fetchCandles(graphic.symbol, graphic.resolution);
      }
    }
  }

  const needsFlash = (state.screen === 'stock-detail' && state.tfNavActive)
    || (state.screen === 'settings' && state.settingsEditActive);
  if (needsFlash && !flashTimer) {
    flashTimer = setInterval(() => {
      store.dispatch({ type: 'CANDLE_FLASH_TICK' });
    }, 500);
  } else if (!needsFlash && flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }

  if (state.settings !== prev.settings) {
    try {
      localStorage.setItem('even-market-settings', JSON.stringify(state.settings));
    } catch { /* ignore */ }
  }

  // Persist candles for splash screen
  if (state.candles !== prev.candles && state.candles.length > 0) {
    saveSplashCandles(state.candles);
  }
}

// ── Setup ──

function mountHiddenCanvas(): void {
  const container = document.getElementById('glasses-canvas');
  if (!container) return;
  const cvs = getCanvas();
  container.appendChild(cvs);
}

function migrateOldSettings(raw: string): Record<string, unknown> {
  const settings = JSON.parse(raw);
  if (settings.watchlist && Array.isArray(settings.watchlist) && settings.watchlist.length > 0
      && typeof settings.watchlist[0] === 'string') {
    const resolution: ChartResolution = settings.chartResolution || 'D';
    settings.graphics = (settings.watchlist as string[]).map((sym: string) => ({
      id: makeGraphicId(sym, resolution),
      symbol: sym,
      resolution,
    }));
    delete settings.watchlist;
    delete settings.chartResolution;
  }
  if ('chartResolution' in settings) delete settings.chartResolution;
  return settings;
}

function loadSettings(): void {
  try {
    const raw = localStorage.getItem('even-market-settings');
    if (raw) {
      const settings = migrateOldSettings(raw);
      store.dispatch({ type: 'SETTINGS_LOADED', settings });
      localStorage.setItem('even-market-settings', JSON.stringify(store.getState().settings));
    }
  } catch { /* use defaults */ }
}

export function getStore(): ReturnType<typeof createStore> {
  return store;
}

export function getPoller(): Poller {
  return poller;
}

export async function initGlassesRenderer(): Promise<void> {
  mountHiddenCanvas();

  store = createStore();
  poller = new Poller(store);
  loadSettings();

  const sdkHub = new EvenHubBridge();
  sdkHub.init().then(async () => {
    hub = sdkHub;
    store.dispatch({ type: 'CONNECTION_STATUS', status: 'connected' });

    // Set up initial text page (required before chart layout switch)
    await hub.setupTextPage();

    // Show splash screen
    await marketSplash.show(hub);

    hub.onEvent((event) => {
      const action = mapEvenHubEvent(event, store.getState());
      if (action) store.dispatch(action);
    });

    // Wait for minimum splash time, clear "Loading..." tile with black, go to home.
    // No layout rebuild — same containers, just content swap. Logo stays.
    await marketSplash.waitMinTime();
    await marketSplash.clearExtras(hub);
    store.dispatch({ type: 'APP_INIT' });
  }).catch(() => {});

  store.subscribe((state, prev) => {
    if (shouldUpdateDisplay(state, prev)) {
      flushDisplay(state, prev);
    }
    handleSideEffects(state, prev);
  });

  poller.start();
  activateKeepAlive();
}
