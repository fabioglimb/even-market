import { useQuotes } from '../hooks/use-quotes';
import { useGraphics } from '../hooks/use-graphics';
import { useSelector } from '../hooks/use-store';
import { Card, Badge, StatGrid, EmptyState } from 'even-toolkit/web';
import { IcFeatLearnExplore } from 'even-toolkit/web/icons/svg-icons';
import { formatPrice, formatPercent, formatVolume } from '../../utils/format';

function OverviewScreen() {
  const quotes = useQuotes();
  const graphics = useGraphics();
  const portfolio = useSelector((s) => s.portfolio);

  const symbols = graphics.map((g) => g.symbol);
  const activeQuotes = symbols
    .map((sym) => quotes[sym])
    .filter((q): q is NonNullable<typeof q> => !!q);

  // Market summary stats
  const gainers = activeQuotes.filter((q) => q.changePercent > 0).length;
  const losers = activeQuotes.filter((q) => q.changePercent < 0).length;
  const unchanged = activeQuotes.length - gainers - losers;

  const totalVolume = activeQuotes.reduce((sum, q) => sum + q.volume, 0);

  // Top movers
  const sorted = [...activeQuotes].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const topMovers = sorted.slice(0, 5);

  // Best and worst
  const best = [...activeQuotes].sort((a, b) => b.changePercent - a.changePercent)[0];
  const worst = [...activeQuotes].sort((a, b) => a.changePercent - b.changePercent)[0];

  // Portfolio summary
  const portfolioValue = portfolio.reduce((sum, h) => {
    const q = quotes[h.symbol];
    return sum + (q ? q.price * h.quantity : h.avgCost * h.quantity);
  }, 0);

  const portfolioCost = portfolio.reduce((sum, h) => sum + h.avgCost * h.quantity, 0);
  const portfolioPnl = portfolioValue - portfolioCost;

  const summaryStats = [
    { label: 'Watchlist', value: String(graphics.length) },
    { label: 'Gainers', value: String(gainers) },
    { label: 'Losers', value: String(losers) },
    { label: 'Unchanged', value: String(unchanged) },
    { label: 'Total Volume', value: formatVolume(totalVolume) },
    { label: 'Holdings', value: String(portfolio.length) },
  ];

  if (activeQuotes.length === 0) {
    return <EmptyState icon={<IcFeatLearnExplore width={32} height={32} />} title="No market data" description="Add symbols to your watchlist to see the overview." />;
  }

  return (
    <>
      {/* Market summary */}
      <StatGrid stats={summaryStats} columns={3} className="mb-3" />

      {/* Portfolio card */}
      {portfolio.length > 0 && (
        <Card className="mb-3">
          <div className="text-[11px] tracking-[-0.11px] text-text-dim mb-1.5">Portfolio</div>
          <div className="flex items-center justify-between">
            <span className="text-[17px] tracking-[-0.17px] font-normal font-mono tabular-nums">
              ${formatPrice(portfolioValue)}
            </span>
            <Badge variant={portfolioPnl >= 0 ? 'positive' : 'negative'}>
              {portfolioPnl >= 0 ? '+' : ''}{formatPrice(portfolioPnl)}
            </Badge>
          </div>
        </Card>
      )}

      {/* Best / Worst */}
      <div className="flex gap-3 mb-3">
        {best && (
          <Card className="flex-1">
            <div className="text-[11px] tracking-[-0.11px] text-text-dim mb-1.5">Best Performer</div>
            <div className="text-[15px] tracking-[-0.15px] font-normal">{best.symbol}</div>
            <Badge variant="positive">{formatPercent(best.changePercent)}</Badge>
          </Card>
        )}
        {worst && (
          <Card className="flex-1">
            <div className="text-[11px] tracking-[-0.11px] text-text-dim mb-1.5">Worst Performer</div>
            <div className="text-[15px] tracking-[-0.15px] font-normal">{worst.symbol}</div>
            <Badge variant="negative">{formatPercent(worst.changePercent)}</Badge>
          </Card>
        )}
      </div>

      {/* Top movers */}
      {topMovers.length > 0 && (
        <Card>
          <div className="text-[11px] tracking-[-0.11px] text-text-dim mb-3">Top Movers</div>
          <div className="space-y-3">
            {topMovers.map((q) => (
              <div key={q.symbol} className="flex items-center justify-between">
                <span className="text-[13px] tracking-[-0.13px] font-normal">{q.symbol}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] tracking-[-0.13px] font-mono tabular-nums">
                    ${formatPrice(q.price)}
                  </span>
                  <Badge variant={q.changePercent >= 0 ? 'positive' : 'negative'}>
                    {formatPercent(q.changePercent)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

export { OverviewScreen };
