import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChartResolution, AssetType } from '../../../state/types';
import { Input, Select, Button, InputGroup, SegmentedControl } from 'even-toolkit/web';
import { searchCoins } from '../../../data/coingecko';
import { searchSymbols, detectAssetType } from '../../../data/yahoo-finance';
import type { CoinSearchResult } from '../../../data/coingecko';
import type { YahooSearchResult } from '../../../data/yahoo-finance';

const RES_OPTIONS = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '60', label: '1 hour' },
  { value: 'D', label: 'Daily' },
  { value: 'W', label: 'Weekly' },
  { value: 'M', label: 'Monthly' },
];

const MODE_OPTIONS = [
  { value: 'stock', label: 'Stock / Forex' },
  { value: 'crypto', label: 'Crypto' },
];

interface SearchItem {
  symbol: string;
  name: string;
  detail?: string;
  geckoId?: string;
  assetType?: AssetType;
}

interface TickerInputProps {
  onAdd: (symbol: string, resolution: ChartResolution, assetType?: AssetType, geckoId?: string) => void;
}

function TickerInput({ onAdd }: TickerInputProps) {
  const [symbol, setSymbol] = useState('');
  const [resolution, setResolution] = useState<ChartResolution>('D');
  const [mode, setMode] = useState<'stock' | 'crypto'>('stock');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGeckoId, setSelectedGeckoId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (mode === 'crypto') {
      const results = await searchCoins(query);
      setSearchResults(results.map((c: CoinSearchResult) => ({
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        detail: c.market_cap_rank ? `#${c.market_cap_rank}` : undefined,
        geckoId: c.id,
      })));
    } else {
      const results = await searchSymbols(query);
      setSearchResults(
        results
          .map((r: YahooSearchResult) => {
            const at = detectAssetType(r.symbol, r.typeDisp);
            return {
              symbol: r.symbol,
              name: r.shortname || r.longname || r.symbol,
              detail: at === 'forex' ? 'Forex' : at === 'commodity' ? 'Commodity' : r.typeDisp || r.exchDisp,
              assetType: at,
            };
          })
          .filter((r) => r.assetType !== 'crypto')
      );
    }

    setShowDropdown(true);
  }, [mode]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(symbol), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [symbol, doSearch]);

  const selectedAssetTypeRef = useRef<AssetType>('stock');

  function handleSelect(item: SearchItem) {
    setSymbol(item.symbol);
    setSelectedGeckoId(item.geckoId ?? null);
    selectedAssetTypeRef.current = item.assetType ?? (mode === 'crypto' ? 'crypto' : 'stock');
    setShowDropdown(false);
    setSearchResults([]);
  }

  function handleAdd() {
    const sym = symbol.trim().toUpperCase();
    if (sym) {
      if (mode === 'crypto') {
        onAdd(sym, resolution, 'crypto', selectedGeckoId ?? sym.toLowerCase());
      } else {
        const at = selectedAssetTypeRef.current !== 'crypto' ? selectedAssetTypeRef.current : detectAssetType(sym);
        onAdd(sym, resolution, at);
      }
      setSymbol('');
      setSelectedGeckoId(null);
      selectedAssetTypeRef.current = 'stock';
    }
  }

  return (
    <div className="space-y-3">
      <SegmentedControl
        options={MODE_OPTIONS}
        value={mode}
        onValueChange={(v) => {
          setMode(v as 'stock' | 'crypto');
          setSymbol('');
          setSearchResults([]);
          setShowDropdown(false);
          setSelectedGeckoId(null);
        }}
        className="w-full"
      />
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            placeholder={mode === 'crypto' ? 'Search coin (e.g. bitcoin)' : 'Search (e.g. AAPL, EURUSD)'}
            maxLength={30}
            value={symbol}
            className="w-full"
            onChange={(e) => {
              setSymbol(e.target.value);
              setSelectedGeckoId(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          />
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 rounded-[6px] bg-surface shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((item, i) => (
                <button
                  key={`${item.symbol}-${i}`}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-bg transition-colors flex items-center gap-3 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                >
                  <span className="text-[13px] tracking-[-0.13px] font-normal text-text shrink-0">{item.symbol}</span>
                  <span className="text-[11px] tracking-[-0.11px] text-text-dim flex-1 truncate">{item.name}</span>
                  {item.detail && (
                    <span className="text-[11px] tracking-[-0.11px] text-text-dim shrink-0">{item.detail}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <InputGroup>
          <Select
            options={RES_OPTIONS}
            value={resolution}
            onValueChange={(v) => setResolution(v as ChartResolution)}
            className="w-24"
          />
          <Button size="sm" onClick={handleAdd}>Add</Button>
        </InputGroup>
      </div>
    </div>
  );
}

export { TickerInput };
