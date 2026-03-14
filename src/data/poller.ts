import type { Store } from '../state/store';
import type { ChartResolution } from '../state/types';
import { getQuotes, getCandles, resolutionToRange } from './yahoo-finance';

export class Poller {
  private store: Store;
  private quoteTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(store: Store) {
    this.store = store;
  }

  start(): void {
    this.disposed = false;
    this.pollQuotes();
    this.startQuoteInterval();

    this.store.subscribe((state, prev) => {
      if (state.settings.refreshInterval !== prev.settings.refreshInterval) {
        this.startQuoteInterval();
      }
      if (state.settings.graphics !== prev.settings.graphics) {
        this.pollQuotes();
      }
    });
  }

  private startQuoteInterval(): void {
    if (this.quoteTimer) clearInterval(this.quoteTimer);
    const interval = this.store.getState().settings.refreshInterval * 1000;
    this.quoteTimer = setInterval(() => this.pollQuotes(), interval);
  }

  async pollQuotes(): Promise<void> {
    if (this.disposed) return;
    const state = this.store.getState();
    const symbols = [...new Set(state.settings.graphics.map((g) => g.symbol))];

    if (symbols.length === 0) return;

    try {
      const quotes = await getQuotes(symbols);
      if (!this.disposed && Object.keys(quotes).length > 0) {
        this.store.dispatch({ type: 'QUOTES_UPDATED', quotes });
      }
    } catch (err) {
      void err;
    }
  }

  async fetchCandles(symbol: string, resolution?: ChartResolution): Promise<void> {
    if (this.disposed) return;
    const state = this.store.getState();
    const res = resolution ?? 'D';

    // Check cache — key is "symbol:resolution"
    const cacheKey = `${symbol}:${res}`;
    if (state.candlesCacheKey === cacheKey && Date.now() - state.candlesCacheTime < 60_000) {
      return;
    }

    this.store.dispatch({ type: 'LOADING', loading: true });
    try {
      const range = resolutionToRange(res);
      const candles = await getCandles(symbol, res, range);
      if (!this.disposed) {
        this.store.dispatch({ type: 'CANDLES_LOADED', symbol, resolution: res, candles });
      }
    } catch (err) {
      void err;
      this.store.dispatch({ type: 'LOADING', loading: false });
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.quoteTimer) clearInterval(this.quoteTimer);
  }
}
