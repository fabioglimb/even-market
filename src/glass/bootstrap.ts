import { EvenHubBridge, type PageLayout } from './bridge';
import { createStore } from '../state/store';
import type { AppState, GraphicEntry, ChartResolution } from '../state/types';
import { makeGraphicId } from '../state/types';
import { getDisplayData } from '../state/selectors';
import { mapEvenHubEvent } from '../input/action-map';
import { notifyTextUpdate } from '../input/gestures';
import { renderToCanvasDirect, drawCandlesInto, getCanvas, resetViewport, getViewportStart } from './canvas-renderer';
import { encodeTilesBatch, resetTileCache } from './png-utils';
import { IMAGE_TILES, G2_IMAGE_MAX_W, G2_IMAGE_MAX_H, CHART_CANVAS_W, CHART_CANVAS_H, VIEWPORT_PER_RESOLUTION } from './layout';
import { formatPrice, formatPercent, formatVolume, formatResolutionShort, formatCandleTime } from '../utils/format';
import { activateKeepAlive } from '../utils/keep-alive';
import { Poller } from '../data/poller';

// ── Splash ──

const SPLASH_CANDLES_KEY = 'even-market-splash-candles';

// Fallback candles for first boot (before any real data is saved)
const DEFAULT_SPLASH_CANDLES = [
  { open: 180, high: 184, low: 178, close: 182, volume: 5000 },
  { open: 182, high: 186, low: 180, close: 175, volume: 7000 },
  { open: 175, high: 179, low: 173, close: 177, volume: 4500 },
  { open: 177, high: 178, low: 170, close: 171, volume: 8000 },
  { open: 171, high: 175, low: 169, close: 174, volume: 6000 },
  { open: 174, high: 176, low: 168, close: 169, volume: 9000 },
  { open: 169, high: 173, low: 167, close: 172, volume: 5500 },
  { open: 172, high: 174, low: 164, close: 165, volume: 10000 },
  { open: 165, high: 170, low: 163, close: 168, volume: 7500 },
  { open: 168, high: 169, low: 160, close: 161, volume: 8500 },
  { open: 161, high: 166, low: 159, close: 164, volume: 6500 },
  { open: 164, high: 165, low: 155, close: 156, volume: 11000 },
  { open: 156, high: 160, low: 153, close: 158, volume: 7000 },
  { open: 158, high: 159, low: 148, close: 150, volume: 12000 },
];

