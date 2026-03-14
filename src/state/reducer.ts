import type { AppState, ChartResolution } from './types';
import { initialState, makeGraphicId } from './types';
import type { Action } from './actions';

export { initialState };

const RESOLUTIONS: ChartResolution[] = ['1', '5', '15', '60', 'D', 'W', 'M'];

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'APP_INIT':
      return { ...state, screen: 'watchlist' };

    case 'NAVIGATE':
      return { ...state, screen: action.screen, highlightedIndex: 0 };

    case 'GO_BACK': {
      if (state.screen === 'stock-detail') {
        // Exit sub-modes first, then go back to watchlist
        if (state.tfNavActive) {
          return { ...state, tfNavActive: false };
        }
        if (state.candleNavActive) {
          return { ...state, candleNavActive: false, highlightedCandleIndex: -1, highlightedIndex: 0 };
        }
        return {
          ...state,
          screen: 'watchlist',
          selectedGraphicId: null,
          candleNavActive: false,
          highlightedCandleIndex: -1,
          tfNavActive: false,
          highlightedIndex: 0,
        };
      }
      if (state.screen === 'settings') {
        return {
          ...state,
          screen: 'watchlist',
          selectedGraphicId: null,
          highlightedIndex: 0,
        };
      }
      return state;
    }

    case 'HIGHLIGHT_MOVE': {
      if (state.screen === 'stock-detail' && state.tfNavActive && state.selectedGraphicId) {
        // Scroll through resolutions
        return cycleGraphicResolution(state, state.selectedGraphicId, action.direction === 'down' ? 1 : -1);
      }
      if (state.screen === 'stock-detail' && state.candleNavActive) {
        // Move highlighted candle within bounds
        const maxCandle = state.candles.length - 1;
        const delta = action.direction === 'down' ? 1 : -1;
        const current = state.highlightedCandleIndex < 0 ? maxCandle : state.highlightedCandleIndex;
        const next = Math.max(0, Math.min(maxCandle, current + delta));
        return { ...state, highlightedCandleIndex: next };
      }
      const maxIndex = getMaxIndex(state);
      const delta = action.direction === 'down' ? 1 : -1;
      if (state.screen === 'watchlist') {
        // Wrap: up from first graphic (0) → settings (last), down from settings → first graphic (0)
        const settingsIdx = state.settings.graphics.length;
        let next = state.highlightedIndex + delta;
        if (next < 0) next = settingsIdx;
        else if (next > settingsIdx) next = 0;
        return { ...state, highlightedIndex: next };
      }
      const next = Math.max(0, Math.min(maxIndex, state.highlightedIndex + delta));
      return { ...state, highlightedIndex: next };
    }

    case 'SELECT_HIGHLIGHTED': {
      if (state.screen === 'watchlist') {
        const graphics = state.settings.graphics;
        // Last item is the Settings entry
        if (state.highlightedIndex === graphics.length) {
          return { ...state, screen: 'settings', highlightedIndex: 0 };
        }
        const graphic = graphics[state.highlightedIndex];
        if (graphic) {
          return {
            ...state,
            screen: 'stock-detail',
            selectedGraphicId: graphic.id,
            highlightedIndex: 0,
            candleNavActive: false,
            highlightedCandleIndex: -1,
            tfNavActive: false,
          };
        }
      }
      if (state.screen === 'settings') {
        return cycleSettingsValue(state);
      }
      if (state.screen === 'stock-detail') {
        if (state.tfNavActive) {
          // Exit TF nav, keep current resolution
          return { ...state, tfNavActive: false };
        }
        if (state.candleNavActive) {
          // Exit candle nav back to button mode
          return { ...state, candleNavActive: false, highlightedCandleIndex: -1, highlightedIndex: 0 };
        }
        // Button mode: 0=timeframe, 1=candles
        if (state.highlightedIndex === 0) {
          // Enter TF nav mode
          return { ...state, tfNavActive: true };
        }
        if (state.highlightedIndex === 1) {
          // Enter candle nav
          const lastIdx = state.candles.length > 0 ? state.candles.length - 1 : 0;
          return { ...state, candleNavActive: true, highlightedCandleIndex: lastIdx };
        }
      }
      return state;
    }

    case 'SELECT_GRAPHIC': {
      return {
        ...state,
        screen: 'stock-detail',
        selectedGraphicId: action.graphicId,
        highlightedIndex: 0,
        candleNavActive: false,
        highlightedCandleIndex: -1,
        tfNavActive: false,
      };
    }

    case 'QUOTES_UPDATED':
      return { ...state, quotes: { ...state.quotes, ...action.quotes } };

    case 'CANDLES_LOADED':
      return {
        ...state,
        candles: action.candles,
        candlesCacheKey: `${action.symbol}:${action.resolution}`,
        candlesCacheTime: Date.now(),
        loading: false,
      };

    case 'GRAPHIC_ADD': {
      const sym = action.symbol.toUpperCase().trim();
      const id = makeGraphicId(sym, action.resolution);
      if (!sym || state.settings.graphics.some((g) => g.id === id)) return state;
      const newGraphic = { id, symbol: sym, resolution: action.resolution };
      return {
        ...state,
        settings: {
          ...state.settings,
          graphics: [...state.settings.graphics, newGraphic],
        },
      };
    }

    case 'GRAPHIC_REMOVE': {
      const filtered = state.settings.graphics.filter((g) => g.id !== action.graphicId);
      return {
        ...state,
        settings: { ...state.settings, graphics: filtered },
        highlightedIndex: Math.min(state.highlightedIndex, Math.max(0, filtered.length)),
      };
    }

    case 'CYCLE_RESOLUTION': {
      return cycleGraphicResolution(state, action.graphicId);
    }

    case 'SET_RESOLUTION': {
      return setGraphicResolution(state, action.graphicId, action.resolution);
    }

    case 'CANDLE_NAV_TOGGLE': {
      if (state.screen !== 'stock-detail') return state;
      if (state.candleNavActive) {
        return { ...state, candleNavActive: false, highlightedCandleIndex: -1, highlightedIndex: 0 };
      }
      const lastIdx = state.candles.length > 0 ? state.candles.length - 1 : 0;
      return { ...state, candleNavActive: true, highlightedCandleIndex: lastIdx };
    }

    case 'CANDLE_FLASH_TICK':
      return { ...state, candleFlashPhase: !state.candleFlashPhase };

    case 'SETTINGS_LOADED':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'SETTING_CHANGE': {
      const key = action.key as keyof typeof state.settings;
      return {
        ...state,
        settings: { ...state.settings, [key]: action.value },
      };
    }

    case 'CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };

    case 'ERROR':
      return { ...state, lastError: action.message };

    case 'ERROR_CLEAR':
      return { ...state, lastError: null };

    case 'LOADING':
      return { ...state, loading: action.loading };

    default:
      return state;
  }
}

