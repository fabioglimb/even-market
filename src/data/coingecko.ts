import type { StockQuote, Candle } from '../state/types';

/**
 * CoinGecko API client for cryptocurrency data.
 * Uses the free /api/v3 endpoints (no API key required, rate-limited).
 */

const CG_BASE = 'https://api.coingecko.com/api/v3';

export interface CoinGeckoQuote {
  id: string;
  symbol: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
}

/**
 * Fetch quotes for a list of CoinGecko coin IDs.
 * Returns a map keyed by the user-facing symbol (e.g. 'BTC', 'ETH').
 */
export async function getCryptoQuotes(
  coins: Array<{ geckoId: string; symbol: string; quoteCurrency?: string }>,
): Promise<Record<string, StockQuote>> {
  if (coins.length === 0) return {};
  const results: Record<string, StockQuote> = {};

  const vsCurrency = coins[0]?.quoteCurrency ?? 'usd';
  const ids = coins.map((c) => c.geckoId).join(',');

  try {
    const url = `${CG_BASE}/coins/markets?vs_currency=${vsCurrency}&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;
    const res = await fetch(url);
    if (!res.ok) return results;
    const data: CoinGeckoQuote[] = await res.json();

    for (const coin of data) {
      // Find the matching entry to get user-facing symbol
      const entry = coins.find((c) => c.geckoId === coin.id);
      if (!entry) continue;

      results[entry.symbol] = {
        symbol: entry.symbol,
        price: coin.current_price ?? 0,
        change: coin.price_change_24h ?? 0,
        changePercent: coin.price_change_percentage_24h ?? 0,
        high: coin.high_24h ?? 0,
        low: coin.low_24h ?? 0,
        open: (coin.current_price ?? 0) - (coin.price_change_24h ?? 0),
        volume: coin.total_volume ?? 0,
        previousClose: (coin.current_price ?? 0) - (coin.price_change_24h ?? 0),
        timestamp: Date.now(),
      };
    }
  } catch {
    // Silently fail — poller will retry
  }

  return results;
}

/**
 * Fetch OHLC candle data from CoinGecko.
 * CoinGecko OHLC supports days: 1, 7, 14, 30, 90, 180, 365, max.
 */
export async function getCryptoCandles(
  geckoId: string,
  days: number | string = 30,
  quoteCurrency = 'usd',
): Promise<Candle[]> {
  try {
    const url = `${CG_BASE}/coins/${geckoId}/ohlc?vs_currency=${quoteCurrency}&days=${days}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: number[][] = await res.json();

    // CoinGecko OHLC: [ [timestamp, open, high, low, close], ... ]
    return data.map(([time, open, high, low, close]) => ({
      time: time!,
      open: open!,
      high: high!,
      low: low!,
      close: close!,
      volume: 0, // OHLC endpoint doesn't include volume
    }));
  } catch {
    return [];
  }
}

export interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
  thumb: string;
}

/**
 * Search for coins by query string using CoinGecko search endpoint.
 * Returns up to 10 results.
 */
export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (!query || query.length < 2) return [];
  try {
    const url = `${CG_BASE}/search?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const coins: CoinSearchResult[] = (data.coins ?? []).slice(0, 10).map(
      (c: { id: string; symbol: string; name: string; market_cap_rank: number | null; thumb: string }) => ({
        id: c.id,
        symbol: c.symbol?.toUpperCase() ?? '',
        name: c.name ?? '',
        market_cap_rank: c.market_cap_rank ?? null,
        thumb: c.thumb ?? '',
      }),
    );
    return coins;
  } catch {
    return [];
  }
}

/**
 * Map our chart resolution to CoinGecko OHLC days parameter.
 */
export function resolutionToCgDays(resolution: string): number | string {
  switch (resolution) {
    case '1': return 1;
    case '5': return 1;
    case '15': return 7;
    case '60': return 30;
    case 'D': return 90;
    case 'W': return 365;
    case 'M': return 'max';
    default: return 90;
  }
}
