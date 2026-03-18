import type { MarketLanguage } from '../utils/i18n';

export type Screen = 'splash' | 'home' | 'watchlist' | 'stock-detail' | 'settings';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  previousClose: number;
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartType = 'sparkline' | 'candles';
export type ChartResolution = '1' | '5' | '15' | '60' | 'D' | 'W' | 'M';

export interface GraphicEntry {
  id: string;
  symbol: string;
  resolution: ChartResolution;
}

export function makeGraphicId(symbol: string, resolution: ChartResolution): string {
  return `${symbol}:${resolution}`;
}

export interface Settings {
  refreshInterval: number;
  graphics: GraphicEntry[];
  chartType: ChartType;
  language: MarketLanguage;
}

export interface AppState {
  screen: Screen;
  quotes: Record<string, StockQuote>;
  candles: Candle[];
  candlesCacheKey: string | null;
  candlesCacheTime: number;
  highlightedIndex: number;
  selectedGraphicId: string | null;
  candleNavActive: boolean;
  highlightedCandleIndex: number;
  candleFlashPhase: boolean;
  tfNavActive: boolean;
  settingsEditActive: boolean;
  settings: Settings;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastError: string | null;
  loading: boolean;
}

export const DEFAULT_GRAPHICS: GraphicEntry[] = [
  { id: 'AAPL:D', symbol: 'AAPL', resolution: 'D' },
  { id: 'GOOGL:D', symbol: 'GOOGL', resolution: 'D' },
  { id: 'MSFT:D', symbol: 'MSFT', resolution: 'D' },
  { id: 'NVDA:D', symbol: 'NVDA', resolution: 'D' },
  { id: 'TSLA:D', symbol: 'TSLA', resolution: 'D' },
];

export const DEFAULT_SETTINGS: Settings = {
  refreshInterval: 15,
  graphics: [...DEFAULT_GRAPHICS],
  chartType: 'sparkline',
  language: 'en' as MarketLanguage,
};

export const initialState: AppState = {
  screen: 'splash',
  quotes: {},
  candles: [],
  candlesCacheKey: null,
  candlesCacheTime: 0,
  highlightedIndex: 0,
  selectedGraphicId: null,
  candleNavActive: false,
  highlightedCandleIndex: -1,
  candleFlashPhase: false,
  tfNavActive: false,
  settingsEditActive: false,
  settings: { ...DEFAULT_SETTINGS },
  connectionStatus: 'disconnected',
  lastError: null,
  loading: false,
};