function cycleGraphicResolution(state: AppState, graphicId: string, direction = 1): AppState {
  const graphics = state.settings.graphics;
  const idx = graphics.findIndex((g) => g.id === graphicId);
  if (idx === -1) return state;
  const graphic = graphics[idx]!;
  const resIdx = RESOLUTIONS.indexOf(graphic.resolution);
  const nextIdx = (resIdx + direction + RESOLUTIONS.length) % RESOLUTIONS.length;
  const nextRes = RESOLUTIONS[nextIdx]!;
  const newId = makeGraphicId(graphic.symbol, nextRes);
  const updated = [...graphics];
  updated[idx] = { id: newId, symbol: graphic.symbol, resolution: nextRes };
  return {
    ...state,
    selectedGraphicId: state.selectedGraphicId === graphicId ? newId : state.selectedGraphicId,
    settings: { ...state.settings, graphics: updated },
    candles: [],
    candlesCacheKey: null,
    candlesCacheTime: 0,
    candleNavActive: false,
    highlightedCandleIndex: -1,
  };
}

function setGraphicResolution(state: AppState, graphicId: string, resolution: ChartResolution): AppState {
  const graphics = state.settings.graphics;
  const idx = graphics.findIndex((g) => g.id === graphicId);
  if (idx === -1) return state;
  const graphic = graphics[idx]!;
  if (graphic.resolution === resolution) return state;
  const newId = makeGraphicId(graphic.symbol, resolution);
  const updated = [...graphics];
  updated[idx] = { id: newId, symbol: graphic.symbol, resolution };
  return {
    ...state,
    selectedGraphicId: state.selectedGraphicId === graphicId ? newId : state.selectedGraphicId,
    settings: { ...state.settings, graphics: updated },
    candles: [],
    candlesCacheKey: null,
    candlesCacheTime: 0,
    candleNavActive: false,
    highlightedCandleIndex: -1,
  };
}

const REFRESH_OPTIONS = [5, 10, 15, 30, 60];
const CHART_TYPES: Array<'sparkline' | 'candles'> = ['sparkline', 'candles'];

function cycleSettingsValue(state: AppState): AppState {
  const s = state.settings;
  switch (state.highlightedIndex) {
    case 0: {
      // Cycle refresh interval
      const idx = REFRESH_OPTIONS.indexOf(s.refreshInterval);
      const next = REFRESH_OPTIONS[(idx + 1) % REFRESH_OPTIONS.length]!;
      return { ...state, settings: { ...s, refreshInterval: next } };
    }
    case 1: {
      // Toggle chart type
      const idx = CHART_TYPES.indexOf(s.chartType);
      const next = CHART_TYPES[(idx + 1) % CHART_TYPES.length]!;
      return { ...state, settings: { ...s, chartType: next } };
    }
    default:
      return state;
  }
}

function getMaxIndex(state: AppState): number {
  if (state.screen === 'watchlist') {
    return state.settings.graphics.length; // graphics + settings entry
  }
  if (state.screen === 'stock-detail') {
    return 1; // two buttons: 0=timeframe, 1=candles
  }
  if (state.screen === 'settings') {
    return 1; // Refresh, Chart Type
  }
  return 0;
}
