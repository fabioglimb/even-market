import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from '../hooks/use-store';
import { ListItem, Badge, EmptyState, Button, Card, Dialog, Input, Select } from 'even-toolkit/web';
import { IcFeatNotification } from 'even-toolkit/web/icons/svg-icons';
import { formatPrice } from '../../utils/format';
import type { AssetType, PriceAlert } from '../../state/types';

const CONDITION_OPTIONS = [
  { value: 'above', label: 'Price Above' },
  { value: 'below', label: 'Price Below' },
];

const ASSET_TYPE_OPTIONS = [
  { value: 'stock', label: 'Stock' },
  { value: 'crypto', label: 'Crypto' },
];

function AlertsScreen({ addTrigger }: { addTrigger?: number }) {
  const dispatch = useDispatch();
  const alerts = useSelector((s) => s.alerts);
  const [showForm, setShowForm] = useState(false);

  // Open form when navbar + button is pressed
  useEffect(() => {
    if (addTrigger && addTrigger > 0) setShowForm(true);
  }, [addTrigger]);
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stock');

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  function handleAdd() {
    const sym = symbol.trim().toUpperCase();
    const price = parseFloat(targetPrice);
    if (!sym || isNaN(price) || price <= 0) return;

    const alert: PriceAlert = {
      id: `${sym}-${condition}-${price}-${Date.now()}`,
      symbol: sym,
      assetType,
      condition,
      targetPrice: price,
      triggered: false,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ALERT_ADD', alert });
    setSymbol('');
    setTargetPrice('');
    setShowForm(false);
  }

  function handleDelete(alertId: string) {
    dispatch({ type: 'ALERT_REMOVE', alertId });
  }

  return (
    <>
      {/* New alert dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="New Alert">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Symbol</span>
            <Input placeholder="e.g. AAPL or BTC" value={symbol} onChange={(e) => setSymbol(e.target.value)} maxLength={10} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Asset Type</span>
            <Select options={ASSET_TYPE_OPTIONS} value={assetType} onValueChange={(v) => setAssetType(v as AssetType)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Condition</span>
            <Select options={CONDITION_OPTIONS} value={condition} onValueChange={(v) => setCondition(v as 'above' | 'below')} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Target Price ($)</span>
            <Input placeholder="0.00" type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
          </div>
          <div className="flex gap-3 mt-1.5">
            <Button className="flex-1" onClick={handleAdd}>Create</Button>
            <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      {/* Active alerts */}
      <div className="rounded-[6px] overflow-hidden bg-surface mb-3">
        {activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
          <EmptyState icon={<IcFeatNotification width={32} height={32} />} title="No alerts" description="Create a price alert to get notified when a target is hit." />
        ) : (
          <>
            {activeAlerts.length > 0 && (
              <div className="px-4 py-2 text-[11px] tracking-[-0.11px] text-text-dim">Active</div>
            )}
            {activeAlerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} onDelete={() => handleDelete(alert.id)} />
            ))}
          </>
        )}
      </div>

      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="rounded-[6px] overflow-hidden bg-surface">
          <div className="px-4 py-2 text-[11px] tracking-[-0.11px] text-text-dim">Triggered</div>
          {triggeredAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} onDelete={() => handleDelete(alert.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function AlertRow({ alert, onDelete }: { alert: PriceAlert; onDelete: () => void }) {
  return (
    <ListItem
      title={alert.symbol}
      subtitle={`${alert.condition === 'above' ? 'Above' : 'Below'} $${formatPrice(alert.targetPrice)}`}
      onDelete={onDelete}
      trailing={
        <Badge variant={alert.triggered ? 'positive' : 'neutral'}>
          {alert.triggered ? 'Triggered' : 'Active'}
        </Badge>
      }
    />
  );
}

export { AlertsScreen };
