import type { PortfolioHolding, Candle } from '../state/types';
import { getCandles } from './yahoo-finance';
import { getCryptoMarketChart } from './coingecko';
import { convertPrice } from '../utils/format';

export type PortfolioPeriod = '1D' | '1W' | '1M' | '1Y';

export interface PortfolioValuePoint {
  time: number;
  value: number;
}

const PERIOD_CONFIG: Record<PortfolioPeriod, { days: number; yahooInterval: string; yahooRange: string }> = {
  '1D': { days: 1, yahooInterval: '5', yahooRange: '1d' },
  '1W': { days: 7, yahooInterval: '60', yahooRange: '5d' },
  '1M': { days: 30, yahooInterval: 'D', yahooRange: '1mo' },
  '1Y': { days: 365, yahooInterval: 'D', yahooRange: '1y' },
};

/**
 * Fetch historical portfolio value over time.
 * Fetches price history for each holding, merges into a single value series.
 * No data is persisted — everything is fetched fresh.
 */
export async function fetchPortfolioHistory(
  holdings: PortfolioHolding[],
  period: PortfolioPeriod,
  displayCurrency: string,
  fxRates: Record<string, number>,
): Promise<PortfolioValuePoint[]> {
  if (holdings.length === 0) return [];

  const config = PERIOD_CONFIG[period];

  // Fetch price history for each holding in parallel
  const priceSeriesPromises = holdings.map(async (holding) => {
    let series: Array<[number, number]> = []; // [timestamp_ms, price]

    if (holding.assetType === 'crypto' && holding.geckoId) {
      series = await getCryptoMarketChart(
        holding.geckoId,
        config.days,
        displayCurrency.toLowerCase(),
      );
    } else {
      try {
        const candles: Candle[] = await getCandles(
          holding.symbol,
          config.yahooInterval,
          config.yahooRange,
        );
        series = candles.map((c) => [c.time, c.close]);
      } catch {
        series = [];
      }
    }

    return { holding, series };
  });

  const results = await Promise.all(priceSeriesPromises);

  // Collect all unique timestamps and sort
  const allTimestamps = new Set<number>();
  for (const { series } of results) {
    for (const [t] of series) {
      allTimestamps.add(t);
    }
  }

  if (allTimestamps.size === 0) return [];

  const sortedTimes = [...allTimestamps].sort((a, b) => a - b);

  // Build price maps for each holding (for fast lookup)
  const priceMaps = results.map(({ holding, series }) => {
    const sorted = series.sort((a, b) => a[0] - b[0]);
    return { holding, sorted };
  });

  // For each timestamp, compute total portfolio value
  const points: PortfolioValuePoint[] = [];

  for (const time of sortedTimes) {
    let totalValue = 0;

    for (const { holding, sorted } of priceMaps) {
      // Forward-fill: find the latest price at or before this timestamp
      let price = holding.avgCost; // fallback
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i]![0] <= time) {
          price = sorted[i]![1];
          break;
        }
      }

      // Apply FX conversion for non-crypto (Yahoo returns USD)
      if (holding.assetType !== 'crypto') {
        price = convertPrice(price, displayCurrency, fxRates);
      }

      totalValue += price * holding.quantity;
    }

    points.push({ time, value: totalValue });
  }

  return points;
}
