import { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, EmptyState, Loading, CategoryFilter } from 'even-toolkit/web';
import { IcFeatNews } from 'even-toolkit/web/icons/svg-icons';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  category: 'stocks' | 'crypto' | 'general';
}

const YF_PROXY = import.meta.env.VITE_EHPK
  ? 'https://even-market.vercel.app/yf-api'
  : '/yf-api';

/** Fetch Yahoo Finance news via search endpoint (returns news alongside results) */
async function fetchYahooNews(): Promise<NewsItem[]> {
  const queries = ['stock market', 'S&P 500', 'NASDAQ', 'earnings'];
  const allNews: NewsItem[] = [];

  for (const q of queries) {
    try {
      const res = await fetch(`${YF_PROXY}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=0&newsCount=5`);
      if (!res.ok) continue;
      const data = await res.json();
      const news = data.news ?? [];
      for (const item of news) {
        if (allNews.some((n) => n.title === item.title)) continue;
        allNews.push({
          id: `yf-${allNews.length}`,
          title: item.title ?? 'Untitled',
          description: '',
          url: item.link ?? '#',
          source: item.publisher ?? 'Yahoo Finance',
          publishedAt: formatTimeAgo(item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : null),
          category: 'stocks',
        });
      }
    } catch { /* skip */ }
  }

  return allNews.slice(0, 15);
}

/** Fetch CoinGecko trending coins as crypto "news" */
async function fetchCryptoTrending(): Promise<NewsItem[]> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
    if (!res.ok) return [];
    const data = await res.json();
    const coins = data.coins ?? [];
    return coins.slice(0, 10).map((c: any, i: number) => ({
      id: `cg-${i}`,
      title: `${c.item.name} (${c.item.symbol}) is trending`,
      description: `Market cap rank #${c.item.market_cap_rank ?? '?'} · Price: $${c.item.data?.price?.toFixed(4) ?? '?'} · 24h: ${c.item.data?.price_change_percentage_24h?.usd?.toFixed(2) ?? '?'}%`,
      url: `https://www.coingecko.com/en/coins/${c.item.id}`,
      source: 'CoinGecko Trending',
      publishedAt: 'Now',
      category: 'crypto' as const,
    }));
  } catch {
    return [];
  }
}

function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = Date.now();
    const diff = now - date.getTime();
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

const FILTER_OPTIONS = ['All', 'Stocks', 'Crypto'];

function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [articleContent, setArticleContent] = useState<string | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);

  const loadNews = useCallback(async () => {
    setLoading(true);
    const [yahoo, crypto] = await Promise.all([
      fetchYahooNews(),
      fetchCryptoTrending(),
    ]);
    setNews([...yahoo, ...crypto]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const filtered = filter === 'All'
    ? news
    : news.filter((n) => n.category === (filter === 'Stocks' ? 'stocks' : 'crypto'));

  async function openArticle(item: NewsItem) {
    setSelectedArticle(item);
    setArticleContent(null);
    setLoadingArticle(true);
    try {
      // Fetch article via even-browser's CORS proxy
      const browseProxy = import.meta.env.VITE_EHPK
        ? 'https://even-browser.vercel.app/__browse_proxy'
        : '/__browse_proxy';
      const res = await fetch(`${browseProxy}?url=${encodeURIComponent(item.url)}`);
      if (res.ok) {
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const article = doc.querySelector('article') || doc.querySelector('main') || doc.body;
        // Extract text paragraphs
        const paragraphs = Array.from(article?.querySelectorAll('p') ?? [])
          .map((p) => p.textContent?.trim())
          .filter((t): t is string => !!t && t.length > 30)
          .slice(0, 20);
        setArticleContent(paragraphs.join('\n\n') || 'Could not extract article content.');
      } else {
        setArticleContent('Could not load article.');
      }
    } catch {
      setArticleContent('Could not load article.');
    }
    setLoadingArticle(false);
  }

  // Article detail view — parent App.tsx handles navbar back button
  if (selectedArticle) {
    return (
      <div className="space-y-3">
        <Card>
          <div className="text-[17px] tracking-[-0.17px] font-normal text-text mb-1.5">
            {selectedArticle.title}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">{selectedArticle.source}</span>
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">{selectedArticle.publishedAt}</span>
            <Badge variant={selectedArticle.category === 'crypto' ? 'accent' : 'neutral'}>
              {selectedArticle.category}
            </Badge>
          </div>
          {loadingArticle ? (
            <div className="flex justify-center py-6"><Loading size={24} /></div>
          ) : (
            <div className="text-[13px] tracking-[-0.13px] text-text-dim leading-relaxed whitespace-pre-line">
              {articleContent}
            </div>
          )}
        </Card>
        <Button variant="default" size="sm" onClick={() => window.open(selectedArticle.url, '_blank')}>
          Open in browser
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CategoryFilter
        categories={FILTER_OPTIONS}
        selected={filter}
        onSelect={setFilter}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={<IcFeatNews width={32} height={32} />} title="No news available" description="Check back later for market updates." />
      ) : (
        filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => openArticle(item)}
            className="cursor-pointer"
          >
            <Card>
              <div className="text-[15px] tracking-[-0.15px] font-normal text-text mb-1.5">
                {item.title}
              </div>
              {item.description && (
                <div className="text-[13px] tracking-[-0.13px] text-text-dim mb-1.5 line-clamp-2">
                  {item.description}
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-[11px] tracking-[-0.11px] text-text-dim">{item.source}</span>
                <span className="text-[11px] tracking-[-0.11px] text-text-dim">{item.publishedAt}</span>
                <Badge variant={item.category === 'crypto' ? 'accent' : 'neutral'}>
                  {item.category}
                </Badge>
              </div>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}

export { NewsScreen };
