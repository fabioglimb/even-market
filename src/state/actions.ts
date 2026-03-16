import type { Screen, StockQuote, Candle, ChartType, ChartResolution } from './types';

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
  | { type: 'GRAPHIC_ADD'; symbol: string; resolution: ChartResolution }
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
  | { type: 'LOADING'; loading: boolean };
