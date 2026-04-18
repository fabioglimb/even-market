import { useSelector, useDispatch } from '../hooks/use-store';
import { useQuotes } from '../hooks/use-quotes';
import { Card, Badge, Button, EmptyState, SettingsGroup } from 'even-toolkit/web';
import { IcEdit, IcTrash } from 'even-toolkit/web/icons/svg-icons';
import { formatPercent, formatVolume } from '../../utils/format';
import { useCurrency } from '../hooks/use-currency';

function HoldingDetailScreen() {
  const dispatch = useDispatch();
  const holding = useSelector((s) => {
    const id = s.selectedHoldingId;
    return id ? s.portfolio.find((h) => h.id === id) ?? null : null;
  });
  const quotes = useQuotes();
  const c = useCurrency();

  if (!holding) {
    return <EmptyState title="No holding selected" />;
  }

  const quote = quotes[holding.symbol];
  const currentPrice = c.convert(quote?.price ?? holding.avgCost, holding.assetType);
  const avgCostConverted = c.convert(holding.avgCost, holding.assetType);
  const marketValue = currentPrice * holding.quantity;
  const costBasis = avgCostConverted * holding.quantity;
  const pnl = marketValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  const isUp = pnl >= 0;

  function handleEdit() {
    dispatch({ type: 'NAVIGATE', screen: 'holding-form' });
  }

  function handleDelete() {
    dispatch({ type: 'HOLDING_REMOVE', holdingId: holding!.id });
    dispatch({ type: 'NAVIGATE', screen: 'portfolio' });
  }

  return (
    <>
      {/* Symbol + price header */}
      <div className="text-center mb-3">
        <div className="text-[20px] tracking-[-0.6px] font-normal">{holding.symbol}</div>
        <div className="text-[11px] tracking-[-0.11px] text-text-dim capitalize">{holding.assetType}</div>
      </div>

      {/* Price + PnL card */}
      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[-0.11px] text-text-dim">Current Price</div>
            <div className="text-[17px] tracking-[-0.17px] font-normal font-mono tabular-nums">
              {c.format(currentPrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] tracking-[-0.11px] text-text-dim">24h Change</div>
            <Badge variant={quote && quote.changePercent >= 0 ? 'positive' : 'negative'}>
              {quote ? formatPercent(quote.changePercent) : '--'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Portfolio stats */}
      <Card className="mb-3">
        <div className="space-y-3">
          <StatRow label="Quantity" value={String(holding.quantity)} />
          <StatRow label="Avg Cost" value={c.format(avgCostConverted)} />
          <StatRow label="Cost Basis" value={c.format(costBasis)} />
          <StatRow label="Market Value" value={c.format(marketValue)} />
          <div className="flex items-center justify-between">
            <span className="text-[13px] tracking-[-0.13px] text-text-dim">P&L</span>
            <Badge variant={isUp ? 'positive' : 'negative'}>
              {isUp ? '+' : ''}{c.format(pnl)} ({formatPercent(pnlPct)})
            </Badge>
          </div>
        </div>
      </Card>

      {/* Quote details if available */}
      {quote && (
        <SettingsGroup label="Market Data">
          <div className="space-y-3">
            <StatRow label="Open" value={c.format(c.convert(quote.open, holding.assetType))} />
            <StatRow label="High" value={c.format(c.convert(quote.high, holding.assetType))} />
            <StatRow label="Low" value={c.format(c.convert(quote.low, holding.assetType))} />
            <StatRow label="Volume" value={formatVolume(quote.volume)} />
          </div>
        </SettingsGroup>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <Button className="flex-1" onClick={handleEdit}>
          <IcEdit width={14} height={14} />
          <span className="ml-1.5">Edit</span>
        </Button>
        <Button variant="ghost" className="flex-1" onClick={handleDelete}>
          <IcTrash width={14} height={14} className="text-negative" />
          <span className="ml-1.5 text-negative">Delete</span>
        </Button>
      </div>
    </>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] tracking-[-0.13px] text-text-dim">{label}</span>
      <span className="text-[13px] tracking-[-0.13px] font-mono tabular-nums">{value}</span>
    </div>
  );
}

export { HoldingDetailScreen };
