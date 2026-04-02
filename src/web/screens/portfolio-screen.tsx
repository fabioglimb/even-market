import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from '../hooks/use-store';
import { useQuotes } from '../hooks/use-quotes';
import { useGraphics } from '../hooks/use-graphics';
import { ListItem, Badge, EmptyState, Button, Card, Dialog, Input, Select, ConfirmDialog, PieChart } from 'even-toolkit/web';
import { IcEditChecklist } from 'even-toolkit/web/icons/svg-icons';
import { formatPrice, formatPercent, displaySymbol } from '../../utils/format';
import type { PortfolioHolding, AssetType } from '../../state/types';

function PortfolioScreen({ addTrigger }: { addTrigger?: number }) {
  const dispatch = useDispatch();
  const portfolio = useSelector((s) => s.portfolio);
  const quotes = useQuotes();
  const graphics = useGraphics();

  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Open form when navbar + button is pressed
  useEffect(() => {
    if (addTrigger && addTrigger > 0) handleOpenForm();
  }, [addTrigger]);

  // Form state
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');

  const totalValue = portfolio.reduce((sum, h) => {
    const q = quotes[h.symbol];
    return sum + (q ? q.price * h.quantity : h.avgCost * h.quantity);
  }, 0);

  const totalCost = portfolio.reduce((sum, h) => sum + h.avgCost * h.quantity, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const allocationTotals = new Map<string, number>();
  for (const holding of portfolio) {
    const quote = quotes[holding.symbol];
    const marketValue = (quote ? quote.price : holding.avgCost) * holding.quantity;
    const key = displaySymbol(holding.symbol);
    allocationTotals.set(key, (allocationTotals.get(key) ?? 0) + marketValue);
  }
  const allocationData = Array.from(allocationTotals.entries())
    .map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2)),
    }))
    .filter((item) => item.value > 0);

  // Build watchlist options for symbol picker
  const symbolOptions = graphics.map((g) => ({
    value: g.id,
    label: `${displaySymbol(g.symbol)} · ${g.assetType ?? 'stock'}`,
  }));

  function handleOpenForm() {
    setSelectedSymbol(symbolOptions[0]?.value ?? '');
    setQuantity('');
    setAvgCost('');
    setShowForm(true);
  }

  function handleSave() {
    const graphic = graphics.find((g) => g.id === selectedSymbol);
    if (!graphic) return;
    const qty = parseFloat(quantity);
    const cost = parseFloat(avgCost);
    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost <= 0) return;

    const holding: PortfolioHolding = {
      id: `${graphic.symbol}-${Date.now()}`,
      symbol: graphic.symbol,
      assetType: (graphic.assetType ?? 'stock') as AssetType,
      quantity: qty,
      avgCost: cost,
      geckoId: graphic.geckoId,
      quoteCurrency: graphic.quoteCurrency,
      addedAt: Date.now(),
    };
    dispatch({ type: 'HOLDING_ADD', holding });
    setShowForm(false);
  }

  return (
    <>
      {/* Summary card */}
      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[-0.11px] text-text-dim">Total Value</div>
            <div className="text-[20px] tracking-[-0.6px] font-normal font-mono tabular-nums">
              ${formatPrice(totalValue)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] tracking-[-0.11px] text-text-dim">P&L</div>
            <Badge variant={totalPnl >= 0 ? 'positive' : 'negative'}>
              {totalPnl >= 0 ? '+' : ''}{formatPrice(totalPnl)} ({formatPercent(totalPnlPct)})
            </Badge>
          </div>
        </div>
        {allocationData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <PieChart
              data={allocationData}
              donut
              size={180}
            />
          </div>
        )}
      </Card>

      {/* Holdings list */}
      <div className="rounded-[6px] overflow-hidden bg-surface">
        {portfolio.length === 0 ? (
          <EmptyState icon={<IcEditChecklist width={32} height={32} />} title="No holdings yet" description="Add your first holding to track your portfolio." />
        ) : (
          portfolio.map((holding) => (
            <HoldingRow
              key={holding.id}
              holding={holding}
              quote={quotes[holding.geckoId ?? holding.symbol]}
              onPress={() => dispatch({ type: 'SELECT_HOLDING', holdingId: holding.id })}
              onDelete={() => setDeleteTarget(holding.id)}
            />
          ))
        )}
      </div>

      {/* Add Holding Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Symbol (from watchlist)</span>
            <Select
              options={symbolOptions.length > 0 ? symbolOptions : [{ value: '', label: 'Add symbols to watchlist first' }]}
              value={selectedSymbol}
              onValueChange={setSelectedSymbol}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Quantity</span>
            <Input
              placeholder="0.00"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Average Cost ($)</span>
            <Input
              placeholder="0.00"
              type="number"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
            />
          </div>
          <div className="flex gap-3 mt-1.5">
            <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>Add</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) dispatch({ type: 'HOLDING_REMOVE', holdingId: deleteTarget });
          setDeleteTarget(null);
        }}
        title="Delete holding?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}

interface HoldingRowProps {
  holding: PortfolioHolding;
  quote?: { price: number; changePercent: number };
  onPress: () => void;
  onDelete: () => void;
}

function HoldingRow({ holding, quote, onPress, onDelete }: HoldingRowProps) {
  const currentPrice = quote?.price ?? holding.avgCost;
  const marketValue = currentPrice * holding.quantity;
  const pnl = (currentPrice - holding.avgCost) * holding.quantity;
  const pnlPct = holding.avgCost > 0 ? ((currentPrice - holding.avgCost) / holding.avgCost) * 100 : 0;

  return (
    <ListItem
      title={displaySymbol(holding.symbol)}
      subtitle={`${holding.quantity} @ $${formatPrice(holding.avgCost)}`}
      onPress={onPress}
      onDelete={onDelete}
      trailing={
        <div className="text-right">
          <div className="text-[13px] tracking-[-0.13px] font-mono tabular-nums">
            ${formatPrice(marketValue)}
          </div>
          <Badge variant={pnl >= 0 ? 'positive' : 'negative'}>
            {formatPercent(pnlPct)}
          </Badge>
        </div>
      }
    />
  );
}

export { PortfolioScreen };
