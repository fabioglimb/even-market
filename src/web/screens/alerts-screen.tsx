import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from '../hooks/use-store';
import { useGraphics } from '../hooks/use-graphics';
import { ListItem, Badge, EmptyState, Button, Dialog, Input, Select, Toast } from 'even-toolkit/web';
import { IcFeatNotification } from 'even-toolkit/web/icons/svg-icons';
import { isUnreadTriggeredAlert, sortAlertsForDisplay } from '../../state/alert-utils';
import { displaySymbol, formatPrice } from '../../utils/format';
import { t } from '../../utils/i18n';
import type { AssetType, PriceAlert } from '../../state/types';

const CONDITION_OPTIONS = [
  { value: 'above', label: 'Price Above' },
  { value: 'below', label: 'Price Below' },
];

function AlertsScreen({ addTrigger }: { addTrigger?: number }) {
  const dispatch = useDispatch();
  const lang = useSelector((s) => s.settings.language);
  const alerts = useSelector((s) => s.alerts);
  const graphics = useGraphics();
  const [showForm, setShowForm] = useState(false);

  // Open form when navbar + button is pressed
  useEffect(() => {
    if (addTrigger && addTrigger > 0) {
      setSymbol(symbolOptions[0]?.value ?? '');
      setTargetPrice('');
      setCondition('above');
      setSymbolError(false);
      setPriceError(false);
      setShowForm(true);
    }
  }, [addTrigger]);
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [symbolError, setSymbolError] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const symbolOptions = graphics.map((g) => ({
    value: g.id,
    label: `${displaySymbol(g.symbol)} · ${g.assetType ?? 'stock'}`,
  }));

  const sortedAlerts = sortAlertsForDisplay(alerts);
  const activeAlerts = sortedAlerts.filter((a) => !a.triggered);
  const unreadTriggeredAlerts = sortedAlerts.filter(isUnreadTriggeredAlert);
  const seenTriggeredAlerts = sortedAlerts.filter((a) => a.triggered && !isUnreadTriggeredAlert(a));

  function handleAdd() {
    const graphic = graphics.find((g) => g.id === symbol);
    const sym = graphic?.symbol?.trim().toUpperCase() ?? '';
    const price = parseFloat(targetPrice);

    const symInvalid = !sym;
    const priceInvalid = isNaN(price) || price <= 0;
    if (symInvalid || priceInvalid) {
      setSymbolError(symInvalid);
      setPriceError(priceInvalid);
      setToast(t(symInvalid ? 'validation.symbolSelect' : 'validation.pricePositive', lang));
      return;
    }
    setSymbolError(false);
    setPriceError(false);

    const alert: PriceAlert = {
      id: `${sym}-${condition}-${price}-${Date.now()}`,
      symbol: sym,
      assetType: (graphic?.assetType ?? 'stock') as AssetType,
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
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Symbol (from watchlist)</span>
            <Select
              options={symbolOptions.length > 0 ? symbolOptions : [{ value: '', label: 'Add symbols to watchlist first' }]}
              value={symbol}
              error={symbolError}
              onValueChange={(v) => {
                setSymbol(v);
                if (symbolError) setSymbolError(false);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Condition</span>
            <Select options={CONDITION_OPTIONS} value={condition} onValueChange={(v) => setCondition(v as 'above' | 'below')} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Target Price ($)</span>
            <Input
              placeholder="0.00"
              type="number"
              value={targetPrice}
              error={priceError}
              onChange={(e) => {
                setTargetPrice(e.target.value);
                if (priceError) setPriceError(false);
              }}
            />
          </div>
          <div className="flex gap-3 mt-1.5">
            <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAdd}>Create</Button>
          </div>
        </div>
      </Dialog>

      {/* Active alerts */}
      <div className="rounded-[6px] overflow-hidden bg-surface mb-3">
        {activeAlerts.length === 0 && unreadTriggeredAlerts.length === 0 && seenTriggeredAlerts.length === 0 ? (
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
      {unreadTriggeredAlerts.length > 0 && (
        <div className="rounded-[6px] overflow-hidden bg-surface">
          <div className="px-4 py-2 text-[11px] tracking-[-0.11px] text-text-dim">Newly Triggered</div>
          {unreadTriggeredAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} onDelete={() => handleDelete(alert.id)} />
          ))}
        </div>
      )}

      {seenTriggeredAlerts.length > 0 && (
        <div className="rounded-[6px] overflow-hidden bg-surface mt-3">
          <div className="px-4 py-2 text-[11px] tracking-[-0.11px] text-text-dim">Triggered</div>
          {seenTriggeredAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} onDelete={() => handleDelete(alert.id)} />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-[420px] px-3">
          <Toast message={toast} variant="error" />
        </div>
      )}
    </>
  );
}

function AlertRow({ alert, onDelete }: { alert: PriceAlert; onDelete: () => void }) {
  const isUnread = isUnreadTriggeredAlert(alert);
  return (
    <ListItem
      title={alert.symbol}
      subtitle={`${alert.condition === 'above' ? 'Above' : 'Below'} $${formatPrice(alert.targetPrice)}`}
      onDelete={onDelete}
      trailing={
        <Badge variant={isUnread ? 'accent' : alert.triggered ? 'positive' : 'neutral'}>
          {isUnread ? 'New' : alert.triggered ? 'Triggered' : 'Active'}
        </Badge>
      }
    />
  );
}

export { AlertsScreen };
