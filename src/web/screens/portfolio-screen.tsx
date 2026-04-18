import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from '../hooks/use-store';
import { useQuotes } from '../hooks/use-quotes';
import { useGraphics } from '../hooks/use-graphics';
import { ListItem, Badge, EmptyState, Button, Card, Dialog, Input, Select, ConfirmDialog, PieChart, FileUpload, CategoryFilter } from 'even-toolkit/web';
import { IcEditChecklist } from 'even-toolkit/web/icons/svg-icons';
import { formatPercent, displaySymbol } from '../../utils/format';
import { useCurrency } from '../hooks/use-currency';
import { PortfolioLineChart } from '../components/shared/portfolio-line-chart';
import { fetchPortfolioHistory, type PortfolioPeriod, type PortfolioValuePoint } from '../../data/portfolio-history';
import type { PortfolioHolding, AssetType } from '../../state/types';
import { parsePortfolioImportFile } from '../lib/import-market-file';
import { exportPortfolioFile, type MarketExportFormat } from '../lib/export-market-file';

function PortfolioScreen({ addTrigger, importTrigger, exportTrigger }: { addTrigger?: number; importTrigger?: number; exportTrigger?: number }) {
  const dispatch = useDispatch();
  const portfolio = useSelector((s) => s.portfolio);
  const quotes = useQuotes();
  const graphics = useGraphics();
  const currency = useCurrency();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<MarketExportFormat>('csv');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<PortfolioPeriod>('1M');
  const [chartData, setChartData] = useState<PortfolioValuePoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const fxRates = useSelector((s) => s.fxRates);

  // Fetch portfolio history when period or portfolio changes
  useEffect(() => {
    if (portfolio.length === 0) { setChartData([]); return; }
    let cancelled = false;
    setChartLoading(true);
    fetchPortfolioHistory(portfolio, chartPeriod, currency.displayCurrency, fxRates)
      .then((data) => { if (!cancelled) setChartData(data); })
      .catch(() => { if (!cancelled) setChartData([]); })
      .finally(() => { if (!cancelled) setChartLoading(false); });
    return () => { cancelled = true; };
  }, [chartPeriod, portfolio.length, currency.displayCurrency]);

  // Open form when navbar + button is pressed
  useEffect(() => {
    if (addTrigger && addTrigger > 0) handleOpenForm();
  }, [addTrigger]);

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

  // Form state
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');

  const totalValue = portfolio.reduce((sum, h) => {
    const q = quotes[h.symbol];
    const price = q ? currency.convert(q.price, h.assetType) : currency.convert(h.avgCost, h.assetType);
    return sum + price * h.quantity;
  }, 0);

  const totalCost = portfolio.reduce((sum, h) => sum + currency.convert(h.avgCost, h.assetType) * h.quantity, 0);
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

  async function handleImport(files: File[]) {
    const file = files[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportNotice(null);

    try {
      const result = await parsePortfolioImportFile(file);
      result.items.forEach((holding) => {
        dispatch({ type: 'HOLDING_ADD', holding });
      });

      setImportNotice(
        result.imported > 0
          ? `Imported ${result.imported} holding${result.imported === 1 ? '' : 's'}${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.`
          : `No holdings imported${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.`,
      );
      setShowImport(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import file.');
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    if (portfolio.length === 0) {
      setImportError('No holdings to export.');
      setImportNotice(null);
      setShowExport(false);
      return;
    }

    // Must stay synchronous until navigator.share() — no async/await
    exportPortfolioFile(portfolio, exportFormat)
      .then(({ filename, action }) => {
        setImportNotice(
          `${action === 'shared' ? 'Shared' : 'Exported'} ${portfolio.length} holding${portfolio.length === 1 ? '' : 's'} ${action === 'shared' ? 'via share sheet' : 'to'} ${filename}.`,
        );
        setImportError(null);
        setShowExport(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setImportError(error instanceof Error ? error.message : 'Failed to export portfolio.');
        setImportNotice(null);
      });
  }

  return (
    <>
      {(importNotice || importError) && (
        <div className={`mb-3 rounded-[6px] px-4 py-3 text-[13px] tracking-[-0.13px] ${importError ? 'bg-negative-alpha text-negative' : 'bg-surface text-text-dim'}`}>
          {importError ?? importNotice}
        </div>
      )}

      {/* Summary card */}
      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[-0.11px] text-text-dim">Total Value</div>
            <div className="text-[20px] tracking-[-0.6px] font-normal font-mono tabular-nums">
              {currency.format(totalValue)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] tracking-[-0.11px] text-text-dim">P&L</div>
            <Badge variant={totalPnl >= 0 ? 'positive' : 'negative'}>
              {totalPnl >= 0 ? '+' : ''}{currency.format(totalPnl)} ({formatPercent(totalPnlPct)})
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

      {/* Portfolio chart */}
      {portfolio.length > 0 && (
        <Card className="mb-3">
          <div className="mb-3">
            <CategoryFilter
              categories={['1D', '1W', '1M', '1Y']}
              selected={chartPeriod}
              onSelect={(p) => setChartPeriod(p as PortfolioPeriod)}
            />
          </div>
          <PortfolioLineChart
            data={chartData}
            loading={chartLoading}
            currency={currency.displayCurrency}
          />
        </Card>
      )}

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
              currency={currency}
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
            <span className="text-[11px] tracking-[-0.11px] text-text-dim">Average Cost ({currency.symbol.trim()})</span>
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

      <Dialog open={showImport} onClose={() => !importing && setShowImport(false)} title="Import Portfolio">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] tracking-[-0.13px] text-text-dim leading-relaxed">
            Import `.txt`, `.csv`, or `.xlsx` files. Required columns: `symbol`, `quantity`, and `avgCost`.
          </p>
          <FileUpload
            accept=".txt,.csv,.xlsx,.xls,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            label={importing ? 'Importing...' : 'Drop a portfolio file or tap to browse'}
            onFiles={(files) => {
              if (!importing) void handleImport(files);
            }}
          />
          <p className="text-[11px] tracking-[-0.11px] text-text-muted leading-relaxed">
            CSV/XLSX example: `symbol,quantity,avgCost,assetType`. Crypto rows can also include `geckoId`.
          </p>
          {importError && (
            <div className="rounded-[6px] bg-negative-alpha px-3 py-2 text-[11px] tracking-[-0.11px] text-negative">
              {importError}
            </div>
          )}
        </div>
      </Dialog>

      <Dialog open={showExport} onClose={() => setShowExport(false)} title="Export Portfolio">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] tracking-[-0.13px] text-text-dim leading-relaxed">
            Export the full portfolio as `.txt`, `.csv`, or `.xlsx`. The file includes `symbol`, `quantity`, `avgCost`, `assetType`, `geckoId`, and `quoteCurrency`.
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
  currency: ReturnType<typeof useCurrency>;
  onPress: () => void;
  onDelete: () => void;
}

function HoldingRow({ holding, quote, currency, onPress, onDelete }: HoldingRowProps) {
  const currentPrice = currency.convert(quote?.price ?? holding.avgCost, holding.assetType);
  const costConverted = currency.convert(holding.avgCost, holding.assetType);
  const marketValue = currentPrice * holding.quantity;
  const pnl = (currentPrice - costConverted) * holding.quantity;
  const pnlPct = costConverted > 0 ? ((currentPrice - costConverted) / costConverted) * 100 : 0;

  return (
    <ListItem
      title={displaySymbol(holding.symbol)}
      subtitle={`${holding.quantity} @ ${currency.format(costConverted)}`}
      onPress={onPress}
      onDelete={onDelete}
      trailing={
        <div className="text-right">
          <div className="text-[13px] tracking-[-0.13px] font-mono tabular-nums">
            {currency.format(marketValue)}
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
