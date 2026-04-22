import type { MarketLanguage } from '../utils/i18n';

export type Screen =
  | 'splash'
  | 'home'
  | 'watchlist'
  | 'stock-detail'
  | 'settings'
  | 'portfolio'
  | 'portfolio-chart'
  | 'holding-detail'
  | 'holding-form'
  | 'alerts'
  | 'overview'
  | 'news'
  | 'news-detail';

export type PortfolioChartPeriod = '1D' | '1W' | '1M' | '1Y';

export type AssetType = 'stock' | 'crypto' | 'forex' | 'commodity';
export type DisplayCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'CNY';

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
  assetType?: AssetType;
  geckoId?: string;
  quoteCurrency?: string;
}

export function makeGraphicId(symbol: string, resolution: ChartResolution): string {
  return `${symbol}:${resolution}`;
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  avgCost: number;
  geckoId?: string;
  quoteCurrency?: string;
  addedAt: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  assetType: AssetType;
  condition: 'above' | 'below';
  targetPrice: number;
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
  seenAt?: number;
}

export interface MarketNewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  timestamp: number;
  category: 'stocks' | 'crypto' | 'general';
}

export interface Settings {
  refreshInterval: number;
  graphics: GraphicEntry[];
  chartType: ChartType;
  language: MarketLanguage;
  displayCurrency: DisplayCurrency;
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
  portfolio: PortfolioHolding[];
  alerts: PriceAlert[];
  news: MarketNewsItem[];
  watchlistFilter: 'all' | AssetType;
  newsFilter: 'all' | 'stocks' | 'crypto';
  selectedHoldingId: string | null;
  selectedNewsId: string | null;
  selectedNewsContent: string | null;
  selectedNewsLoading: boolean;
  fxRates: Record<string, number>;
  fxRatesTimestamp: number;
  favoriteSymbols: string[];
  portfolioChartPeriod: PortfolioChartPeriod;
  portfolioChartData: Array<{ time: number; value: number }>;
  portfolioChartLoading: boolean;
}

export const DEFAULT_GRAPHICS: GraphicEntry[] = [
  { id: 'AAPL:D', symbol: 'AAPL', resolution: 'D', assetType: 'stock' },
  { id: 'GOOGL:D', symbol: 'GOOGL', resolution: 'D', assetType: 'stock' },
  { id: 'MSFT:D', symbol: 'MSFT', resolution: 'D', assetType: 'stock' },
  { id: 'NVDA:D', symbol: 'NVDA', resolution: 'D', assetType: 'stock' },
  { id: 'TSLA:D', symbol: 'TSLA', resolution: 'D', assetType: 'stock' },
  { id: 'BTC:D', symbol: 'BTC', resolution: 'D', assetType: 'crypto', geckoId: 'bitcoin', quoteCurrency: 'usd' },
  { id: 'ETH:D', symbol: 'ETH', resolution: 'D', assetType: 'crypto', geckoId: 'ethereum', quoteCurrency: 'usd' },
];

export const DEFAULT_SETTINGS: Settings = {
  refreshInterval: 30,
  graphics: [...DEFAULT_GRAPHICS],
  chartType: 'sparkline',
  language: 'en' as MarketLanguage,
  displayCurrency: 'USD' as DisplayCurrency,
};

export const initialState: AppState = {
  screen: 'home',
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
  portfolio: [],
  alerts: [],
  news: [],
  watchlistFilter: 'all',
  newsFilter: 'all',
  selectedHoldingId: null,
  selectedNewsId: null,
  selectedNewsContent: null,
  selectedNewsLoading: false,
  fxRates: {},
  fxRatesTimestamp: 0,
  favoriteSymbols: [],
  portfolioChartPeriod: '1M' as PortfolioChartPeriod,
  portfolioChartData: [],
  portfolioChartLoading: false,
};
