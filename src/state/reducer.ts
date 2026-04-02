import type { AppState, ChartResolution } from './types';
import { initialState, makeGraphicId } from './types';
import type { Action } from './actions';
import { wrapIndex } from 'even-toolkit/glass-nav';
import { MARKET_LANGUAGES } from '../utils/i18n';
import { detectAssetType } from '../data/yahoo-finance';
import type { MarketLanguage } from '../utils/i18n';
import { markTriggeredAlertsSeen } from './alert-utils';

export { initialState };

const RESOLUTIONS: ChartResolution[] = ['1', '5', '15', '60', 'D', 'W', 'M'];

function withSeenAlertsOnEntry(state: AppState, screen: AppState['screen']): AppState {
  if (screen !== 'alerts') return { ...state, screen, highlightedIndex: 0 };
  const alerts = markTriggeredAlertsSeen(state.alerts);
  if (alerts === state.alerts) return { ...state, screen, highlightedIndex: 0 };
  return { ...state, screen, alerts, highlightedIndex: 0 };
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'APP_INIT':
      return { ...state, screen: 'home', highlightedIndex: 0 };

    case 'NAVIGATE':
      return withSeenAlertsOnEntry(state, action.screen);

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
        if (state.settingsEditActive) {
          return { ...state, settingsEditActive: false };
        }
        return {
          ...state,
          screen: 'home',
          selectedGraphicId: null,
          highlightedIndex: 1,
          settingsEditActive: false,
        };
      }
      if (state.screen === 'watchlist') {
        return { ...state, screen: 'home', highlightedIndex: 0 };
      }
      if (state.screen === 'portfolio') {
        return { ...state, screen: 'home', highlightedIndex: 0 };
      }
      if (state.screen === 'holding-detail') {
        return { ...state, screen: 'portfolio', selectedHoldingId: null, highlightedIndex: 0 };
      }
      if (state.screen === 'holding-form') {
        return { ...state, screen: 'portfolio', highlightedIndex: 0 };
      }
      if (state.screen === 'alerts') {
        return { ...state, screen: 'home', highlightedIndex: 0 };
      }
      if (state.screen === 'overview') {
        return { ...state, screen: 'home', highlightedIndex: 0 };
      }
      if (state.screen === 'news') {
        return { ...state, screen: 'home', highlightedIndex: 0 };
      }
      if (state.screen === 'news-detail') {
        return {
          ...state,
          screen: 'news',
          selectedNewsId: null,
          selectedNewsContent: null,
          selectedNewsLoading: false,
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
        // Move highlighted candle — inverted: down=newer(−1), up=older(+1)
        const maxCandle = state.candles.length - 1;
        const delta = action.direction === 'down' ? -1 : 1;
        const current = state.highlightedCandleIndex < 0 ? maxCandle : state.highlightedCandleIndex;
        const next = Math.max(0, Math.min(maxCandle, current + delta));
        return { ...state, highlightedCandleIndex: next };
      }
      // Settings edit mode: scroll cycles the value
      if (state.screen === 'settings' && state.settingsEditActive) {
        return cycleSettingsValue(state, action.direction === 'down' ? 1 : -1);
      }
      const maxIndex = getMaxIndex(state);
      const delta = action.direction === 'down' ? 1 : -1;
      if (state.screen === 'home') {
        // Home: 0=Watchlist, 1=Portfolio, 2=Overview, 3=Alerts, 4=News, 5=Settings
        return { ...state, highlightedIndex: wrapIndex(state.highlightedIndex, action.direction === 'down' ? 'down' : 'up', 6) };
      }
      if (state.screen === 'watchlist') {
        // Wrap within graphics
        return { ...state, highlightedIndex: wrapIndex(state.highlightedIndex, action.direction === 'down' ? 'down' : 'up', state.settings.graphics.length) };
      }
      if (state.screen === 'portfolio' && state.portfolio.length > 0) {
        return { ...state, highlightedIndex: wrapIndex(state.highlightedIndex, action.direction === 'down' ? 'down' : 'up', state.portfolio.length) };
      }
      if (state.screen === 'alerts' && state.alerts.length > 0) {
        return { ...state, highlightedIndex: wrapIndex(state.highlightedIndex, action.direction === 'down' ? 'down' : 'up', state.alerts.length) };
      }
      if (state.screen === 'news' && state.news.length > 0) {
        return { ...state, highlightedIndex: wrapIndex(state.highlightedIndex, action.direction === 'down' ? 'down' : 'up', state.news.length) };
      }
      const next = Math.max(0, Math.min(maxIndex, state.highlightedIndex + delta));
      return { ...state, highlightedIndex: next };
    }

    case 'SELECT_HIGHLIGHTED': {
      if (state.screen === 'home') {
        const homeScreens = ['watchlist', 'portfolio', 'overview', 'alerts', 'news', 'settings'] as const;
        const target = homeScreens[state.highlightedIndex];
        if (target) return withSeenAlertsOnEntry(state, target);
      }
      if (state.screen === 'watchlist') {
        const graphics = state.settings.graphics;
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
        if (state.settingsEditActive) {
          // Tap confirms — exit edit mode
          return { ...state, settingsEditActive: false };
        }
        // Tap enters edit mode for the highlighted setting
        return { ...state, settingsEditActive: true };
      }
      if (state.screen === 'portfolio') {
        const holding = state.portfolio[state.highlightedIndex];
        if (holding) {
          return {
            ...state,
            screen: 'holding-detail',
            selectedHoldingId: holding.id,
            highlightedIndex: 0,
          };
        }
      }
      if (state.screen === 'news') {
        const item = state.news[state.highlightedIndex];
        if (item) {
          return {
            ...state,
            screen: 'news-detail',
            selectedNewsId: item.id,
            selectedNewsContent: null,
            selectedNewsLoading: true,
            highlightedIndex: 0,
          };
        }
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

    case 'CANDLES_PREPEND': {
      if (action.candles.length === 0) return { ...state, loading: false };
      // Deduplicate by timestamp
      const existingTimes = new Set(state.candles.map((c) => c.time));
      const newCandles = action.candles.filter((c) => !existingTimes.has(c.time));
      return {
        ...state,
        candles: [...newCandles, ...state.candles],
        loading: false,
      };
    }

    case 'GRAPHIC_ADD': {
      const sym = action.symbol.toUpperCase().trim();
      const id = makeGraphicId(sym, action.resolution);
      if (!sym || state.settings.graphics.some((g) => g.id === id)) return state;
      const newGraphic: import('./types').GraphicEntry = {
        id,
        symbol: sym,
        resolution: action.resolution,
        assetType: action.assetType,
        geckoId: action.geckoId,
        quoteCurrency: action.quoteCurrency,
      };
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

    case 'SETTINGS_LOADED': {
      const loaded = { ...state.settings, ...action.settings };
      // Always re-detect assetType from symbol (fixes wrongly tagged items)
      if (loaded.graphics) {
        loaded.graphics = loaded.graphics.map((g) => ({
          ...g,
          assetType: detectAssetType(g.symbol),
        }));
      }
      return { ...state, settings: loaded };
    }

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

    case 'WATCHLIST_FILTER':
      return { ...state, watchlistFilter: action.filter };

    case 'PORTFOLIO_LOADED':
      return { ...state, portfolio: action.portfolio };

    case 'HOLDING_ADD':
      return { ...state, portfolio: [...state.portfolio, action.holding] };

    case 'HOLDING_UPDATE': {
      const updated = state.portfolio.map((h) =>
        h.id === action.holding.id ? action.holding : h,
      );
      return { ...state, portfolio: updated };
    }

    case 'HOLDING_REMOVE':
      return {
        ...state,
        portfolio: state.portfolio.filter((h) => h.id !== action.holdingId),
        selectedHoldingId: state.selectedHoldingId === action.holdingId ? null : state.selectedHoldingId,
      };

    case 'SELECT_HOLDING':
      return {
        ...state,
        screen: 'holding-detail',
        selectedHoldingId: action.holdingId,
        highlightedIndex: 0,
      };

    case 'ALERTS_LOADED':
      return { ...state, alerts: action.alerts };

    case 'ALERT_ADD':
      return { ...state, alerts: [...state.alerts, action.alert] };

    case 'ALERT_REMOVE':
      return { ...state, alerts: state.alerts.filter((a) => a.id !== action.alertId) };

    case 'ALERT_TRIGGERED': {
      const updatedAlerts = state.alerts.map((a) =>
        a.id === action.alertId
          ? {
              ...a,
              triggered: true,
              triggeredAt: action.triggeredAt,
              seenAt: a.seenAt,
            }
          : a,
      );
      return { ...state, alerts: updatedAlerts };
    }

    case 'ALERTS_MARK_SEEN': {
      const alerts = markTriggeredAlertsSeen(state.alerts, action.seenAt);
      return alerts === state.alerts ? state : { ...state, alerts };
    }

    case 'NEWS_LOADED':
      return { ...state, news: action.news };

    case 'NEWS_ARTICLE_LOADING':
      return {
        ...state,
        selectedNewsId: action.newsId,
        selectedNewsContent: null,
        selectedNewsLoading: true,
      };

    case 'NEWS_ARTICLE_LOADED':
      if (state.selectedNewsId !== action.newsId) return state;
      return {
        ...state,
        selectedNewsContent: action.content,
        selectedNewsLoading: false,
      };

    case 'SELECT_NEWS':
      return {
        ...state,
        screen: 'news-detail',
        selectedNewsId: action.newsId,
        selectedNewsContent: null,
        selectedNewsLoading: true,
        highlightedIndex: 0,
      };

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

function cycleSettingsValue(state: AppState, direction = 1): AppState {
  const s = state.settings;
  switch (state.highlightedIndex) {
    case 0: {
      const idx = REFRESH_OPTIONS.indexOf(s.refreshInterval);
      const next = REFRESH_OPTIONS[(idx + direction + REFRESH_OPTIONS.length) % REFRESH_OPTIONS.length]!;
      return { ...state, settings: { ...s, refreshInterval: next } };
    }
    case 1: {
      const idx = CHART_TYPES.indexOf(s.chartType);
      const next = CHART_TYPES[(idx + direction + CHART_TYPES.length) % CHART_TYPES.length]!;
      return { ...state, settings: { ...s, chartType: next } };
    }
    case 2: {
      const langIds = MARKET_LANGUAGES.map((l) => l.id);
      const idx = langIds.indexOf(s.language);
      const next = langIds[(idx + direction + langIds.length) % langIds.length]!;
      return { ...state, settings: { ...s, language: next } };
    }
    default:
      return state;
  }
}

function wrapTextLines(value: string, width = 28): string[] {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function getNewsDetailMaxIndex(state: AppState): number {
  const item = state.selectedNewsId
    ? state.news.find((news) => news.id === state.selectedNewsId) ?? null
    : null;
  if (!item) return 0;
  const articleBody = state.selectedNewsContent ?? item.description ?? item.url;
  const bodyLines = [
    ...wrapTextLines(item.title, 44),
    '',
    `${item.source} · ${item.publishedAt}`,
    item.category.toUpperCase(),
    '',
    ...wrapTextLines(articleBody, 44),
    '',
    ...wrapTextLines(item.url.replace(/^https?:\/\//, ''), 44),
  ];
  return Math.max(0, bodyLines.length - 1);
}

function getMaxIndex(state: AppState): number {
  if (state.screen === 'home') {
    return 1; // 0=Watchlist, 1=Settings
  }
  if (state.screen === 'watchlist') {
    return state.settings.graphics.length - 1; // graphics only
  }
  if (state.screen === 'portfolio') {
    return Math.max(0, state.portfolio.length - 1);
  }
  if (state.screen === 'alerts') {
    return Math.max(0, state.alerts.length - 1);
  }
  if (state.screen === 'news') {
    return Math.max(0, state.news.length - 1);
  }
  if (state.screen === 'news-detail') {
    return getNewsDetailMaxIndex(state);
  }
  if (state.screen === 'stock-detail') {
    return 1; // two buttons: 0=timeframe, 1=candles
  }
  if (state.screen === 'settings') {
    return 2; // Refresh, Chart Type, Language
  }
  return 0;
}
