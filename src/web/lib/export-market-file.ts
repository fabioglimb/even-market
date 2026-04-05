import * as XLSX from 'xlsx';
import type { GraphicEntry, PortfolioHolding } from '../../state/types';

export type MarketExportFormat = 'csv' | 'xlsx' | 'txt';
export type MarketExportAction = 'shared' | 'downloaded';

const WATCHLIST_HEADERS = ['symbol', 'resolution', 'assetType', 'geckoId', 'quoteCurrency'] as const;
const PORTFOLIO_HEADERS = ['symbol', 'quantity', 'avgCost', 'assetType', 'geckoId', 'quoteCurrency'] as const;

function buildFilename(prefix: string, format: MarketExportFormat): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}.${format}`;
}

function shareOrDownloadBlob(blob: Blob, filename: string): Promise<MarketExportAction> {
  // navigator.share must be called synchronously from the user gesture call stack.
  // Do NOT insert any await before this call — Safari will block it.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    const canShareFiles =
      typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });

    if (canShareFiles) {
      return navigator.share({ title: filename, files: [file] }).then(() => 'shared' as const);
    }

    return navigator.share({ title: filename, text: `Exported: ${filename}` }).then(() => 'shared' as const);
  }

  // Desktop fallback: trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return Promise.resolve('downloaded');
}

function makeDelimitedText(rows: string[][]): string {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n' });
}

function exportRows(prefix: string, headers: readonly string[], body: string[][], format: MarketExportFormat): Promise<{ filename: string; action: MarketExportAction }> {
  // Everything before navigator.share() must be synchronous to preserve the user gesture.
  const filename = buildFilename(prefix, format);
  const rows = [Array.from(headers), ...body];

  let blob: Blob;
  if (format === 'xlsx') {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    const array = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    blob = new Blob([array], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } else {
    const text = makeDelimitedText(rows);
    blob = new Blob([text], {
      type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8',
    });
  }

  // Call share synchronously from the gesture — no awaits above this point
  return shareOrDownloadBlob(blob, filename).then((action) => ({ filename, action }));
}

export function exportWatchlistFile(graphics: GraphicEntry[], format: MarketExportFormat): Promise<{ filename: string; action: MarketExportAction }> {
  const body = graphics.map((item) => [
    item.symbol,
    item.resolution,
    item.assetType ?? '',
    item.geckoId ?? '',
    item.quoteCurrency ?? '',
  ]);

  return exportRows('even-market-watchlist', WATCHLIST_HEADERS, body, format);
}

export function exportPortfolioFile(portfolio: PortfolioHolding[], format: MarketExportFormat): Promise<{ filename: string; action: MarketExportAction }> {
  const body = portfolio.map((item) => [
    item.symbol,
    String(item.quantity),
    String(item.avgCost),
    item.assetType,
    item.geckoId ?? '',
    item.quoteCurrency ?? '',
  ]);

  return exportRows('even-market-portfolio', PORTFOLIO_HEADERS, body, format);
}
