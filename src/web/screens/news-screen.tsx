import { useState, useEffect, useCallback } from 'react';
import { Card, Badge, EmptyState, Loading, CategoryFilter } from 'even-toolkit/web';
import { IcFeatNews } from 'even-toolkit/web/icons/svg-icons';
import { fetchMarketNews } from '../../data/news';
import type { MarketNewsItem } from '../../state/types';
import { useDispatch, useSelector } from '../hooks/use-store';
import { filterNewsItems } from '../../state/news-utils';

const FILTER_OPTIONS = ['All', 'Stocks', 'Crypto'];

function NewsScreen({
  isDetail,
  onArticleOpen,
}: {
  isDetail?: boolean;
  onArticleOpen?: (article: MarketNewsItem) => void;
} = {}) {
  const dispatch = useDispatch();
  const news = useSelector((s) => s.news);
  const selectedNewsId = useSelector((s) => s.selectedNewsId);
  const selectedNewsContent = useSelector((s) => s.selectedNewsContent);
  const selectedNewsLoading = useSelector((s) => s.selectedNewsLoading);
  const newsFilter = useSelector((s) => s.newsFilter);

  const [loading, setLoading] = useState(news.length === 0);

  const loadNews = useCallback(async () => {
    setLoading(true);
    const all = await fetchMarketNews();
    dispatch({ type: 'NEWS_LOADED', news: all });
    setLoading(false);
  }, [dispatch]);

  // Load on mount + auto-refresh every 5 minutes
  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNews]);

  useEffect(() => {
    if (news.length > 0) setLoading(false);
  }, [news.length]);

  const filtered = filterNewsItems(news, newsFilter);

  const selectedArticle = selectedNewsId
    ? news.find((item) => item.id === selectedNewsId) ?? null
    : null;

  function openArticle(item: MarketNewsItem) {
    dispatch({ type: 'SELECT_NEWS', newsId: item.id });
    onArticleOpen?.(item);
  }

  // Article detail view — parent App.tsx handles navbar back button
  if (isDetail && selectedArticle) {
    return (
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
        {selectedNewsLoading ? (
          <div className="flex justify-center py-6"><Loading size={24} /></div>
        ) : (
          <div className="text-[13px] tracking-[-0.13px] text-text-dim leading-relaxed whitespace-pre-line">
            {selectedNewsContent ?? selectedArticle.description ?? 'Could not load article.'}
          </div>
        )}
      </Card>
    );
  }

  if (isDetail && !selectedArticle) {
    return (
      <div className="flex justify-center py-12">
        <Loading size={32} />
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
        selected={newsFilter === 'all' ? 'All' : newsFilter === 'stocks' ? 'Stocks' : 'Crypto'}
        onSelect={(value) => dispatch({ type: 'NEWS_FILTER', filter: value === 'Stocks' ? 'stocks' : value === 'Crypto' ? 'crypto' : 'all' })}
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
