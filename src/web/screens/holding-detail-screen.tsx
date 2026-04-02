import { useSelector, useDispatch } from '../hooks/use-store';
import { useQuotes } from '../hooks/use-quotes';
import { Card, Badge, Button, EmptyState, SettingsGroup } from 'even-toolkit/web';
import { IcEdit, IcTrash } from 'even-toolkit/web/icons/svg-icons';
import { formatPrice, formatPercent, formatVolume } from '../../utils/format';

function HoldingDetailScreen() {
  const dispatch = useDispatch();
  const holding = useSelector((s) => {
    const id = s.selectedHoldingId;
    return id ? s.portfolio.find((h) => h.id === id) ?? null : null;
  });
  const quotes = useQuotes();

  if (!holding) {
    return <EmptyState title="No holding selected" />;
  }

  const quote = quotes[holding.symbol];
  const currentPrice = quote?.price ?? holding.avgCost;
  const marketValue = currentPrice * holding.quantity;
  const costBasis = holding.avgCost * holding.quantity;
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
              ${formatPrice(currentPrice)}
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
          <StatRow label="Avg Cost" value={`$${formatPrice(holding.avgCost)}`} />
          <StatRow label="Cost Basis" value={`$${formatPrice(costBasis)}`} />
          <StatRow label="Market Value" value={`$${formatPrice(marketValue)}`} />
          <div className="flex items-center justify-between">
            <span className="text-[13px] tracking-[-0.13px] text-text-dim">P&L</span>
            <Badge variant={isUp ? 'positive' : 'negative'}>
              {isUp ? '+' : ''}{formatPrice(pnl)} ({formatPercent(pnlPct)})
            </Badge>
          </div>
        </div>
      </Card>

      {/* Quote details if available */}
      {quote && (
        <SettingsGroup label="Market Data">
          <div className="space-y-3">
            <StatRow label="Open" value={`$${formatPrice(quote.open)}`} />
            <StatRow label="High" value={`$${formatPrice(quote.high)}`} />
            <StatRow label="Low" value={`$${formatPrice(quote.low)}`} />
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
