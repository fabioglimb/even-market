import { useState } from 'react';
import { useEffect } from 'react';
import { useQuotes } from '../hooks/use-quotes';
import { useGraphics } from '../hooks/use-graphics';
import { useSettings } from '../hooks/use-settings';
import { useSelector, useDispatch } from '../hooks/use-store';
import { ListItem, Badge, CategoryFilter, Dialog, FileUpload, Button, Select } from 'even-toolkit/web';
import { TickerInput } from '../components/shared/ticker-input';
import { formatPercent, formatResolutionShort, displaySymbol } from '../../utils/format';
import { useCurrency } from '../hooks/use-currency';
import { t } from '../../utils/i18n';
import type { AssetType } from '../../state/types';
import { parseWatchlistImportFile } from '../lib/import-market-file';
import { exportWatchlistFile, type MarketExportFormat } from '../lib/export-market-file';

const FILTER_OPTIONS = ['All', 'Stock', 'Crypto', 'Forex', 'Commodity'];

const FILTER_MAP: Record<string, 'all' | AssetType> = {
  All: 'all',
  Stock: 'stock',
  Crypto: 'crypto',
  Forex: 'forex',
  Commodity: 'commodity',
};

const FILTER_REVERSE: Record<string, string> = {
  all: 'All',
  stock: 'Stock',
  crypto: 'Crypto',
  forex: 'Forex',
  commodity: 'Commodity',
};

