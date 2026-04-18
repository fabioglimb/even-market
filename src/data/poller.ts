import type { Store } from '../state/store';
import type { ChartResolution, GraphicEntry } from '../state/types';
import { getQuotes, getCandles, getCandlesByPeriod, resolutionToRange, resolutionToHistoryStep } from './yahoo-finance';
import { getCryptoQuotes, getCryptoCandles, resolutionToCgDays } from './coingecko';
import { fetchMarketNews } from './news';
import { fetchFxRates } from './forex';
import { storageSet } from './bridge-storage';

const PORTFOLIO_KEY = 'even-market:portfolio';
const ALERTS_KEY = 'even-market:alerts';

export class Poller {
  private store: Store;
  private quoteTimer: ReturnType<typeof setInterval> | null = null;
  private newsTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(store: Store) {
    this.store = store;
  }

  start(): void {
    this.disposed = false;
    this.pollQuotes();
    this.pollNews();
    this.pollFxRates();
    this.startQuoteInterval();
    this.startNewsInterval();

    this.store.subscribe((state, prev) => {
      if (state.settings.refreshInterval !== prev.settings.refreshInterval) {
        this.startQuoteInterval();
      }
      if (state.settings.graphics !== prev.settings.graphics) {
        this.pollQuotes();
      }
      if (state.settings.displayCurrency !== prev.settings.displayCurrency) {
        this.pollFxRates();
        this.pollQuotes(); // re-fetch crypto in new currency
      }
      // Persist portfolio changes
      if (state.portfolio !== prev.portfolio) {
        storageSet(PORTFOLIO_KEY, state.portfolio);
      }
      // Persist alert changes
      if (state.alerts !== prev.alerts) {
        storageSet(ALERTS_KEY, state.alerts);
      }
      // Persist favorites
      if (state.favoriteSymbols !== prev.favoriteSymbols) {
        storageSet('even-market:favorites', state.favoriteSymbols);
      }
    });
  }

  private startQuoteInterval(): void {
    if (this.quoteTimer) clearInterval(this.quoteTimer);
    const interval = this.store.getState().settings.refreshInterval * 1000;
    this.quoteTimer = setInterval(() => this.pollQuotes(), interval);
  }

  private startNewsInterval(): void {
    if (this.newsTimer) clearInterval(this.newsTimer);
    this.newsTimer = setInterval(() => this.pollNews(), 5 * 60 * 1000);
  }

  async pollFxRates(): Promise<void> {
    if (this.disposed) return;
    const state = this.store.getState();
    if (state.settings.displayCurrency === 'USD') return;
    // Refresh if stale (>5 min)
    if (state.fxRatesTimestamp > 0 && Date.now() - state.fxRatesTimestamp < 5 * 60 * 1000) return;
    try {
      const rates = await fetchFxRates();
      if (!this.disposed) {
        this.store.dispatch({ type: 'FX_RATES_LOADED', rates });
      }
    } catch { /* ignore */ }
  }

  async pollQuotes(): Promise<void> {
    if (this.disposed) return;
    const state = this.store.getState();
    const graphics = state.settings.graphics;
    const displayCurrency = state.settings.displayCurrency.toLowerCase();

    // Split into Yahoo (stock/forex/commodity) and CoinGecko (crypto)
    const yahooSymbols: string[] = [];
    const cryptoCoins: Array<{ geckoId: string; symbol: string; quoteCurrency?: string }> = [];
    const seen = new Set<string>();

    for (const g of graphics) {
      if (seen.has(g.symbol)) continue;
      seen.add(g.symbol);

      if (g.assetType === 'crypto' && g.geckoId) {
        cryptoCoins.push({ geckoId: g.geckoId, symbol: g.symbol, quoteCurrency: displayCurrency });
      } else {
        yahooSymbols.push(g.symbol);
      }
    }

    // Also include portfolio holdings that aren't in the watchlist
    for (const h of state.portfolio) {
      if (seen.has(h.symbol)) continue;
      seen.add(h.symbol);
      if (h.assetType === 'crypto' && h.geckoId) {
        cryptoCoins.push({ geckoId: h.geckoId, symbol: h.symbol, quoteCurrency: displayCurrency });
      } else {
        yahooSymbols.push(h.symbol);
      }
    }

    if (yahooSymbols.length === 0 && cryptoCoins.length === 0) return;

    // Fetch Yahoo and CoinGecko in parallel
    const [yahooQuotes, cryptoQuotesResult] = await Promise.all([
      yahooSymbols.length > 0
        ? getQuotes(yahooSymbols).catch(() => ({} as Record<string, import('../state/types').StockQuote>))
        : Promise.resolve({} as Record<string, import('../state/types').StockQuote>),
      cryptoCoins.length > 0
        ? getCryptoQuotes(cryptoCoins).catch(() => ({} as Record<string, import('../state/types').StockQuote>))
        : Promise.resolve({} as Record<string, import('../state/types').StockQuote>),
    ]);

    const merged = { ...yahooQuotes, ...cryptoQuotesResult };

    if (!this.disposed && Object.keys(merged).length > 0) {
      this.store.dispatch({ type: 'QUOTES_UPDATED', quotes: merged });
      this.checkAlerts(merged);
    }
  }

