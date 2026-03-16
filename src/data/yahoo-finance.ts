import type { StockQuote, Candle } from '../state/types';

// Proxy path — works in dev, preview, and .ehpk production (proxy handled by Vite or ER WebView)
const BASE_URL = '/yf-api';

// Forex pairs that need =X suffix on Yahoo Finance
// Forex pairs that use =X suffix on Yahoo Finance
const FOREX_PAIRS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'AUDJPY', 'CADJPY', 'CHFJPY',
  'EURAUD', 'EURCAD', 'EURNZD', 'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD',
  'AUDCAD', 'AUDCHF', 'AUDNZD', 'CADCHF', 'NZDCAD', 'NZDCHF', 'NZDJPY',
]);

// Commodity/metal symbols → Yahoo Finance futures tickers
const COMMODITY_MAP: Record<string, string> = {
  'XAUUSD': 'GC=F',   // Gold
  'XAGUSD': 'SI=F',   // Silver
  'XAUEUR': 'GC=F',   // Gold (EUR price not available, use USD futures)
  'XAGEUR': 'SI=F',   // Silver (same)
  'GOLD': 'GC=F',
  'SILVER': 'SI=F',
  'OIL': 'CL=F',      // Crude Oil
  'WTIUSD': 'CL=F',
  'BRENT': 'BZ=F',
  'NATGAS': 'NG=F',    // Natural Gas
  'COPPER': 'HG=F',
  'PLATINUM': 'PL=F',
  'PALLADIUM': 'PA=F',
};

/** Convert user-facing symbol to Yahoo Finance ticker */
function toYahooSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.includes('=') || upper.includes('.')) return upper; // already formatted
  if (COMMODITY_MAP[upper]) return COMMODITY_MAP[upper]!;
  if (FOREX_PAIRS.has(upper)) return `${upper}=X`;
  // 6-char all-alpha could be a forex pair not in our set
  if (upper.length === 6 && /^[A-Z]{6}$/.test(upper)) return `${upper}=X`;
  return upper;
}

/** Convert Yahoo Finance ticker back to user-facing symbol */
function fromYahooSymbol(yahooSymbol: string, requestedSymbol: string): string {
  return requestedSymbol;
}

/**
 * Fetch a batch of quotes using the v7 quote endpoint.
 * Falls back to fetching individually via chart endpoint if blocked.
 */
export async function getQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  const results: Record<string, StockQuote> = {};

  // Build mapping: userSymbol → yahooSymbol
  const yahooSymbols = symbols.map(toYahooSymbol);
  const yahooToUser: Record<string, string> = {};
  for (let i = 0; i < symbols.length; i++) {
    yahooToUser[yahooSymbols[i]!] = symbols[i]!;
  }

  // Try batch via v7 first
  try {
    const url = `${BASE_URL}/v7/finance/quote?symbols=${yahooSymbols.map(encodeURIComponent).join(',')}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const quotes = data?.quoteResponse?.result;
      if (Array.isArray(quotes)) {
        for (const q of quotes) {
          const userSym = yahooToUser[q.symbol] ?? q.symbol;
          results[userSym] = mapQuote(q, userSym);
        }
        return results;
      }
    }
  } catch {
    // v7 blocked (CORS etc.) — fall through to per-symbol chart
  }

  // Fallback: fetch each symbol via chart endpoint (more CORS-friendly)
  const promises = symbols.map(async (sym) => {
    const quote = await getQuoteViaChart(sym);
    if (quote) results[sym] = quote;
  });
  await Promise.all(promises);
  return results;
}

/**
 * Get a single quote by pulling the latest from the chart endpoint.
 */
async function getQuoteViaChart(symbol: string): Promise<StockQuote | null> {
  try {
    const yahooSym = toYahooSymbol(symbol);
    const url = `${BASE_URL}/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=1d&interval=5m`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      price,
      change,
      changePercent,
      high: meta.regularMarketDayHigh ?? 0,
      low: meta.regularMarketDayLow ?? 0,
      open: meta.regularMarketOpen ?? prevClose,
      volume: meta.regularMarketVolume ?? 0,
      previousClose: prevClose,
      timestamp: (meta.regularMarketTime ?? 0) * 1000,
    };
  } catch (err) {
    void err;
    return null;
  }
}

function mapQuote(q: any, userSymbol?: string): StockQuote {
  const price = q.regularMarketPrice ?? 0;
  const prevClose = q.regularMarketPreviousClose ?? price;
  return {
    symbol: userSymbol ?? q.symbol,
    price,
    change: q.regularMarketChange ?? price - prevClose,
    changePercent: q.regularMarketChangePercent ?? (prevClose ? ((price - prevClose) / prevClose) * 100 : 0),
    high: q.regularMarketDayHigh ?? 0,
    low: q.regularMarketDayLow ?? 0,
    open: q.regularMarketOpen ?? prevClose,
    volume: q.regularMarketVolume ?? 0,
    previousClose: prevClose,
    timestamp: (q.regularMarketTime ?? 0) * 1000,
  };
}

/**
 * Fetch OHLCV candle data from Yahoo Finance chart endpoint.
 */
export async function getCandles(
  symbol: string,
  interval: string,
  range: string,
): Promise<Candle[]> {
  try {
    // Map our resolution codes to Yahoo interval/range
    const yahooInterval = mapInterval(interval);
    const yahooRange = range;

    const yahooSym = toYahooSymbol(symbol);
    const url = `${BASE_URL}/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=${yahooRange}&interval=${yahooInterval}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp;
    const ohlcv = result.indicators?.quote?.[0];
    if (!timestamps || !ohlcv) return [];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = ohlcv.open?.[i];
      const h = ohlcv.high?.[i];
      const l = ohlcv.low?.[i];
      const c = ohlcv.close?.[i];
      const v = ohlcv.volume?.[i];
      // Skip null candles (market closed gaps)
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        time: timestamps[i] * 1000,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v ?? 0,
      });
    }
    return candles;
  } catch (err) {
    void err;
    return [];
  }
}

