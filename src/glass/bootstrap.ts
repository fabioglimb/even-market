import { EvenHubBridge } from './bridge';
import { createStore } from '../state/store';
import type { AppState, GraphicEntry, ChartResolution } from '../state/types';
import { makeGraphicId } from '../state/types';
import { getDisplayData } from '../state/selectors';
import { mapEvenHubEvent } from '../input/action-map';
import { composeStartupPage } from './composer';
import { renderToImage, renderToCanvasDirect, getCanvas } from './canvas-renderer';
import { MAIN_SLOT } from './layout';
import { activateKeepAlive } from '../utils/keep-alive';
import { Poller } from '../data/poller';

let hub: EvenHubBridge | null = null;
let store: ReturnType<typeof createStore>;
let poller: Poller;
let pageCreated = false;
let rendering = false;
let dirty = false;
let flashTimer: ReturnType<typeof setInterval> | null = null;

async function flushDisplay(state: AppState): Promise<void> {
  if (rendering) {
    dirty = true;
    return;
  }
  rendering = true;
  dirty = false;
  try {
    const data = getDisplayData(state);
    renderToCanvasDirect(data);

    if (hub) {
      const pngBytes = await renderToImage(data);
      if (pngBytes.length > 0) {
        if (!pageCreated) {
          const page = composeStartupPage();
          pageCreated = await hub.setupPage(page);
        }
        if (pageCreated) {
          await hub.updateImage(MAIN_SLOT.id, MAIN_SLOT.name, pngBytes);
        }
      }
    }
  } catch (err) {
    void err;
  } finally {
    rendering = false;
    if (dirty) {
      dirty = false;
      flushDisplay(store.getState()).catch(() => {});
    }
  }
}

function shouldUpdateDisplay(state: AppState, prev: AppState): boolean {
  if (state.screen !== prev.screen) return true;
  if (state.highlightedIndex !== prev.highlightedIndex) return true;
  if (state.quotes !== prev.quotes) return true;
  if (state.candles !== prev.candles) return true;
  if (state.selectedGraphicId !== prev.selectedGraphicId) return true;
  if (state.candleNavActive !== prev.candleNavActive) return true;
  if (state.highlightedCandleIndex !== prev.highlightedCandleIndex) return true;
  if (state.tfNavActive !== prev.tfNavActive) return true;
  if (state.candleFlashPhase !== prev.candleFlashPhase) return true;
  if (state.settings !== prev.settings) return true;
  if (state.loading !== prev.loading) return true;
  if (state.lastError !== prev.lastError) return true;
  return false;
}

function getSelectedGraphic(state: AppState): GraphicEntry | undefined {
  return state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
}

function handleSideEffects(state: AppState, prev: AppState): void {
  // Fetch candles when entering stock-detail or resolution changes
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

  // Flash timer management
  const needsFlash = state.screen === 'stock-detail' && (state.candleNavActive || state.tfNavActive);
  const hadFlash = prev.screen === 'stock-detail' && prev.candleNavActive;

  if (needsFlash && !flashTimer) {
    flashTimer = setInterval(() => {
      store.dispatch({ type: 'CANDLE_FLASH_TICK' });
    }, 500);
  } else if (!needsFlash && flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }

  // Persist settings to localStorage
  if (state.settings !== prev.settings) {
    try {
      localStorage.setItem('even-market-settings', JSON.stringify(state.settings));
    } catch { /* ignore */ }
  }
}

function mountHiddenCanvas(): void {
  const container = document.getElementById('glasses-canvas');
  if (!container) return;
  const cvs = getCanvas();
  container.appendChild(cvs);
}

function migrateOldSettings(raw: string): Record<string, unknown> {
  const settings = JSON.parse(raw);

  // Detect old watchlist format: string[] instead of GraphicEntry[]
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

  // Remove old chartResolution if present (now per-graphic)
  if ('chartResolution' in settings) {
    delete settings.chartResolution;
  }

  return settings;
}

function loadSettings(): void {
  try {
    const raw = localStorage.getItem('even-market-settings');
    if (raw) {
      const settings = migrateOldSettings(raw);
      store.dispatch({ type: 'SETTINGS_LOADED', settings });
      // Re-persist migrated settings
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

  // Load persisted settings (with migration)
  loadSettings();

  // Try to connect SDK
  const sdkHub = new EvenHubBridge();
  sdkHub.init().then(() => {
    hub = sdkHub;
    store.dispatch({ type: 'CONNECTION_STATUS', status: 'connected' });
    flushDisplay(store.getState()).catch(() => {});
    hub.onEvent((event) => {
      const action = mapEvenHubEvent(event, store.getState());
      if (action) {
        store.dispatch(action);
      }
    });
  }).catch(() => {});

  await flushDisplay(store.getState());

  store.subscribe((state, prev) => {
    if (shouldUpdateDisplay(state, prev)) {
      flushDisplay(state).catch(() => {});
    }
    handleSideEffects(state, prev);
  });

  // Start data fetching (no API key needed for Yahoo Finance)
  poller.start();

  activateKeepAlive();

  // Splash → watchlist transition (show splash for at least 1s)
  setTimeout(() => store.dispatch({ type: 'APP_INIT' }), 1000);

}