function loadSplashCandles(): { open: number; high: number; low: number; close: number; volume?: number }[] {
  try {
    const raw = localStorage.getItem(SPLASH_CANDLES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch { /* ignore */ }
  return DEFAULT_SPLASH_CANDLES;
}

function saveSplashCandles(candles: { open: number; high: number; low: number; close: number; volume: number }[]): void {
  try {
    // Save last 16 candles for the splash screen — few enough to look like real candlesticks
    const slice = candles.slice(-16).map((c) => ({
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
    }));
    localStorage.setItem(SPLASH_CANDLES_KEY, JSON.stringify(slice));
  } catch { /* ignore */ }
}

/** Render the splash candle chart as a 200x100 image. */
function renderSplashTiles(): { id: number; name: string; bytes: Uint8Array }[] {
  const W = G2_IMAGE_MAX_W;  // 200
  const H = G2_IMAGE_MAX_H;  // 100
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);

  // Original 14 hand-crafted candles (rising trend, from first commit)
  const candles = [
    { o: 0.92, h: 0.86, l: 0.95, c: 0.87 },
    { o: 0.87, h: 0.70, l: 0.90, c: 0.72 },
    { o: 0.72, h: 0.67, l: 0.78, c: 0.76 },
    { o: 0.76, h: 0.58, l: 0.79, c: 0.60 },
    { o: 0.60, h: 0.55, l: 0.63, c: 0.57 },
    { o: 0.57, h: 0.52, l: 0.66, c: 0.64 },
    { o: 0.64, h: 0.60, l: 0.67, c: 0.62 },
    { o: 0.62, h: 0.42, l: 0.65, c: 0.44 },
    { o: 0.44, h: 0.38, l: 0.52, c: 0.50 },
    { o: 0.50, h: 0.46, l: 0.53, c: 0.48 },
    { o: 0.48, h: 0.30, l: 0.51, c: 0.32 },
    { o: 0.32, h: 0.26, l: 0.38, c: 0.36 },
    { o: 0.36, h: 0.22, l: 0.39, c: 0.24 },
    { o: 0.24, h: 0.08, l: 0.28, c: 0.12 },
  ];

  // Chart area scaled to 200x100
  const chartX = 10, chartTop = 3;
  const chartW = 180, chartH = 55;
  const gap = 2;
  const candleW = Math.floor((chartW - gap * (candles.length - 1)) / candles.length);

  for (let i = 0; i < candles.length; i++) {
    const cd = candles[i]!;
    const x = chartX + i * (candleW + gap);
    const midX = x + candleW / 2;
    const isUp = cd.c <= cd.o;

    const wickTop = chartTop + cd.h * chartH;
    const wickBot = chartTop + cd.l * chartH;
    const bodyTop = chartTop + Math.min(cd.o, cd.c) * chartH;
    const bodyBot = chartTop + Math.max(cd.o, cd.c) * chartH;
    const bodyH = Math.max(2, bodyBot - bodyTop);

    const color = isUp ? '#d0d0d0' : '#505050';

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX, wickTop);
    ctx.lineTo(midX, wickBot);
    ctx.stroke();

    // Body: filled for up, outline for down
    if (isUp) {
      ctx.fillStyle = color;
      ctx.fillRect(x, bodyTop, candleW, bodyH);
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, bodyTop, candleW, bodyH);
    }
  }

  // "EvenMarket" text below candles
  ctx.fillStyle = '#e0e0e0';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EvenMarket', W / 2, 78);
  ctx.textAlign = 'left';

  // Encode left tile (x=0, aligned with text below)
  const enc = encodeTilesBatch(c, [{ crop: { sx: 0, sy: 0, sw: W, sh: H }, name: 'splash' }], W, H)[0]!;
  const leftTile = IMAGE_TILES[0]!;

  // Black tiles for center and right
  const black = document.createElement('canvas');
  black.width = W; black.height = H;
  const bctx = black.getContext('2d')!;
  bctx.fillStyle = '#000000'; bctx.fillRect(0, 0, W, H);
  const blackEnc = encodeTilesBatch(black, [{ crop: { sx: 0, sy: 0, sw: W, sh: H }, name: 'black' }], W, H)[0]!;

  return [
    { id: leftTile.id, name: leftTile.name, bytes: enc.bytes },
    { id: IMAGE_TILES[1]!.id, name: IMAGE_TILES[1]!.name, bytes: blackEnc.bytes },
    { id: IMAGE_TILES[2]!.id, name: IMAGE_TILES[2]!.name, bytes: blackEnc.bytes },
  ];
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
    await hub.switchToHomeLayout(buildHomeText(state));
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
  if (imgBusy) { imgDirty = true; return; }

  imgBusy = true;
  imgDirty = false;
  try {
    // Home screen: render splash image (single tile)
    if (state.screen === 'home') {
      const tiles = renderSplashTiles();
      await hub.sendImage(tiles[0]!.id, tiles[0]!.name, tiles[0]!.bytes);
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
  const hi = state.highlightedIndex;
  const wlCursor = hi === 0 ? '\u25B6 ' : '  ';
  const setCursor = hi === 1 ? '\u25B6 ' : '  ';
  return `\n${wlCursor}Watchlist\n${setCursor}Settings`;
}

/** Build 3 column strings for the watchlist (symbol, price, percent). */
function buildWatchlistColumns(state: AppState): { sym: string; price: string; pct: string } {
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
  symLines.push('SYMBOL');
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
  priceLines.push('PRICE');
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
  pctLines.push('CHANGE');
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

      return lines.join('\n');
    }

    default:
      return `${time}\nEvenMarket`;
  }
}

/** Text below chart: header + scrollable candle table. */
function buildChartTopText(state: AppState): string {
  const g = state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
  if (!g) return 'No graphic';
  const q = state.quotes[g.symbol];
  if (!q) return `${g.symbol}  Loading...`;

  const res = formatResolutionShort(g.resolution);
  const flash = state.candleFlashPhase ? '\u25CF' : '\u25CB';
  const inBtnMode = !state.candleNavActive && !state.tfNavActive;
  const tfBtn = state.tfNavActive ? `${flash}[${res}]` :
    (inBtnMode && state.highlightedIndex === 0) ? `\u25B6[${res}]` : ` [${res}]`;
  const navBtn = state.candleNavActive ? `${flash}[NAV]` :
    (inBtnMode && state.highlightedIndex === 1) ? '\u25B6[NAV]' : ' [NAV]';

  const lines: string[] = [];

  // Row 1: symbol, price, change, buttons
  lines.push(`${g.symbol} $${formatPrice(q.price)} ${formatPercent(q.changePercent)}  ${tfBtn} ${navBtn}`);

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
    lines.push('No candle data');
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

    hub.onEvent((event) => {
      const action = mapEvenHubEvent(event, store.getState());
      if (action) store.dispatch(action);
    });

    // Go directly to home screen
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
