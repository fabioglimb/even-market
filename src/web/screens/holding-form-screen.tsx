import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from '../hooks/use-store';
import { Input, Select, Button, Card, SettingsGroup, Toast } from 'even-toolkit/web';
import type { AssetType, PortfolioHolding } from '../../state/types';
import { t } from '../../utils/i18n';

const ASSET_TYPE_OPTIONS = [
  { value: 'stock', label: 'Stock' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'forex', label: 'Forex' },
  { value: 'commodity', label: 'Commodity' },
];

function HoldingFormScreen() {
  const dispatch = useDispatch();
  const lang = useSelector((s) => s.settings.language);
  const existingHolding = useSelector((s) => {
    const id = s.selectedHoldingId;
    return id ? s.portfolio.find((h) => h.id === id) ?? null : null;
  });

  const isEditing = !!existingHolding;

  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [geckoId, setGeckoId] = useState('');
  const [errors, setErrors] = useState<{ symbol?: boolean; quantity?: boolean; avgCost?: boolean }>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (existingHolding) {
      setSymbol(existingHolding.symbol);
      setAssetType(existingHolding.assetType);
      setQuantity(String(existingHolding.quantity));
      setAvgCost(String(existingHolding.avgCost));
      setGeckoId(existingHolding.geckoId ?? '');
    }
  }, [existingHolding]);

  function handleSave() {
    const sym = symbol.trim().toUpperCase();
    const qty = parseFloat(quantity);
    const cost = parseFloat(avgCost);

    const nextErrors = {
      symbol: !sym,
      quantity: isNaN(qty) || qty <= 0,
      avgCost: isNaN(cost) || cost <= 0,
    };
    if (nextErrors.symbol || nextErrors.quantity || nextErrors.avgCost) {
      setErrors(nextErrors);
      const key = nextErrors.symbol
        ? 'validation.symbolRequired'
        : nextErrors.quantity
          ? 'validation.quantityPositive'
          : 'validation.costPositive';
      setToast(t(key, lang));
      return;
    }
    setErrors({});

    if (isEditing && existingHolding) {
      const updated: PortfolioHolding = {
        ...existingHolding,
        symbol: sym,
        assetType,
        quantity: qty,
        avgCost: cost,
        geckoId: assetType === 'crypto' ? geckoId.trim().toLowerCase() || undefined : undefined,
        quoteCurrency: assetType === 'crypto' ? 'usd' : undefined,
      };
      dispatch({ type: 'HOLDING_UPDATE', holding: updated });
    } else {
      const newHolding: PortfolioHolding = {
        id: `${sym}-${Date.now()}`,
        symbol: sym,
        assetType,
        quantity: qty,
        avgCost: cost,
        geckoId: assetType === 'crypto' ? geckoId.trim().toLowerCase() || undefined : undefined,
        quoteCurrency: assetType === 'crypto' ? 'usd' : undefined,
        addedAt: Date.now(),
      };
      dispatch({ type: 'HOLDING_ADD', holding: newHolding });
    }
    dispatch({ type: 'NAVIGATE', screen: 'portfolio' });
  }

  function handleCancel() {
    dispatch({ type: 'NAVIGATE', screen: 'portfolio' });
  }

  return (
    <>
      <Card className="mb-3">
        <div className="space-y-3">
          <SettingsGroup label="Symbol">
            <Input
              placeholder="e.g. AAPL or BTC"
              value={symbol}
              error={errors.symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                if (errors.symbol) setErrors((prev) => ({ ...prev, symbol: false }));
              }}
              maxLength={10}
            />
          </SettingsGroup>

          <SettingsGroup label="Asset Type">
            <Select
              options={ASSET_TYPE_OPTIONS}
              value={assetType}
              onValueChange={(v) => setAssetType(v as AssetType)}
            />
          </SettingsGroup>

          {assetType === 'crypto' && (
            <SettingsGroup label="CoinGecko ID">
              <Input
                placeholder="e.g. bitcoin, ethereum"
                value={geckoId}
                onChange={(e) => setGeckoId(e.target.value)}
              />
            </SettingsGroup>
          )}

          <SettingsGroup label="Quantity">
            <Input
              placeholder="0.00"
              type="number"
              value={quantity}
              error={errors.quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: false }));
              }}
            />
          </SettingsGroup>

          <SettingsGroup label="Average Cost ($)">
            <Input
              placeholder="0.00"
              type="number"
              value={avgCost}
              error={errors.avgCost}
              onChange={(e) => {
                setAvgCost(e.target.value);
                if (errors.avgCost) setErrors((prev) => ({ ...prev, avgCost: false }));
              }}
            />
          </SettingsGroup>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={handleSave}>
          {isEditing ? 'Update' : 'Add'} Holding
        </Button>
        <Button variant="ghost" className="flex-1" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px] px-3">
          <Toast message={toast} variant="error" />
        </div>
      )}
    </>
  );
}

export { HoldingFormScreen };