/** Map our internal resolution to Yahoo Finance interval string. */
function mapInterval(resolution: string): string {
  switch (resolution) {
    case '1': return '1m';
    case '5': return '5m';
    case '15': return '15m';
    case '60': return '60m';
    case 'D': return '1d';
    case 'W': return '1wk';
    case 'M': return '1mo';
    default: return '1d';
  }
}

/**
 * Fetch OHLCV candle data for a specific time period using period1/period2.
 */
export async function getCandlesByPeriod(
  symbol: string,
  interval: string,
  period1: number,
  period2: number,
): Promise<Candle[]> {
  try {
    const yahooInterval = mapInterval(interval);
    const yahooSym = toYahooSymbol(symbol);
    const p1 = Math.floor(period1 / 1000);
    const p2 = Math.floor(period2 / 1000);
    const url = `${BASE_URL}/v8/finance/chart/${encodeURIComponent(yahooSym)}?period1=${p1}&period2=${p2}&interval=${yahooInterval}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp;
    const ohlcv = result.indicators?.quote?.[0];
    if (!timestamps || !ohlcv) return [];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = ohlcv.open?.[i];
      const h = ohlcv.high?.[i];
      const l = ohlcv.low?.[i];
      const c = ohlcv.close?.[i];
      const v = ohlcv.volume?.[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        time: timestamps[i] * 1000,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v ?? 0,
      });
    }
    return candles;
  } catch (err) {
    void err;
    return [];
  }
}

/** How far back to go when loading older candles (in ms). */
export function resolutionToHistoryStep(resolution: string): number {
  switch (resolution) {
    case '1': return 1 * 24 * 60 * 60 * 1000;        // 1 day
    case '5': return 5 * 24 * 60 * 60 * 1000;        // 5 days
    case '15': return 5 * 24 * 60 * 60 * 1000;       // 5 days
    case '60': return 30 * 24 * 60 * 60 * 1000;      // 1 month
    case 'D': return 90 * 24 * 60 * 60 * 1000;       // 3 months
    case 'W': return 365 * 24 * 60 * 60 * 1000;      // 1 year
    case 'M': return 5 * 365 * 24 * 60 * 60 * 1000;  // 5 years
    default: return 90 * 24 * 60 * 60 * 1000;
  }
}

/** Map our chart resolution to a sensible Yahoo range. */
export function resolutionToRange(resolution: string): string {
  switch (resolution) {
    case '1': return '1d';
    case '5': return '5d';
    case '15': return '5d';
    case '60': return '1mo';
    case 'D': return '3mo';
    case 'W': return '1y';
    case 'M': return '5y';
    default: return '3mo';
  }
}
