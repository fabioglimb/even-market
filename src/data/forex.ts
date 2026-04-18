import { getQuotes } from './yahoo-finance';

// Yahoo forex pair → how to derive "1 USD = X target"
// Direct pairs: USDJPY=X returns JPY per 1 USD → rate = price
// Inverted pairs: EURUSD=X returns USD per 1 EUR → rate = 1/price
const FX_PAIR_CONFIG: Record<string, { yahoo: string; invert: boolean }> = {
  EUR: { yahoo: 'EURUSD', invert: true },
  GBP: { yahoo: 'GBPUSD', invert: true },
  JPY: { yahoo: 'USDJPY', invert: false },
  CHF: { yahoo: 'USDCHF', invert: false },
  CAD: { yahoo: 'USDCAD', invert: false },
  AUD: { yahoo: 'AUDUSD', invert: true },
  CNY: { yahoo: 'USDCNY', invert: false },
};

/**
 * Fetch FX rates from Yahoo Finance forex pairs.
 * Returns rates as "1 USD = X target currency".
 * USD itself is always 1.
 */
export async function fetchFxRates(): Promise<Record<string, number>> {
  const rates: Record<string, number> = { USD: 1 };
  const symbols = Object.values(FX_PAIR_CONFIG).map((c) => c.yahoo);

  try {
    const quotes = await getQuotes(symbols);

    for (const [currency, config] of Object.entries(FX_PAIR_CONFIG)) {
      const quote = quotes[config.yahoo];
      if (quote && quote.price > 0) {
        rates[currency] = config.invert ? 1 / quote.price : quote.price;
      }
    }
  } catch {
    // Return whatever rates we got (at least USD: 1)
  }

  return rates;
}
