import { searchCoins } from '../../data/coingecko';
import { detectAssetType } from '../../data/yahoo-finance';
import type { AssetType, ChartResolution, GraphicEntry, PortfolioHolding } from '../../state/types';

type Row = string[];

interface ImportParseResult<T> {
  items: T[];
  imported: number;
  skipped: number;
}

const WATCHLIST_HEADER_ALIASES = {
  symbol: ['symbol', 'ticker', 'asset', 'code'],
  resolution: ['resolution', 'timeframe', 'tf', 'interval'],
  assetType: ['assettype', 'type', 'kind', 'markettype'],
  geckoId: ['geckoid', 'coingeckoid', 'coinid', 'coin'],
  quoteCurrency: ['quotecurrency', 'currency', 'quote', 'vscurrency'],
} as const;

const PORTFOLIO_HEADER_ALIASES = {
  symbol: ['symbol', 'ticker', 'asset', 'code'],
  quantity: ['quantity', 'qty', 'shares', 'amount', 'units'],
  avgCost: ['avgcost', 'averagecost', 'costbasis', 'cost', 'avgprice', 'price', 'entryprice'],
  assetType: ['assettype', 'type', 'kind', 'markettype'],
  geckoId: ['geckoid', 'coingeckoid', 'coinid', 'coin'],
  quoteCurrency: ['quotecurrency', 'currency', 'quote', 'vscurrency'],
} as const;