  async pollNews(): Promise<void> {
    if (this.disposed) return;
    try {
      const news = await fetchMarketNews();
      if (!this.disposed) {
        this.store.dispatch({ type: 'NEWS_LOADED', news });
      }
    } catch {
      // ignore transient news failures
    }
  }

  private checkAlerts(quotes: Record<string, import('../state/types').StockQuote>): void {
    const state = this.store.getState();
    for (const alert of state.alerts) {
      if (alert.triggered) continue;
      const quote = quotes[alert.symbol];
      if (!quote) continue;

      const shouldTrigger =
        (alert.condition === 'above' && quote.price >= alert.targetPrice) ||
        (alert.condition === 'below' && quote.price <= alert.targetPrice);

      if (shouldTrigger) {
        this.store.dispatch({
          type: 'ALERT_TRIGGERED',
          alertId: alert.id,
          triggeredAt: Date.now(),
        });
      }
    }
  }

  async fetchCandles(symbol: string, resolution?: ChartResolution): Promise<void> {
    if (this.disposed) return;
    const state = this.store.getState();
    const res = resolution ?? 'D';

    // Check cache
    const cacheKey = `${symbol}:${res}`;
    if (state.candlesCacheKey === cacheKey && Date.now() - state.candlesCacheTime < 60_000) {
      return;
    }

    // Determine if this is a crypto symbol
    const graphic = state.settings.graphics.find(
      (g) => g.symbol === symbol,
    );

    this.store.dispatch({ type: 'LOADING', loading: true });

    try {
      let candles: import('../state/types').Candle[];

      if (graphic?.assetType === 'crypto' && graphic.geckoId) {
        const days = resolutionToCgDays(res);
        candles = await getCryptoCandles(graphic.geckoId, days, graphic.quoteCurrency);
      } else {
        const range = resolutionToRange(res);
        candles = await getCandles(symbol, res, range);
      }

      if (!this.disposed) {
        this.store.dispatch({ type: 'CANDLES_LOADED', symbol, resolution: res, candles });
      }
    } catch {
      this.store.dispatch({ type: 'LOADING', loading: false });
    }
  }

  async fetchOlderCandles(symbol: string, resolution: ChartResolution): Promise<void> {
    if (this.disposed) return;
    const state = this.store.getState();
    if (state.candles.length === 0) return;

    // For crypto, older candles are not well-supported via CoinGecko OHLC,
    // so we only do this for Yahoo-backed symbols
    const graphic = state.settings.graphics.find((g) => g.symbol === symbol);
    if (graphic?.assetType === 'crypto') {
      // CoinGecko doesn't support period-based OHLC fetch; skip
      return;
    }

    const earliestTime = state.candles[0]!.time;
    const step = resolutionToHistoryStep(resolution);
    const period1 = earliestTime - step;
    const period2 = earliestTime;

    this.store.dispatch({ type: 'LOADING', loading: true });
    try {
      const candles = await getCandlesByPeriod(symbol, resolution, period1, period2);
      if (!this.disposed) {
        this.store.dispatch({ type: 'CANDLES_PREPEND', candles });
      }
    } catch {
      this.store.dispatch({ type: 'LOADING', loading: false });
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.quoteTimer) clearInterval(this.quoteTimer);
    if (this.newsTimer) clearInterval(this.newsTimer);
  }
}
