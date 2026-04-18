import type { StockQuote } from '../../state/types';
import { useSelector } from './use-store';

export function useQuotes(): Record<string, StockQuote> {
  return useSelector((s) => s.quotes);
}