const DEFAULT_CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeHeader(value: unknown): string {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeSymbol(value: unknown): string {
  return normalizeText(value).replace(/^\$/, '').toUpperCase();
}

function normalizeResolution(value: unknown): ChartResolution | undefined {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return undefined;

  switch (normalized) {
    case '1':
    case '1m':
    case '1min':
    case '1minute':
      return '1';
    case '5':
    case '5m':
    case '5min':
    case '5minute':
      return '5';
    case '15':
    case '15m':
    case '15min':
    case '15minute':
      return '15';
    case '60':
    case '60m':
    case '1h':
    case '1hr':
    case '1hour':
      return '60';
    case 'd':
    case '1d':
    case 'day':
    case 'daily':
      return 'D';
    case 'w':
    case '1w':
    case 'week':
    case 'weekly':
      return 'W';
    case 'm':
    case '1mo':
    case 'month':
    case 'monthly':
      return 'M';
    default:
      return undefined;
  }
}

function normalizeAssetType(value: unknown): AssetType | undefined {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return undefined;

  if (normalized === 'stock' || normalized === 'stocks' || normalized === 'equity') return 'stock';
  if (normalized === 'crypto' || normalized === 'cryptocurrency' || normalized === 'coin') return 'crypto';
  if (normalized === 'forex' || normalized === 'fx' || normalized === 'currency') return 'forex';
  if (normalized === 'commodity' || normalized === 'commodities' || normalized === 'metal') return 'commodity';
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  const normalized = normalizeText(value).replace(/,/g, '');
  if (!normalized) return undefined;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Split one delimited line (CSV/TSV/semicolon), honoring double-quoted fields. */
function parseDelimitedLine(rawLine: string): string[] {
  const line = rawLine.replace(/\r$/, '');
  if (!line.trim()) return [];
  const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

async function readRows(file: File): Promise<Row[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    throw new Error('Excel files are not supported — please export as CSV.');
  }
  const text = await file.text();
  return text
    .split(/\r?\n/)
    .map(parseDelimitedLine)
    .filter((row) => row.some(Boolean))
    .filter((row) => normalizeHeader(row[0]) !== 'sep');
}

function getHeaderIndex<T extends Record<string, readonly string[]>>(row: Row, aliases: T): Partial<Record<keyof T, number>> | null {
  const normalized = row.map(normalizeHeader);
  const result: Partial<Record<keyof T, number>> = {};
  let matchCount = 0;

  (Object.keys(aliases) as Array<keyof T>).forEach((key) => {
    const idx = normalized.findIndex((cell) => aliases[key].includes(cell));
    if (idx >= 0) {
      result[key] = idx;
      matchCount += 1;
    }
  });

  return matchCount > 0 ? result : null;
}

function getCell(row: Row, idx: number | undefined): string {
  if (idx == null || idx < 0) return '';
  return normalizeText(row[idx] ?? '');
}

async function resolveCryptoMeta(symbol: string, rawGeckoId?: string, rawQuoteCurrency?: string) {
  const geckoId = normalizeText(rawGeckoId).toLowerCase() || DEFAULT_CRYPTO_IDS[symbol] || '';
  const quoteCurrency = normalizeText(rawQuoteCurrency).toLowerCase() || 'usd';

  if (geckoId) {
    return { geckoId, quoteCurrency };
  }

  // Best-effort lookup: a search failure here should not abort the import.
  const results = await searchCoins(symbol).catch(() => []);
  const exact = results.find((item) => item.symbol.toUpperCase() === symbol) ?? results[0];
  return {
    geckoId: exact?.id ?? symbol.toLowerCase(),
    quoteCurrency,
  };
}

export async function parseWatchlistImportFile(file: File): Promise<ImportParseResult<GraphicEntry>> {
  const rows = await readRows(file);
  if (rows.length === 0) return { items: [], imported: 0, skipped: 0 };

  const headerIndex = getHeaderIndex(rows[0] ?? [], WATCHLIST_HEADER_ALIASES);
  const dataRows = headerIndex ? rows.slice(1) : rows;
  const parsed: Array<Omit<GraphicEntry, 'id'>> = [];
  let skipped = 0;

  for (const row of dataRows) {
    const symbol = normalizeSymbol(getCell(row, headerIndex?.symbol ?? 0));
    if (!symbol) {
      skipped += 1;
      continue;
    }

    const resolution = normalizeResolution(getCell(row, headerIndex?.resolution ?? 1)) ?? 'D';
    const inferredAssetType = normalizeAssetType(getCell(row, headerIndex?.assetType ?? 2)) ?? detectAssetType(symbol);

    parsed.push({
      symbol,
      resolution,
      assetType: inferredAssetType,
      geckoId: getCell(row, headerIndex?.geckoId ?? 3) || undefined,
      quoteCurrency: getCell(row, headerIndex?.quoteCurrency ?? 4) || undefined,
    });
  }

  const resolved = await Promise.all(parsed.map(async (entry) => {
    if (entry.assetType !== 'crypto') {
      return { ...entry, quoteCurrency: undefined };
    }

    const cryptoMeta = await resolveCryptoMeta(entry.symbol, entry.geckoId, entry.quoteCurrency);
    return {
      ...entry,
      geckoId: cryptoMeta.geckoId,
      quoteCurrency: cryptoMeta.quoteCurrency,
    };
  }));

  const seen = new Set<string>();
  const items: GraphicEntry[] = [];

  for (const entry of resolved) {
    const id = `${entry.symbol}:${entry.resolution}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ id, ...entry });
  }

  return {
    items,
    imported: items.length,
    skipped,
  };
}

export async function parsePortfolioImportFile(file: File): Promise<ImportParseResult<PortfolioHolding>> {
  const rows = await readRows(file);
  if (rows.length === 0) return { items: [], imported: 0, skipped: 0 };

  const headerIndex = getHeaderIndex(rows[0] ?? [], PORTFOLIO_HEADER_ALIASES);
  const dataRows = headerIndex ? rows.slice(1) : rows;
  const parsed: Array<Omit<PortfolioHolding, 'id' | 'addedAt'>> = [];
  let skipped = 0;

  for (const row of dataRows) {
    const symbol = normalizeSymbol(getCell(row, headerIndex?.symbol ?? 0));
    const quantity = parseNumber(getCell(row, headerIndex?.quantity ?? 1));
    const avgCost = parseNumber(getCell(row, headerIndex?.avgCost ?? 2));
    if (!symbol || quantity == null || quantity <= 0 || avgCost == null || avgCost <= 0) {
      skipped += 1;
      continue;
    }

    const assetType = normalizeAssetType(getCell(row, headerIndex?.assetType ?? 3)) ?? detectAssetType(symbol);
    parsed.push({
      symbol,
      assetType,
      quantity,
      avgCost,
      geckoId: getCell(row, headerIndex?.geckoId ?? 4) || undefined,
      quoteCurrency: getCell(row, headerIndex?.quoteCurrency ?? 5) || undefined,
    });
  }

  const now = Date.now();
  const items = await Promise.all(parsed.map(async (entry, index) => {
    if (entry.assetType !== 'crypto') {
      return {
        ...entry,
        id: `${entry.symbol}-${now}-${index}`,
        addedAt: now + index,
        quoteCurrency: undefined,
      };
    }

    const cryptoMeta = await resolveCryptoMeta(entry.symbol, entry.geckoId, entry.quoteCurrency);
    return {
      ...entry,
      id: `${entry.symbol}-${now}-${index}`,
      addedAt: now + index,
      geckoId: cryptoMeta.geckoId,
      quoteCurrency: cryptoMeta.quoteCurrency,
    };
  }));

  return {
    items,
    imported: items.length,
    skipped,
  };
}
