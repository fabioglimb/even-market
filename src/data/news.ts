import type { MarketNewsItem } from '../state/types';

const YF_PROXY = `${import.meta.env.VITE_PROXY_URL}/yf`;
const BROWSE_PROXY = `${import.meta.env.VITE_PROXY_URL}/browse`;

const PROXY_HEADERS: Record<string, string> = import.meta.env.VITE_PROXY_KEY
  ? { 'X-Proxy-Key': import.meta.env.VITE_PROXY_KEY }
  : {};

function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

async function fetchYahooNews(): Promise<MarketNewsItem[]> {
  const queries = ['stock market', 'S&P 500', 'NASDAQ', 'earnings'];
  const allNews: MarketNewsItem[] = [];

  for (const q of queries) {
    try {
      const res = await fetch(`${YF_PROXY}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=0&newsCount=5`, { headers: PROXY_HEADERS });
      if (!res.ok) continue;
      const data = await res.json();
      const news = data.news ?? [];
      for (const item of news) {
        if (allNews.some((n) => n.title === item.title)) continue;
        const ts = item.providerPublishTime ? item.providerPublishTime * 1000 : Date.now();
        allNews.push({
          id: item.uuid ?? `yf-${allNews.length}`,
          title: item.title ?? 'Untitled',
          description: item.summary ?? '',
          url: item.link ?? '#',
          source: item.publisher ?? 'Yahoo Finance',
          publishedAt: formatTimeAgo(new Date(ts).toISOString()),
          timestamp: ts,
          category: 'stocks',
        });
      }
    } catch {
      // skip failed query
    }
  }

  return allNews.slice(0, 15);
}

async function fetchCryptoTrending(): Promise<MarketNewsItem[]> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
    if (!res.ok) return [];
    const data = await res.json();
    const coins = data.coins ?? [];
    return coins.slice(0, 10).map((c: any, i: number) => ({
      id: `cg-${c.item?.id ?? i}`,
      title: `${c.item.name} (${c.item.symbol}) is trending`,
      description: `Market cap rank #${c.item.market_cap_rank ?? '?'} · Price: $${c.item.data?.price?.toFixed(4) ?? '?'} · 24h: ${c.item.data?.price_change_percentage_24h?.usd?.toFixed(2) ?? '?'}%`,
      url: `https://www.coingecko.com/en/coins/${c.item.id}`,
      source: 'CoinGecko Trending',
      publishedAt: 'Now',
      timestamp: Date.now(),
      category: 'crypto',
    }));
  } catch {
    return [];
  }
}

export async function fetchMarketNews(): Promise<MarketNewsItem[]> {
  const [yahoo, crypto] = await Promise.all([
    fetchYahooNews(),
    fetchCryptoTrending(),
  ]);
  return [...yahoo, ...crypto].sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchNewsArticleContent(url: string): Promise<string> {
  try {
    const res = await fetch(`${BROWSE_PROXY}?url=${encodeURIComponent(url)}`, { headers: PROXY_HEADERS });
    if (!res.ok) return 'Could not load article.';

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const article = doc.querySelector('article') || doc.querySelector('main') || doc.body;
    const paragraphs = Array.from(article?.querySelectorAll('p') ?? [])
      .map((p) => p.textContent?.trim())
      .filter((text): text is string => !!text && text.length > 30)
      .slice(0, 20);

    if (paragraphs.length > 0) return paragraphs.join('\n\n');

    const fallback = article?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (fallback.length > 80) return fallback;

    return 'Could not extract article content.';
  } catch {
    return 'Could not load article.';
  }
}
