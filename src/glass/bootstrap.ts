import { EvenHubBridge, type PageLayout } from './bridge';
import { createStore } from '../state/store';
import type { AppState, GraphicEntry, ChartResolution } from '../state/types';
import { makeGraphicId } from '../state/types';
import { getDisplayData } from '../state/selectors';
import { mapEvenHubEvent } from '../input/action-map';
import { renderToCanvasDirect, getCanvas, resetViewport, getViewportStart } from './canvas-renderer';
import { encodeTilesBatch, resetTileCache } from './png-utils';
import { IMAGE_TILES, G2_IMAGE_MAX_W, G2_IMAGE_MAX_H, VIEWPORT_PER_RESOLUTION } from './layout';
import { formatPrice, formatPercent, formatVolume, formatResolutionShort, formatCandleTime } from '../utils/format';
import { activateKeepAlive } from '../utils/keep-alive';
import { Poller } from '../data/poller';

// ── Splash ──

function renderSplashImage(): Uint8Array {
  const W = 200, H = 100;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);

  const candles = [
    {o:.92,h:.86,l:.95,c:.87},{o:.87,h:.70,l:.90,c:.72},{o:.72,h:.67,l:.78,c:.76},
    {o:.76,h:.58,l:.79,c:.60},{o:.60,h:.55,l:.63,c:.57},{o:.57,h:.52,l:.66,c:.64},
    {o:.64,h:.60,l:.67,c:.62},{o:.62,h:.42,l:.65,c:.44},{o:.44,h:.38,l:.52,c:.50},
    {o:.50,h:.46,l:.53,c:.48},{o:.48,h:.30,l:.51,c:.32},{o:.32,h:.26,l:.38,c:.36},
    {o:.36,h:.22,l:.39,c:.24},{o:.24,h:.08,l:.28,c:.12},
  ];
  const chartX = 20, chartW = 160, chartTop = 5, chartH = 55, gap = 2;
  const cw = Math.floor((chartW - gap * (candles.length - 1)) / candles.length);
  for (let i = 0; i < candles.length; i++) {
    const cd = candles[i]!;
    const x = chartX + i * (cw + gap), midX = x + cw / 2;
    const isUp = cd.c <= cd.o, color = isUp ? '#d0d0d0' : '#505050';
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(midX, chartTop + cd.h * chartH); ctx.lineTo(midX, chartTop + cd.l * chartH); ctx.stroke();
    const bTop = chartTop + Math.min(cd.o, cd.c) * chartH;
    const bH = Math.max(2, (Math.max(cd.o, cd.c) - Math.min(cd.o, cd.c)) * chartH);
    if (isUp) { ctx.fillStyle = color; ctx.fillRect(x, bTop, cw, bH); }
    else { ctx.strokeRect(x, bTop, cw, bH); }
  }
  ctx.fillStyle = '#e0e0e0'; ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textAlign = 'center'; ctx.fillText('EvenMarket', W / 2, 80);
  ctx.font = '10px "Courier New", monospace'; ctx.fillStyle = '#808080';
  ctx.fillText('Loading...', W / 2, 94); ctx.textAlign = 'left';

  const enc = encodeTilesBatch(c, [{ crop: { sx: 0, sy: 0, sw: W, sh: H }, name: 'splash' }], W, H)[0];
  return enc?.bytes ?? new Uint8Array(0);
}

let hub: EvenHubBridge | null = null;
let store: ReturnType<typeof createStore>;
let poller: Poller;
let flashTimer: ReturnType<typeof setInterval> | null = null;

// ── Layout management ──

function getDesiredLayout(state: AppState): PageLayout {
  if (state.screen === 'splash') return 'splash';
  return state.screen === 'stock-detail' ? 'chart' : 'text';
}

async function ensureLayout(state: AppState): Promise<void> {
  if (!hub || !hub.pageReady) return;
  const desired = getDesiredLayout(state);
  if (hub.currentLayout === desired) return;
  if (desired === 'splash') return; // splash is set at init only

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
    // Only switch layout when needed — avoid async overhead on every update
    const desired = getDesiredLayout(state);
    if (hub.currentLayout !== desired && desired !== 'splash') {
      await ensureLayout(state);
    }
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
  if (!hub || !hub.pageReady || hub.currentLayout !== 'chart') return;
  if (imgBusy) { imgDirty = true; return; }

  imgBusy = true;
  imgDirty = false;
  try {
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
  if (getDesiredLayout(state) === 'chart') {
    // Reset on data change only — hash check handles highlight diffs naturally
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

/** Text below chart: 3 rows. */
function buildChartTopText(state: AppState): string {
  const g = state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
  if (!g) return 'No graphic';
  const q = state.quotes[g.symbol];
  if (!q) return `${g.symbol}  Loading...`;

  const res = formatResolutionShort(g.resolution);
  const flash = state.candleFlashPhase ? '\u25CF' : '\u25CB';
  const inBtnMode = !state.candleNavActive && !state.tfNavActive;
  const tfBtn = state.tfNavActive ? `${flash}[${res}]` :
    (inBtnMode && state.highlightedIndex === 0) ? `\u25B6[${res}]` : ` ${res} `;
  const navBtn = state.candleNavActive ? `${flash}[NAV]` :
    (inBtnMode && state.highlightedIndex === 1) ? '\u25B6[NAV]' : ' NAV ';

  // OHLC source
  const ci = state.highlightedCandleIndex;
  const inCandleNav = state.candleNavActive && ci >= 0 && ci < state.candles.length;
  const src = inCandleNav ? state.candles[ci]! : null;
  const o = src ? formatPrice(src.open) : formatPrice(q.open);
  const h = src ? formatPrice(src.high) : formatPrice(q.high);
  const cl = src ? formatPrice(src.close) : formatPrice(q.price);
  const l = src ? formatPrice(src.low) : formatPrice(q.low);
  const vol = src ? formatVolume(src.volume) : formatVolume(q.volume);
  const dt = src ? formatCandleTime(src.time, g.resolution) : (q.timestamp ? formatCandleTime(q.timestamp) : '');

  // Row 1: symbol, price, change, buttons
  const row1 = `${g.symbol} $${formatPrice(q.price)} ${formatPercent(q.changePercent)}  ${tfBtn} ${navBtn}`;
  // Row 2: OHLC
  const row2 = `O:${o}  H:${h}  C:${cl}  L:${l}`;
  // Row 3: volume + datetime
  const row3 = `V:${vol}  ${dt}`;

  return `${row1}\n${row2}\n${row3}`;
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

    await hub.setupTextPage();
    if (hub.pageReady) {
      await hub.updateText('\n\n\n     \u2581\u2583\u2582\u2585\u2583\u2587\u2584\u2588\u2586\u2588\u2585\u2587\u2588\n\n      EvenMarket\n\n      Loading...');
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
