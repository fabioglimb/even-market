import type { Screen, StockQuote, Candle, ChartType, ChartResolution, AssetType, PortfolioHolding, PriceAlert } from './types';

export type Action =
  | { type: 'APP_INIT' }
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'GO_BACK' }
  | { type: 'HIGHLIGHT_MOVE'; direction: 'up' | 'down' }
  | { type: 'SELECT_HIGHLIGHTED' }
  | { type: 'SELECT_GRAPHIC'; graphicId: string }
  | { type: 'QUOTES_UPDATED'; quotes: Record<string, StockQuote> }
  | { type: 'CANDLES_LOADED'; symbol: string; resolution: ChartResolution; candles: Candle[] }
  | { type: 'CANDLES_PREPEND'; candles: Candle[] }
  | { type: 'GRAPHIC_ADD'; symbol: string; resolution: ChartResolution; assetType?: AssetType; geckoId?: string; quoteCurrency?: string }
  | { type: 'GRAPHIC_REMOVE'; graphicId: string }
  | { type: 'CYCLE_RESOLUTION'; graphicId: string }
  | { type: 'SET_RESOLUTION'; graphicId: string; resolution: ChartResolution }
  | { type: 'CANDLE_NAV_TOGGLE' }
  | { type: 'CANDLE_FLASH_TICK' }
  | { type: 'SETTINGS_LOADED'; settings: Partial<import('./types').Settings> }
  | { type: 'SETTING_CHANGE'; key: string; value: unknown }
  | { type: 'CONNECTION_STATUS'; status: 'connected' | 'connecting' | 'disconnected' }
  | { type: 'ERROR'; message: string }
  | { type: 'ERROR_CLEAR' }
  | { type: 'LOADING'; loading: boolean }
  | { type: 'WATCHLIST_FILTER'; filter: 'all' | AssetType }
  | { type: 'PORTFOLIO_LOADED'; portfolio: PortfolioHolding[] }
  | { type: 'HOLDING_ADD'; holding: PortfolioHolding }
  | { type: 'HOLDING_UPDATE'; holding: PortfolioHolding }
  | { type: 'HOLDING_REMOVE'; holdingId: string }
  | { type: 'SELECT_HOLDING'; holdingId: string }
  | { type: 'ALERTS_LOADED'; alerts: PriceAlert[] }
  | { type: 'ALERT_ADD'; alert: PriceAlert }
  | { type: 'ALERT_REMOVE'; alertId: string }
  | { type: 'ALERT_TRIGGERED'; alertId: string; triggeredAt: number };