function WatchlistScreen({ importTrigger, exportTrigger }: { importTrigger?: number; exportTrigger?: number }) {
  const dispatch = useDispatch();
  const quotes = useQuotes();
  const graphics = useGraphics();
  const settings = useSettings();
  const lang = settings.language;
  const currency = useCurrency();
  const filter = useSelector((s) => s.watchlistFilter);
  const favoriteSymbols = useSelector((s) => s.favoriteSymbols);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<MarketExportFormat>('csv');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const filteredGraphics = filter === 'all'
    ? graphics
    : graphics.filter((g) => (g.assetType ?? 'stock') === filter);

  useEffect(() => {
    if (importTrigger && importTrigger > 0) {
      setShowImport(true);
      setImportError(null);
    }
  }, [importTrigger]);

  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) {
      setShowExport(true);
      setImportError(null);
    }
  }, [exportTrigger]);

  async function handleImport(files: File[]) {
    const file = files[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportNotice(null);

    try {
      const result = await parseWatchlistImportFile(file);
      result.items.forEach((item) => {
        dispatch({
          type: 'GRAPHIC_ADD',
          symbol: item.symbol,
          resolution: item.resolution,
          assetType: item.assetType,
          geckoId: item.geckoId,
          quoteCurrency: item.quoteCurrency,
        });
      });

      setImportNotice(
        result.imported > 0
          ? `Imported ${result.imported} symbol${result.imported === 1 ? '' : 's'}${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.`
          : `No symbols imported${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.`,
      );
      setShowImport(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import file.');
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    if (graphics.length === 0) {
      setImportError('No symbols to export.');
      setImportNotice(null);
      setShowExport(false);
      return;
    }

    // Must stay synchronous until navigator.share() — no async/await
    exportWatchlistFile(graphics, exportFormat)
      .then(({ filename, action }) => {
        setImportNotice(
          `${action === 'shared' ? 'Shared' : 'Exported'} ${graphics.length} symbol${graphics.length === 1 ? '' : 's'} ${action === 'shared' ? 'via share sheet' : 'to'} ${filename}.`,
        );
        setImportError(null);
        setShowExport(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setImportError(error instanceof Error ? error.message : 'Failed to export watchlist.');
        setImportNotice(null);
      });
  }

  return (
    <>
      <TickerInput
        onAdd={(symbol, resolution, assetType, geckoId) =>
          dispatch({ type: 'GRAPHIC_ADD', symbol, resolution, assetType, geckoId, quoteCurrency: assetType === 'crypto' ? 'usd' : undefined })
        }
      />

      {(importNotice || importError) && (
        <div className={`mt-3 rounded-[6px] px-4 py-3 text-[13px] tracking-[-0.13px] ${importError ? 'bg-negative-alpha text-negative' : 'bg-surface text-text-dim'}`}>
          {importError ?? importNotice}
        </div>
      )}

      {/* Category filter */}
      <div className="mt-3">
        <CategoryFilter
          categories={FILTER_OPTIONS}
          selected={FILTER_REVERSE[filter] ?? 'All'}
          onSelect={(cat) => dispatch({ type: 'WATCHLIST_FILTER', filter: FILTER_MAP[cat] ?? 'all' })}
        />
      </div>

      {/* Watchlist — swipe to delete */}
      <div className="mt-3 rounded-[6px] overflow-hidden bg-surface">
        {/* Header */}
        <div className="flex items-center px-4 py-3 bg-surface-light/50 text-[13px] tracking-[-0.13px] text-text-dim">
          <span className="flex-1">Symbol</span>
          <span className="w-12 text-center">TF</span>
          <span className="w-20 text-right">Price</span>
          <span className="w-20 text-right">Change</span>
        </div>
        {/* Rows */}
        {filteredGraphics.map((graphic) => {
          const quote = quotes[graphic.symbol];
          const isUp = quote ? quote.changePercent >= 0 : true;
          return (
            <ListItem
              key={graphic.id}
              title={displaySymbol(graphic.symbol)}
              subtitle={graphic.assetType ?? 'stock'}
              leading={
                <button type="button" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_FAVORITE', symbol: graphic.symbol }); }} className="text-[17px] cursor-pointer">
                  {favoriteSymbols.includes(graphic.symbol) ? '★' : '☆'}
                </button>
              }
              onPress={() => dispatch({ type: 'SELECT_GRAPHIC', graphicId: graphic.id })}
              onDelete={() => dispatch({ type: 'GRAPHIC_REMOVE', graphicId: graphic.id })}
              trailing={
                <div className="flex items-center">
                  <span className="w-12 text-center text-[13px] tracking-[-0.13px] text-text-dim">
                    {formatResolutionShort(graphic.resolution)}
                  </span>
                  <span className="w-20 text-right font-mono tabular-nums text-[13px] tracking-[-0.13px]">
                    {quote ? currency.format(quote.price, graphic.assetType) : '--'}
                  </span>
                  <span className="w-20 text-right">
                    <Badge variant={isUp ? 'positive' : 'negative'}>
                      {quote ? formatPercent(quote.changePercent) : '--'}
                    </Badge>
                  </span>
                </div>
              }
            />
          );
        })}
        {filteredGraphics.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] tracking-[-0.13px] text-text-dim">
            {filter === 'all'
              ? 'No stocks added. Use the input above to add symbols.'
              : `No ${filter} assets in watchlist.`}
          </div>
        )}
      </div>

      <Dialog open={showImport} onClose={() => !importing && setShowImport(false)} title="Import Watchlist">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] tracking-[-0.13px] text-text-dim leading-relaxed">
            Import `.txt`, `.csv`, or `.xlsx` files. Supported columns: `symbol`, optional `resolution`, `assetType`, `geckoId`, and `quoteCurrency`.
          </p>
          <FileUpload
            accept=".txt,.csv,.xlsx,.xls,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            label={importing ? 'Importing...' : 'Drop a symbol file or tap to browse'}
            onFiles={(files) => {
              if (!importing) void handleImport(files);
            }}
          />
          <p className="text-[11px] tracking-[-0.11px] text-text-muted leading-relaxed">
            TXT example: one symbol per line. CSV/XLSX example: `symbol,resolution,assetType`.
          </p>
          {importError && (
            <div className="rounded-[6px] bg-negative-alpha px-3 py-2 text-[11px] tracking-[-0.11px] text-negative">
              {importError}
            </div>
          )}
        </div>
      </Dialog>

      <Dialog open={showExport} onClose={() => setShowExport(false)} title="Export Watchlist">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] tracking-[-0.13px] text-text-dim leading-relaxed">
            Export the full watchlist as `.txt`, `.csv`, or `.xlsx`. The file includes `symbol`, `resolution`, `assetType`, `geckoId`, and `quoteCurrency`.
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Format</span>
            <Select
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as MarketExportFormat)}
              options={[
                { value: 'csv', label: 'CSV (.csv)' },
                { value: 'xlsx', label: 'Excel (.xlsx)' },
                { value: 'txt', label: 'Text (.txt)' },
              ]}
            />
          </div>
          <div className="flex gap-3 mt-1.5">
            <Button variant="ghost" className="flex-1" onClick={() => setShowExport(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleExport}>Export</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export { WatchlistScreen };
