import { EvenHubBridge, type PageLayout } from './bridge';
import { createStore } from '../state/store';
import type { AppState, GraphicEntry, ChartResolution } from '../state/types';
import { makeGraphicId } from '../state/types';
import { getDisplayData } from '../state/selectors';
import { mapEvenHubEvent } from '../input/action-map';
import { renderToCanvasDirect, getCanvas } from './canvas-renderer';
import { cropScaleToIndexedPng } from './png-utils';
import { IMAGE_TILES, G2_IMAGE_MAX_W, G2_IMAGE_MAX_H } from './layout';
import { formatPrice, formatPercent, formatVolume, formatResolutionShort, formatCandleTime } from '../utils/format';
import { activateKeepAlive } from '../utils/keep-alive';
import { Poller } from '../data/poller';

let hub: EvenHubBridge | null = null;
let store: ReturnType<typeof createStore>;
let poller: Poller;
let flashTimer: ReturnType<typeof setInterval> | null = null;

// ── Layout management ──

function getDesiredLayout(state: AppState): PageLayout {
  return state.screen === 'stock-detail' ? 'chart' : 'text';
}

async function ensureLayout(state: AppState): Promise<void> {
  if (!hub || !hub.pageReady) return;
  const desired = getDesiredLayout(state);
  if (hub.currentLayout === desired) return;

  if (desired === 'chart') {
    await hub.switchToChartLayout(buildChartTopText(state));
  } else {
    await hub.switchToTextLayout(buildFullText(state));
  }
}

// ── Text updates (instant) ──

let textInFlight = false;
let textPending = false;

