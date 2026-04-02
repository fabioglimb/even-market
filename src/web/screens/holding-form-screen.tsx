import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from '../hooks/use-store';
import { Input, Select, Button, Card, SettingsGroup } from 'even-toolkit/web';
import type { AssetType, PortfolioHolding } from '../../state/types';

const ASSET_TYPE_OPTIONS = [
  { value: 'stock', label: 'Stock' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'forex', label: 'Forex' },
  { value: 'commodity', label: 'Commodity' },
];

function HoldingFormScreen() {
  const dispatch = useDispatch();
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
    if (!sym || isNaN(qty) || qty <= 0 || isNaN(cost) || cost <= 0) return;

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
              onChange={(e) => setSymbol(e.target.value)}
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
              onChange={(e) => setQuantity(e.target.value)}
            />
          </SettingsGroup>

          <SettingsGroup label="Average Cost ($)">
            <Input
              placeholder="0.00"
              type="number"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
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
    </>
  );
}

export { HoldingFormScreen };
