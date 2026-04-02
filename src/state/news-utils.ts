import type { AppState, MarketNewsItem } from './types';

export function filterNewsItems(items: MarketNewsItem[], filter: AppState['newsFilter']): MarketNewsItem[] {
  if (filter === 'all') return items;
  return items.filter((item) => item.category === filter);
}