async function flushText(state: AppState): Promise<void> {
  if (!hub || !hub.pageReady) return;

  // If a text send is in flight, mark pending and return — we'll catch up after
  if (textInFlight) { textPending = true; return; }
  textInFlight = true;
  try {
    await ensureLayout(state);
    const text = hub.currentLayout === 'chart'
      ? buildChartTopText(state)
      : buildFullText(state);
    hub.updateText(text).catch(() => {}).finally(() => {
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
const IMG_INTERVAL = 150;

// Track tile hashes to skip unchanged tiles
const tileHashes = new Map<number, number>();
// Round-robin: send 1 tile per cycle
let nextTileIdx = 0;

async function flushImages(state: AppState): Promise<void> {
  if (!hub || !hub.pageReady || hub.currentLayout !== 'chart') return;
  if (imgBusy) { imgDirty = true; return; }

  imgBusy = true;
  imgDirty = false;
  try {
    const data = getDisplayData(state);

    // Skip if no chart data yet — avoid broken blank frames
    if (!data.chartData || data.chartData.candles.length === 0) return;

    const canvas = renderToCanvasDirect(data);

    // Encode all tiles, find the next one that changed
    let sent = false;
    for (let attempt = 0; attempt < IMAGE_TILES.length; attempt++) {
      const idx = (nextTileIdx + attempt) % IMAGE_TILES.length;
      const tile = IMAGE_TILES[idx]!;

      const encoded = cropScaleToIndexedPng(
        canvas,
        tile.crop.sx, tile.crop.sy, tile.crop.sw, tile.crop.sh,
        G2_IMAGE_MAX_W, G2_IMAGE_MAX_H,
      );

      const prevHash = tileHashes.get(tile.id);
      if (prevHash === encoded.hash) continue;

      tileHashes.set(tile.id, encoded.hash);
      await hub.sendImage(tile.id, tile.name, encoded.bytes);
      nextTileIdx = (idx + 1) % IMAGE_TILES.length;
      sent = true;
      break; // Only 1 tile per cycle
    }

    // If all tiles unchanged, advance anyway
    if (!sent) nextTileIdx = (nextTileIdx + 1) % IMAGE_TILES.length;
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
  if (getDesiredLayout(state) === 'chart') {
    // Reset to left→right on any visual data change
    if (prev && (
      prev.screen !== state.screen ||
      prev.candles !== state.candles ||
      prev.selectedGraphicId !== state.selectedGraphicId ||
      prev.settings !== state.settings
    )) {
      nextTileIdx = 0;
      tileHashes.clear();
    }
    flushImages(state).catch(() => {});
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

/** Full-screen text for watchlist/settings/splash. */
function buildFullText(state: AppState): string {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  switch (state.screen) {
    case 'splash':
      return 'EvenMarket\nLoading...';

    case 'watchlist': {
      const lines: string[] = [];
      const hi = state.highlightedIndex;

      lines.push(`MARKETS${' '.repeat(20)}${time}`);
      lines.push('');

      for (let i = 0; i < state.settings.graphics.length; i++) {
        const g = state.settings.graphics[i]!;
        const q = state.quotes[g.symbol];
        const cursor = i === hi ? '\u25B6' : '  ';
        const res = formatResolutionShort(g.resolution);

        if (q) {
          const sym = padR(`${g.symbol} ${res}`, 11);
          const price = padL(formatPrice(q.price), 9);
          const pct = padL(formatPercent(q.changePercent), 8);
          lines.push(`${cursor} ${sym}${price}  ${pct}`);
        } else {
          lines.push(`${cursor} ${padR(`${g.symbol} ${res}`, 11)}   ---.--    --.--`);
        }
      }

      lines.push('');
      const settingsHi = hi === state.settings.graphics.length;
      lines.push(`${settingsHi ? '\u25B6' : '  '} [Settings]`);
      return lines.join('\n');
    }

    case 'settings': {
      const s = state.settings;
      const hi = state.highlightedIndex;
      const editing = state.settingsEditActive;
      const flash = state.candleFlashPhase ? '\u25CF' : '\u25CB';
      const lines: string[] = [];

      lines.push(`SETTINGS${' '.repeat(19)}${time}`);
      lines.push('');

      // Refresh row
      const refreshLabel = `${s.refreshInterval}s`;
      if (editing && hi === 0) {
        lines.push(`${flash} Refresh:  \u25C0 [${refreshLabel}] \u25B6`);
      } else if (hi === 0) {
        lines.push(`\u25B6 Refresh:  ${refreshLabel}`);
      } else {
        lines.push(`   Refresh:  ${refreshLabel}`);
      }

      // Chart type row
      const chartLabel = s.chartType === 'sparkline' ? 'Sparkline' : 'Candles';
      if (editing && hi === 1) {
        lines.push(`${flash} Chart:    \u25C0 [${chartLabel}] \u25B6`);
      } else if (hi === 1) {
        lines.push(`\u25B6 Chart:    ${chartLabel}`);
      } else {
        lines.push(`   Chart:    ${chartLabel}`);
      }

      lines.push('');
      if (editing) {
        lines.push('  Scroll to change value');
        lines.push('  Tap or double-tap to confirm');
      } else {
        lines.push('  Tap to edit');
        lines.push('  Double-tap to go back');
      }
      return lines.join('\n');
    }

    default:
      return `${time}\nEvenMarket`;
  }
}

/** Top text panel for stock detail (chart below). */
function buildChartTopText(state: AppState): string {
  const g = state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
  if (!g) return 'No graphic';
  const q = state.quotes[g.symbol];
  if (!q) return `${g.symbol}  Loading...`;

  const res = formatResolutionShort(g.resolution);

  // Price line
  let line1 = `${g.symbol} ${res}  $${formatPrice(q.price)}  ${formatPercent(q.changePercent)}`;

  // OHLC — candle nav or live quote
  let ohlc: string;
  const ci = state.highlightedCandleIndex;
  const inCandleNav = state.candleNavActive && ci >= 0 && ci < state.candles.length;
  if (inCandleNav) {
    const c = state.candles[ci]!;
    ohlc = `O:${formatPrice(c.open)} H:${formatPrice(c.high)} C:${formatPrice(c.close)} L:${formatPrice(c.low)} V:${formatVolume(c.volume)}`;
  } else {
    ohlc = `O:${formatPrice(q.open)} H:${formatPrice(q.high)} C:${formatPrice(q.price)} L:${formatPrice(q.low)} V:${formatVolume(q.volume)}`;
  }

  // Mode buttons
  const flash = state.candleFlashPhase ? '\u25CF' : '\u25CB';
  const inBtnMode = !state.candleNavActive && !state.tfNavActive;
  let tfBtn = state.tfNavActive ? `${flash}[${res}]` :
    (inBtnMode && state.highlightedIndex === 0) ? `\u25B6[${res}]` : ` ${res} `;
  let navBtn = state.candleNavActive ? `${flash}[NAV]` :
    (inBtnMode && state.highlightedIndex === 1) ? '\u25B6[NAV]' : ' NAV ';

  return `${line1}\n${ohlc}\n${tfBtn}  ${navBtn}`;
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

  const needsFlash = (state.screen === 'stock-detail' && (state.candleNavActive || state.tfNavActive))
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

    const setupOk = await hub.setupTextPage();
    if (setupOk) {
      flushDisplay(store.getState());
    }

    hub.onEvent((event) => {
      const action = mapEvenHubEvent(event, store.getState());
      if (action) store.dispatch(action);
    });
  }).catch(() => {});

  store.subscribe((state, prev) => {
    if (shouldUpdateDisplay(state, prev)) {
      flushDisplay(state, prev);
    }
    handleSideEffects(state, prev);
  });

  poller.start();
  activateKeepAlive();

  setTimeout(() => store.dispatch({ type: 'APP_INIT' }), 1000);
}
