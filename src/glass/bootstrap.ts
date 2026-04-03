import { EvenHubBridge } from 'even-toolkit/bridge';
import type { PageMode } from 'even-toolkit/types';
import { notifyTextUpdate } from 'even-toolkit/gestures';
import { encodeTilesBatch, resetTileCache } from 'even-toolkit/png-utils';
import { IMAGE_TILES, G2_IMAGE_MAX_W, G2_IMAGE_MAX_H, CHART_CANVAS_W, CHART_CANVAS_H, VIEWPORT_PER_RESOLUTION } from 'even-toolkit/layout';
import { activateKeepAlive } from 'even-toolkit/keep-alive';
import { buildActionBar } from 'even-toolkit/action-bar';
import { buildScrollableContent, buildScrollableList, DEFAULT_CONTENT_SLOTS, slidingWindowStart } from 'even-toolkit/glass-display-builders';
import { truncate } from 'even-toolkit/text-utils';
import type { DisplayData } from 'even-toolkit/types';
import { marketSplash } from './splash';
import { createStore } from '../state/store';
import type { AppState, GraphicEntry, ChartResolution, PriceAlert } from '../state/types';
import { makeGraphicId } from '../state/types';
import { getDisplayData } from '../state/selectors';
import { getLatestTriggeredAlert, getUnreadTriggeredAlertCount, isUnreadTriggeredAlert, sortAlertsForDisplay } from '../state/alert-utils';
import { filterNewsItems } from '../state/news-utils';
import { mapEvenHubEvent } from '../input/action-map';
import { renderToCanvasDirect, drawCandlesInto, getCanvas, resetViewport, getViewportStart } from './canvas-renderer';
import { formatPrice, formatPercent, formatVolume, formatResolutionShort, formatCandleTime } from '../utils/format';
import { t, MARKET_LANGUAGES, getLanguageName } from '../utils/i18n';
import type { MarketLanguage } from '../utils/i18n';
import { Poller } from '../data/poller';
import { fetchNewsArticleContent } from '../data/news';
import { storageSet, storageGet } from '../data/bridge-storage';

type PageLayout = PageMode;

// ── Splash candle persistence ──

const SPLASH_CANDLES_KEY = 'even-market-splash-candles';

function saveSplashCandles(candles: { open: number; high: number; low: number; close: number; volume: number }[]): void {
  try {
    const slice = candles.slice(-16).map((c) => ({
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
    }));
    storageSet(SPLASH_CANDLES_KEY, slice);
  } catch { /* ignore */ }
}

let hub: EvenHubBridge | null = null;
let store: ReturnType<typeof createStore>;
let poller: Poller;
let flashTimer: ReturnType<typeof setInterval> | null = null;
let glassAlertToastActive = false;
const GLASSES_NEWS_WIDTH = 44;
const GLASS_ALERT_COL_WIDTH = 12;
const GLASS_ALERT_CONTENT_ROWS = 4;
const GLASS_ALERT_FRAME_ROW = '■'.repeat(9);

function buildWideHeader(title: string, time: string, width = GLASSES_NEWS_WIDTH): string {
  const gap = Math.max(1, width - title.length - time.length);
  return `${title}${' '.repeat(gap)}${time}`;
}

function renderDisplayData(data: DisplayData): string {
  return data.lines.map((line) => {
    if (line.style === 'separator') return '\u2500'.repeat(28);
    if (line.inverted) return `\u25B6 ${line.text}`;
    return `  ${line.text}`;
  }).join('\n');
}

// ── Layout management ──

function getDesiredLayout(state: AppState): PageLayout {
  if (state.screen === 'splash') return 'splash';
  if (state.screen === 'home') return 'home' as PageLayout;
  if (state.screen === 'stock-detail') return 'chart';
  if (state.screen === 'watchlist' || state.screen === 'portfolio' || state.screen === 'overview') return 'columns';
  return 'text';
}

function getColumnLayoutContent(state: AppState): string[] | null {
  switch (state.screen) {
    case 'watchlist': {
      const cols = buildWatchlistColumns(state);
      return [cols.sym, cols.price, cols.pct];
    }
    case 'portfolio': {
      const cols = buildPortfolioColumns(state);
      return [cols.labels, cols.values, cols.detail];
    }
    case 'overview': {
      const cols = buildOverviewColumns(state);
      return [cols.labels, cols.values, cols.detail];
    }
    default:
      return null;
  }
}

async function ensureLayout(state: AppState): Promise<void> {
  if (!hub || !hub.pageReady) return;
  const desired = getDesiredLayout(state);
  if (hub.currentLayout === desired) return;
  if (desired === 'splash') return;

  if (state.screen === 'home') {
    // Only use the first tile (logo) for home — "Loading..." tile is splash-only
    const tiles = marketSplash.getTiles();
    const t = tiles[0];
    const imageTiles = t ? [{ id: t.id, name: t.name, x: t.x, y: t.y, w: t.w, h: t.h }] : undefined;
    await hub.switchToHomeLayout(buildHomeText(state), imageTiles);
  } else if (desired === 'chart') {
    await hub.switchToChartLayout(buildChartTopText(state));
  } else if (desired === 'columns') {
    const columns = getColumnLayoutContent(state);
    if (columns) await hub.showColumnPage(columns);
  } else if (state.screen === 'settings') {
    await hub.switchToSettings(buildFullText(state));
  } else {
    await hub.showTextPage(buildFullText(state));
  }
}

// ── Text updates (instant) ──

let textInFlight = false;
let textPending = false;

async function flushText(state: AppState): Promise<void> {
  if (!hub || !hub.pageReady) return;
  if (state.screen === 'splash') return;
  if (glassAlertToastActive) return;

  if (textInFlight) { textPending = true; return; }
  textInFlight = true;
  try {
    const desired = getDesiredLayout(state);
    if (hub.currentLayout !== desired && desired !== 'splash') {
      await ensureLayout(state);
    }

    notifyTextUpdate();

    let updatePromise: Promise<void>;
    if (state.screen === 'home') {
      updatePromise = hub.updateHomeText(buildHomeText(state));
    } else if (hub.currentLayout === 'chart') {
      updatePromise = hub.updateChartText(buildChartTopText(state));
    } else if (hub.currentLayout === 'columns') {
      const columns = getColumnLayoutContent(state);
      updatePromise = columns ? hub.updateColumns(columns) : hub.updateText(buildFullText(state));
    } else if (state.screen === 'settings') {
      updatePromise = hub.updateSettings(buildFullText(state));
    } else {
      updatePromise = hub.updateText(buildFullText(state));
    }

    updatePromise.catch(() => { }).finally(() => {
      textInFlight = false;
      if (textPending) {
        textPending = false;
        flushText(store.getState()).catch(() => { });
      }
    });
  } catch {
    textInFlight = false;
  }
}

// ── Image updates (throttled, chart layout only) ──

let imgBusy = false;
let imgDirty = false;
const IMG_INTERVAL = 80;
const tileHashes = new Map<number, number>();
let prevHighlightTile = -1;

/** Which tile index (0,1,2) does a candle pixel position fall in? */
function candleToTile(candleIdx: number, totalCandles: number, viewportSize: number): number {
  const canvasW = 576;
  const vp = Math.min(totalCandles, viewportSize);
  if (vp <= 0) return 0;
  const candleW = Math.floor((canvasW - 12) / vp);
  const px = 6 + candleIdx * candleW + candleW / 2;
  if (px < 200) return 0;
  if (px < 400) return 1;
  return 2;
}

async function flushImages(state: AppState, prev?: AppState): Promise<void> {
  if (!hub || !hub.pageReady || (hub.currentLayout !== 'chart' && hub.currentLayout !== 'home')) return;
  if (state.screen === 'splash') return;
  if (glassAlertToastActive) return;
  if (imgBusy) { imgDirty = true; return; }

  imgBusy = true;
  imgDirty = false;
  try {
    // Home screen: send only the first tile (logo) — home layout has 1 image container
    if (state.screen === 'home') {
      const tile = marketSplash.getTiles()[0];
      if (tile) await hub.sendImage(tile.id, tile.name, tile.bytes);
      imgBusy = false;
      return;
    }

    const data = getDisplayData(state);
    if (!data.chartData || data.chartData.candles.length === 0) return;

    const canvas = renderToCanvasDirect(data);

    // Determine which tiles to encode
    const fullRedraw = !prev || prev.candles !== state.candles ||
      prev.settings !== state.settings || prev.selectedGraphicId !== state.selectedGraphicId ||
      prev.screen !== state.screen;

    let tilesToEncode: number[];
    if (fullRedraw) {
      tilesToEncode = [0, 1, 2];
    } else {
      // Only encode tiles affected by highlight movement
      const vp = (data.resolution && VIEWPORT_PER_RESOLUTION[data.resolution]) || 40;
      const dirtyTiles = new Set<number>();
      if (state.highlightedCandleIndex >= 0) {
        const localIdx = state.highlightedCandleIndex - (getViewportStart() >= 0 ? getViewportStart() : 0);
        dirtyTiles.add(candleToTile(localIdx, data.chartData.candles.length, vp));
      }
      if (prevHighlightTile >= 0) dirtyTiles.add(prevHighlightTile);
      tilesToEncode = dirtyTiles.size > 0 ? [...dirtyTiles] : [0, 1, 2];
    }

    // Encode only dirty tiles
    for (const i of tilesToEncode) {
      const tile = IMAGE_TILES[i]!;
      const enc = encodeTilesBatch(canvas, [tile], G2_IMAGE_MAX_W, G2_IMAGE_MAX_H)[0]!;
      if (tileHashes.get(tile.id) === enc.hash) continue;
      tileHashes.set(tile.id, enc.hash);
      await hub.sendImage(tile.id, tile.name, enc.bytes);
      if (textPending) break;
    }

    // Track highlight tile for next diff
    if (state.highlightedCandleIndex >= 0 && data.chartData) {
      const vp = (data.resolution && VIEWPORT_PER_RESOLUTION[data.resolution]) || 40;
      const localIdx = state.highlightedCandleIndex - (getViewportStart() >= 0 ? getViewportStart() : 0);
      prevHighlightTile = candleToTile(localIdx, data.chartData.candles.length, vp);
    } else {
      prevHighlightTile = -1;
    }
  } catch { /* skip */ }
  finally {
    imgBusy = false;
    if (imgDirty) {
      setTimeout(() => {
        imgDirty = false;
        flushImages(store.getState()).catch(() => { });
      }, IMG_INTERVAL);
    }
  }
}

// ── Combined flush ──

function flushDisplay(state: AppState, prev?: AppState): void {
  if (glassAlertToastActive) return;
  flushText(state).catch(() => { });
  const layout = getDesiredLayout(state);
  if (layout === 'chart' || layout === 'home') {
    if (prev && (
      prev.screen !== state.screen ||
      prev.candles !== state.candles ||
      prev.selectedGraphicId !== state.selectedGraphicId ||
      prev.settings !== state.settings
    )) {
      tileHashes.clear();
      resetViewport();
    }
    flushImages(state, prev).catch(() => { });
  }
}

function needsImageUpdate(state: AppState, prev: AppState): boolean {
  if (state.screen !== prev.screen) return true;
  if (state.quotes !== prev.quotes) return true;
  if (state.candles !== prev.candles) return true;
  if (state.selectedGraphicId !== prev.selectedGraphicId) return true;
  if (state.settings !== prev.settings) return true;
  return false;
}

// ── Text builders ──

function padR(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function padL(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s;
}

function truncateText(value: string, max = 28): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}\u2026`;
}

function wrapTextLines(value: string, width = 28): string[] {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function applyInlineScrollIndicators(lines: string[], start: number, totalCount: number, visibleCount: number): string[] {
  if (lines.length === 0) return lines;
  const next = [...lines];
  if (start > 0) next[0] = '  \u25B2';
  if (start + visibleCount < totalCount) next[next.length - 1] = '  \u25BC';
  return next;
}

function alertColumnLine(text = ''): string {
  return truncate(text, GLASS_ALERT_COL_WIDTH);
}

function centeredText(text: string, width: number): string {
  const trimmed = truncate(text, width);
  const leftPad = Math.max(0, Math.floor((width - trimmed.length) / 2));
  const rightPad = Math.max(0, width - trimmed.length - leftPad);
  return `${' '.repeat(leftPad)}${trimmed}${' '.repeat(rightPad)}`;
}

function formatAlertToastTime(timestamp?: number): string {
  if (!timestamp) return 'NOW';
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildAlertColumn(lines: string[]): string {
  const content = lines.map((line) => alertColumnLine(line));
  while (content.length < GLASS_ALERT_CONTENT_ROWS) content.push('');
  return [
    centeredText(GLASS_ALERT_FRAME_ROW, GLASS_ALERT_COL_WIDTH),
    ...content.slice(0, GLASS_ALERT_CONTENT_ROWS),
    centeredText(GLASS_ALERT_FRAME_ROW, GLASS_ALERT_COL_WIDTH),
  ].join('\n');
}

function buildGlassAlertToastColumns(alert: PriceAlert): string[] {
  const symbol = truncate(alert.symbol.toUpperCase(), GLASS_ALERT_COL_WIDTH);
  const symbolHeader = truncate(`• [${symbol}]`, GLASS_ALERT_COL_WIDTH);
  const direction = alert.condition === 'above' ? '▲ ABOVE' : '▼ UNDER';
  const targetLine = `$${formatPrice(alert.targetPrice)}`;
  const timeLine = formatAlertToastTime(alert.triggeredAt);

  const left = buildAlertColumn([
    '• [PRICE]',
    '• CLICK',
    '  DISMISS',
  ]);

  const middle = buildAlertColumn([
    symbolHeader,
    `• ${direction}`,
    `  ${targetLine}`,
  ]);

  const right = buildAlertColumn([
    '• [ TIME ]',
    '• HIT AT',
    `  ${timeLine}`,
  ]);

  return [left, middle, right];
}

function dismissGlassAlertToast(): void {
  if (!glassAlertToastActive) return;
  glassAlertToastActive = false;
  flushDisplay(store.getState());
}

function showTransientGlassAlertToast(alert: PriceAlert): void {
  if (!hub || !hub.pageReady || !alert.triggeredAt) return;
  glassAlertToastActive = true;
  void hub.showColumnPage(buildGlassAlertToastColumns(alert));
}

function buildPortfolioText(state: AppState, time: string): string {
  const holdings = state.portfolio;
  if (holdings.length === 0) {
    return renderDisplayData(buildScrollableContent({
      title: 'Portfolio',
      actionBar: time,
      contentLines: ['No holdings yet', '', 'Add holdings from web'],
      scrollPos: 0,
    }));
  }

  const totalValue = holdings.reduce((sum, h) => {
    const q = state.quotes[h.symbol];
    return sum + (q ? q.price * h.quantity : h.avgCost * h.quantity);
  }, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.avgCost * h.quantity, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const list = buildScrollableList({
    items: holdings,
    highlightedIndex: Math.min(state.highlightedIndex, holdings.length - 1),
    maxVisible: DEFAULT_CONTENT_SLOTS,
    formatter: (holding) => {
      const quote = state.quotes[holding.symbol];
      const marketValue = (quote?.price ?? holding.avgCost) * holding.quantity;
      const pct = holding.avgCost > 0 ? (((quote?.price ?? holding.avgCost) - holding.avgCost) / holding.avgCost) * 100 : 0;
      return truncate(`${holding.symbol} ${holding.quantity}u $${formatPrice(marketValue)} ${formatPercent(pct)}`, 54);
    },
  });
  return renderDisplayData({
    lines: [
      { text: `Portfolio $${formatPrice(totalValue)}`, style: 'normal', inverted: false },
      { text: `${totalPnl >= 0 ? '+' : ''}${formatPrice(totalPnl)} ${formatPercent(totalPnlPct)}`, style: 'meta', inverted: false },
      ...list,
    ],
  });
}

function buildPortfolioColumns(state: AppState): { labels: string; values: string; detail: string } {
  const holdings = state.portfolio;
  const totalValue = holdings.reduce((sum, h) => {
    const q = state.quotes[h.symbol];
    return sum + (q ? q.price * h.quantity : h.avgCost * h.quantity);
  }, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.avgCost * h.quantity, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const labelLines: string[] = ['P&L'];
  const valueLines: string[] = [`${totalPnl >= 0 ? '+' : ''}${formatPrice(totalPnl)}`];
  const detailLines: string[] = [`${formatPercent(totalPnlPct)}`];

  if (holdings.length === 0) {
    labelLines.push('', 'No holdings');
    valueLines.push('', '');
    detailLines.push('', 'Add from web');
    return {
      labels: labelLines.join('\n'),
      values: valueLines.join('\n'),
      detail: detailLines.join('\n'),
    };
  }

  const maxVisible = 5;
  const hi = Math.min(state.highlightedIndex, holdings.length - 1);
  const winStart = slidingWindowStart(hi, holdings.length, maxVisible);
  const winEnd = Math.min(holdings.length, winStart + maxVisible);

  labelLines.push(winStart > 0 ? '  \u25B2' : '');
  valueLines.push('');
  detailLines.push('');

  for (let i = winStart; i < winEnd; i++) {
    const holding = holdings[i]!;
    const quote = state.quotes[holding.symbol];
    const marketValue = (quote?.price ?? holding.avgCost) * holding.quantity;
    const pct = holding.avgCost > 0 ? (((quote?.price ?? holding.avgCost) - holding.avgCost) / holding.avgCost) * 100 : 0;
    labelLines.push(`${i === hi ? '\u25B6 ' : '  '}${truncateText(holding.symbol, 8)}`);
    valueLines.push(`$${truncateText(formatPrice(marketValue), 9)}`);
    detailLines.push(`${holding.quantity}u ${formatPercent(pct)}`);
  }

  if (winEnd < holdings.length) {
    labelLines.push('  \u25BC');
    valueLines.push('');
    detailLines.push('');
  }

  return {
    labels: labelLines.join('\n'),
    values: valueLines.join('\n'),
    detail: detailLines.join('\n'),
  };
}

function buildHoldingDetailText(state: AppState, time: string): string {
  const holding = state.selectedHoldingId
    ? state.portfolio.find((item) => item.id === state.selectedHoldingId) ?? null
    : null;
  if (!holding) return `Holding${' '.repeat(20)}${time}\n\nNo holding selected`;

  const quote = state.quotes[holding.symbol];
  const currentPrice = quote?.price ?? holding.avgCost;
  const marketValue = currentPrice * holding.quantity;
  const costBasis = holding.avgCost * holding.quantity;
  const pnl = marketValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  return [
    `${holding.symbol}${' '.repeat(Math.max(1, 28 - holding.symbol.length - time.length))}${time}`,
    `${holding.assetType.toUpperCase()}`,
    '',
    `Price  $${formatPrice(currentPrice)}`,
    `Qty    ${holding.quantity}`,
    `Avg    $${formatPrice(holding.avgCost)}`,
    `Value  $${formatPrice(marketValue)}`,
    `PnL    ${pnl >= 0 ? '+' : ''}${formatPrice(pnl)} ${formatPercent(pnlPct)}`,
    quote ? `Range  $${formatPrice(quote.low)}-$${formatPrice(quote.high)}` : '',
    quote ? `Vol    ${formatVolume(quote.volume)}` : '',
  ].join('\n');
}

function buildAlertsText(state: AppState, time: string): string {
  const alerts = sortAlertsForDisplay(state.alerts);
  if (alerts.length === 0) {
    return renderDisplayData(buildScrollableContent({
      title: 'Alerts',
      actionBar: time,
      contentLines: ['No alerts', '', 'Create alerts from web'],
      scrollPos: 0,
    }));
  }
  const list = buildScrollableList({
    items: alerts,
    highlightedIndex: Math.min(state.highlightedIndex, alerts.length - 1),
    maxVisible: DEFAULT_CONTENT_SLOTS,
    formatter: (alert) => {
      const condition = alert.condition === 'above' ? '>' : '<';
      const status = isUnreadTriggeredAlert(alert) ? ' new' : alert.triggered ? ' hit' : '';
      return truncate(`${alert.symbol} ${condition} $${formatPrice(alert.targetPrice)}${status}`, 54);
    },
  });
  return renderDisplayData({ lines: [{ text: `Alerts  ${time}`, style: 'normal', inverted: false }, { text: '', style: 'separator', inverted: false }, ...list] });
}

function buildOverviewText(state: AppState, time: string): string {
  const activeQuotes = state.settings.graphics
    .map((graphic) => state.quotes[graphic.symbol])
    .filter((quote): quote is NonNullable<typeof quote> => !!quote);

  const gainers = activeQuotes.filter((q) => q.changePercent > 0).length;
  const losers = activeQuotes.filter((q) => q.changePercent < 0).length;
  const unchanged = activeQuotes.length - gainers - losers;
  const totalVolume = activeQuotes.reduce((sum, q) => sum + q.volume, 0);
  const best = [...activeQuotes].sort((a, b) => b.changePercent - a.changePercent)[0];
  const worst = [...activeQuotes].sort((a, b) => a.changePercent - b.changePercent)[0];

  const contentLines = [
    `Watchlist ${state.settings.graphics.length}`,
    `Gainers   ${gainers}`,
    `Losers    ${losers}`,
    `Flat      ${unchanged}`,
    `Volume    ${formatVolume(totalVolume)}`,
    `Holdings  ${state.portfolio.length}`,
    '',
    best ? `Best      ${best.symbol} ${formatPercent(best.changePercent)}` : 'Best      --',
    worst ? `Worst     ${worst.symbol} ${formatPercent(worst.changePercent)}` : 'Worst     --',
  ];
  return renderDisplayData(buildScrollableContent({
    title: 'Overview',
    actionBar: time,
    contentLines,
    scrollPos: state.highlightedIndex,
  }));
}

function buildOverviewColumns(state: AppState): { labels: string; values: string; detail: string } {
  const activeQuotes = state.settings.graphics
    .map((graphic) => state.quotes[graphic.symbol])
    .filter((quote): quote is NonNullable<typeof quote> => !!quote);

  const gainers = activeQuotes.filter((q) => q.changePercent > 0).length;
  const losers = activeQuotes.filter((q) => q.changePercent < 0).length;
  const unchanged = activeQuotes.length - gainers - losers;
  const totalVolume = activeQuotes.reduce((sum, q) => sum + q.volume, 0);
  const best = [...activeQuotes].sort((a, b) => b.changePercent - a.changePercent)[0];
  const worst = [...activeQuotes].sort((a, b) => a.changePercent - b.changePercent)[0];
  const portfolioValue = state.portfolio.reduce((sum, h) => {
    const q = state.quotes[h.symbol];
    return sum + (q ? q.price * h.quantity : h.avgCost * h.quantity);
  }, 0);

  const labels = [
    'Watchlist',
    'Gainers',
    'Losers',
    'Flat',
    'Volume',
    'Holdings',
  ].join('\n');

  const values = [
    `${state.settings.graphics.length}`,
    `${gainers}`,
    `${losers}`,
    `${unchanged}`,
    `${formatVolume(totalVolume)}`,
    `${state.portfolio.length}`,
  ].join('\n');

  const detail = [
    'Best',
    best ? `${best.symbol} ${formatPercent(best.changePercent)}` : '--',
    '',
    'Worst',
    worst ? `${worst.symbol} ${formatPercent(worst.changePercent)}` : '--',
    '',
    'Portfolio',
    state.portfolio.length > 0 ? `$${formatPrice(portfolioValue)}` : '--',
  ].join('\n');

  return { labels, values, detail };
}

function buildNewsText(state: AppState, time: string): string {
  const items = filterNewsItems(state.news, state.newsFilter);
  if (items.length === 0) {
    return renderDisplayData(buildScrollableContent({
      title: 'News',
      actionBar: time,
      contentLines: state.news.length === 0 ? ['Loading news...'] : ['No news for this filter'],
      scrollPos: 0,
    }));
  }
  const list = buildScrollableList({
    items,
    highlightedIndex: Math.min(state.highlightedIndex, items.length - 1),
    maxVisible: DEFAULT_CONTENT_SLOTS,
    formatter: (item) => {
      const meta = item.category === 'crypto' ? 'Crypto' : item.category === 'stocks' ? 'Market' : 'News';
      return truncate(`[${meta}] ${item.title}`, 54);
    },
  });
  return renderDisplayData({ lines: [{ text: `News  ${time}`, style: 'normal', inverted: false }, { text: '', style: 'separator', inverted: false }, ...list] });
}

function buildNewsDetailText(state: AppState, time: string): string {
  const item = state.selectedNewsId
    ? state.news.find((news) => news.id === state.selectedNewsId) ?? null
    : null;
  if (!item) {
    return renderDisplayData(buildScrollableContent({
      title: 'Article',
      actionBar: time,
      contentLines: ['No article selected'],
      scrollPos: 0,
    }));
  }
  const articleBody = state.selectedNewsLoading
    ? 'Loading article...'
    : (state.selectedNewsContent ?? item.description ?? item.url);
  const contentLines = [
    `${item.source} · ${item.publishedAt}`,
    item.category.toUpperCase(),
    '',
    ...wrapTextLines(articleBody, 54),
    '',
    ...wrapTextLines(item.url.replace(/^https?:\/\//, ''), 54),
  ];
  return renderDisplayData(buildScrollableContent({
    title: truncate(item.title, 28),
    actionBar: time,
    contentLines,
    scrollPos: state.highlightedIndex,
    contentStyle: 'normal',
  }));
}

function buildWatchlistText(state: AppState, time: string): string {
  const lines: string[] = [`Watchlist${' '.repeat(18)}${time}`, '\u2500'.repeat(28)];
  const items = state.settings.graphics;
  if (items.length === 0) {
    lines.push('No symbols added');
    return lines.join('\n');
  }

  const maxVisible = DEFAULT_CONTENT_SLOTS;
  const hi = Math.min(state.highlightedIndex, items.length - 1);
  const winStart = slidingWindowStart(hi, items.length, maxVisible);
  const winEnd = Math.min(items.length, winStart + maxVisible);
  if (winStart > 0) lines.push('  \u25B2');
  for (let i = winStart; i < winEnd; i++) {
    const graphic = items[i]!;
    const quote = state.quotes[graphic.symbol];
    const value = quote ? `$${formatPrice(quote.price)} ${formatPercent(quote.changePercent)}` : 'Loading';
    lines.push(`${i === hi ? '\u25B6 ' : '  '}${truncateText(`${graphic.symbol} ${formatResolutionShort(graphic.resolution)} ${value}`, 28)}`);
  }
  if (winEnd < items.length) lines.push('  \u25BC');
  return lines.join('\n');
}

/** Home screen text (below chart image tiles): ER Market + menu buttons. */
function buildHomeText(state: AppState): string {
  const lang = state.settings.language;
  const hi = state.highlightedIndex;
  const unreadAlerts = getUnreadTriggeredAlertCount(state.alerts);
  const items = [
    t('home.watchlist', lang),
    'Portfolio',
    'Overview',
    unreadAlerts > 0 ? `Alerts (${unreadAlerts})` : 'Alerts',
    'News',
    t('home.settings', lang),
  ];

  return renderDisplayData({
    lines: buildScrollableList({
      items,
      highlightedIndex: hi,
      maxVisible: 6,
      formatter: (label) => truncate(label, 54),
    }),
  });
}

/** Build 3 column strings for the watchlist (symbol, price, percent). */
function buildWatchlistColumns(state: AppState): { sym: string; price: string; pct: string } {
  const lang = state.settings.language;
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hi = state.highlightedIndex;
  const totalItems = state.settings.graphics.length;

  const MAX_VISIBLE = 5;

  // Sliding window
  const winStart = slidingWindowStart(hi, totalItems, MAX_VISIBLE);
  const winEnd = Math.min(totalItems, winStart + MAX_VISIBLE);

  // Column 1: title + cursor + symbol
  const symLines: string[] = [];
  symLines.push(t('watchlist.symbol', lang));
  symLines.push(winStart > 0 ? '  \u25B2' : '');
  for (let i = winStart; i < winEnd; i++) {
    const g = state.settings.graphics[i]!;
    const res = formatResolutionShort(g.resolution);
    const cursor = i === hi ? '\u25B6 ' : '  ';
    symLines.push(`${cursor}${g.symbol} ${res}`);
  }
  while (symLines.length < 2 + MAX_VISIBLE) symLines.push('');
  symLines.push(winEnd < totalItems ? '  \u25BC' : '');

  // Column 2: title + price
  const priceLines: string[] = [];
  priceLines.push(t('watchlist.price', lang));
  priceLines.push(''); // up arrow row
  for (let i = winStart; i < winEnd; i++) {
    const g = state.settings.graphics[i]!;
    const q = state.quotes[g.symbol];
    priceLines.push(q ? formatPrice(q.price) : '---.--');
  }
  while (priceLines.length < 2 + MAX_VISIBLE) priceLines.push('');
  priceLines.push(''); // down arrow row

  // Column 3: title + percent
  const pctLines: string[] = [];
  pctLines.push(t('watchlist.change', lang));
  pctLines.push(''); // up arrow row
  for (let i = winStart; i < winEnd; i++) {
    const g = state.settings.graphics[i]!;
    const q = state.quotes[g.symbol];
    pctLines.push(q ? formatPercent(q.changePercent) : '--.--');
  }
  while (pctLines.length < 2 + MAX_VISIBLE) pctLines.push('');
  pctLines.push(''); // down arrow row

  return {
    sym: symLines.join('\n'),
    price: priceLines.join('\n'),
    pct: pctLines.join('\n'),
  };
}

/** Full-screen text for settings/splash. */
function buildFullText(state: AppState): string {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  switch (state.screen) {
    case 'splash':
      return '';

    case 'watchlist': {
      return buildWatchlistText(state, time);
    }

    case 'portfolio':
      return buildPortfolioText(state, time);

    case 'holding-detail':
      return buildHoldingDetailText(state, time);

    case 'alerts':
      return buildAlertsText(state, time);

    case 'overview':
      return buildOverviewText(state, time);

    case 'news':
      return buildNewsText(state, time);

    case 'news-detail':
      return buildNewsDetailText(state, time);

    case 'settings': {
      const lang = state.settings.language;
      const s = state.settings;
      const hi = state.highlightedIndex;
      const editing = state.settingsEditActive;
      const lines: string[] = [];
      const buildSettingRow = (rowIndex: number, label: string, value: string, gap = 10) => {
        const prefix = hi === rowIndex ? '\u25B6 ' : '  ';
        const valueText = editing && hi === rowIndex
          ? `\u25C0 [${value}] \u25B6`
          : value;
        return `${prefix}${padR(label, gap)} ${valueText}`;
      };

      lines.push(`${t('settings.title', lang)}${' '.repeat(19)}${time}`);
      lines.push('');

      // Refresh row
      const refreshLabel = `${s.refreshInterval}s`;
      lines.push(buildSettingRow(0, t('settings.refresh', lang), refreshLabel));

      // Chart type row
      const chartLabel = s.chartType === 'sparkline' ? t('settings.sparkline', lang) : t('settings.candles', lang);
      lines.push(buildSettingRow(1, t('settings.chart', lang), chartLabel));

      // Language row
      const langName = getLanguageName(s.language);
      lines.push(buildSettingRow(2, t('settings.language', lang), langName));

      return lines.join('\n');
    }

    default:
      return `${time}\nER Market`;
  }
}

/** Text below chart: header + scrollable candle table. */
function buildChartTopText(state: AppState): string {
  const lang = state.settings.language;
  const g = state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
  if (!g) return t('chart.noGraphic', lang);
  const q = state.quotes[g.symbol];
  if (!q) return `${g.symbol}  ${t('chart.loading', lang)}`;

  const res = formatResolutionShort(g.resolution);
  const inBtnMode = !state.candleNavActive && !state.tfNavActive;
  const activeLabel = state.tfNavActive ? res : state.candleNavActive ? t('chart.nav', lang) : null;
  const selectedIdx = inBtnMode ? state.highlightedIndex : 0;
  const btnBar = buildActionBar([res, t('chart.nav', lang)], selectedIdx, activeLabel, state.candleFlashPhase);

  const lines: string[] = [];

  // Row 1: symbol, price, change, buttons
  lines.push(`${g.symbol} $${formatPrice(q.price)} ${formatPercent(q.changePercent)}  ${btnBar}`);
  lines.push('\u2500'.repeat(28));

  // Single candle display with ▲/▼ scroll indicators
  const candles = state.candles;
  if (candles.length > 0) {
    const ci = state.highlightedCandleIndex;
    const idx = ci >= 0 ? ci : candles.length - 1;
    const cd = candles[Math.max(0, Math.min(idx, candles.length - 1))]!;

    // ▲ if there are newer candles above
    if (idx < candles.length - 1) {
      lines.push('\u25B2');
    }

    const row1 = `O:${formatPrice(cd.open)}  H:${formatPrice(cd.high)}  L:${formatPrice(cd.low)}  C:${formatPrice(cd.close)}`;
    const row2 = `V:${formatVolume(cd.volume)}  ${formatCandleTime(cd.time, g.resolution)}`;
    lines.push(row1);
    lines.push(row2);

    // ▼ if there are older candles below
    if (idx > 0) {
      lines.push('\u25BC');
    }
  } else {
    lines.push(t('chart.noData', lang));
  }

  return lines.join('\n');
}

// ── State change detection ──

function shouldUpdateDisplay(state: AppState, prev: AppState): boolean {
  if (state.screen !== prev.screen) return true;
  if (state.highlightedIndex !== prev.highlightedIndex) return true;
  if (state.quotes !== prev.quotes) return true;
  if (state.candles !== prev.candles) return true;
  if (state.selectedGraphicId !== prev.selectedGraphicId) return true;
  if (state.candleNavActive !== prev.candleNavActive) return true;
  if (state.highlightedCandleIndex !== prev.highlightedCandleIndex) return true;
  if (state.tfNavActive !== prev.tfNavActive) return true;
  if (state.settingsEditActive !== prev.settingsEditActive) return true;
  if (state.candleFlashPhase !== prev.candleFlashPhase) return true;
  if (state.settings !== prev.settings) return true;
  if (state.portfolio !== prev.portfolio) return true;
  if (state.alerts !== prev.alerts) return true;
  if (state.news !== prev.news) return true;
  if (state.selectedHoldingId !== prev.selectedHoldingId) return true;
  if (state.selectedNewsId !== prev.selectedNewsId) return true;
  if (state.selectedNewsContent !== prev.selectedNewsContent) return true;
  if (state.selectedNewsLoading !== prev.selectedNewsLoading) return true;
  if (state.loading !== prev.loading) return true;
  if (state.lastError !== prev.lastError) return true;
  return false;
}

// ── Side effects ──

function getSelectedGraphic(state: AppState): GraphicEntry | undefined {
  return state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
}

function handleSideEffects(state: AppState, prev: AppState): void {
  if (state.screen === 'stock-detail' && state.selectedGraphicId) {
    const graphic = getSelectedGraphic(state);
    if (graphic) {
      const enteringDetail = state.screen !== prev.screen || state.selectedGraphicId !== prev.selectedGraphicId;
      const resolutionChanged = state.settings !== prev.settings && state.selectedGraphicId;
      if (enteringDetail || resolutionChanged) {
        poller.fetchCandles(graphic.symbol, graphic.resolution);
      }
    }
  }

  const needsFlash = (state.screen === 'stock-detail' && state.tfNavActive)
    || (state.screen === 'settings' && state.settingsEditActive);
  if (needsFlash && !flashTimer) {
    flashTimer = setInterval(() => {
      store.dispatch({ type: 'CANDLE_FLASH_TICK' });
    }, 500);
  } else if (!needsFlash && flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }

  if (state.settings !== prev.settings) {
    storageSet('even-market-settings', state.settings);
  }

  if (state.portfolio !== prev.portfolio) {
    storageSet('even-market:portfolio', state.portfolio);
  }

  if (state.alerts !== prev.alerts) {
    storageSet('even-market:alerts', state.alerts);

    const latest = getLatestTriggeredAlert(state.alerts);
    const prevLatest = getLatestTriggeredAlert(prev.alerts);
    const latestTriggeredAt = latest?.triggeredAt ?? 0;
    const prevTriggeredAt = prevLatest?.triggeredAt ?? 0;
    if (latest && latestTriggeredAt > prevTriggeredAt && state.screen !== 'alerts') {
      showTransientGlassAlertToast(latest);
    }
  }

  if (
    state.screen === 'news-detail' &&
    state.selectedNewsId &&
    state.selectedNewsLoading &&
    (
      state.screen !== prev.screen ||
      state.selectedNewsId !== prev.selectedNewsId ||
      (!prev.selectedNewsLoading && !state.selectedNewsContent)
    )
  ) {
    const currentId = state.selectedNewsId;
    const item = state.news.find((news) => news.id === currentId);
    if (item) {
      void fetchNewsArticleContent(item.url).then((content) => {
        const latest = store.getState();
        if (latest.screen === 'news-detail' && latest.selectedNewsId === currentId) {
          store.dispatch({ type: 'NEWS_ARTICLE_LOADED', newsId: currentId, content });
        }
      });
    } else {
      store.dispatch({ type: 'NEWS_ARTICLE_LOADED', newsId: currentId, content: 'Could not load article.' });
    }
  }

  // Persist candles for splash screen
  if (state.candles !== prev.candles && state.candles.length > 0) {
    saveSplashCandles(state.candles);
  }
}

// ── Setup ──

function mountHiddenCanvas(): void {
  const container = document.getElementById('glasses-canvas');
  if (!container) return;
  const cvs = getCanvas();
  container.appendChild(cvs);
}

function migrateOldSettings(raw: string): Record<string, unknown> {
  const settings = JSON.parse(raw);
  if (settings.watchlist && Array.isArray(settings.watchlist) && settings.watchlist.length > 0
    && typeof settings.watchlist[0] === 'string') {
    const resolution: ChartResolution = settings.chartResolution || 'D';
    settings.graphics = (settings.watchlist as string[]).map((sym: string) => ({
      id: makeGraphicId(sym, resolution),
      symbol: sym,
      resolution,
    }));
    delete settings.watchlist;
    delete settings.chartResolution;
  }
  if ('chartResolution' in settings) delete settings.chartResolution;
  return settings;
}

async function loadSettings(): Promise<void> {
  try {
    const stored = await storageGet<Record<string, unknown> | null>('even-market-settings', null);
    if (stored) {
      const settings = migrateOldSettings(JSON.stringify(stored));
      store.dispatch({ type: 'SETTINGS_LOADED', settings });
      storageSet('even-market-settings', store.getState().settings);
    }
  } catch { /* use defaults */ }

  // Load portfolio + alerts
  try {
    const portfolio = await storageGet<import('../state/types').PortfolioHolding[]>('even-market:portfolio', []);
    if (portfolio.length > 0) store.dispatch({ type: 'PORTFOLIO_LOADED', portfolio });
  } catch { /* ignore */ }

  try {
    const alerts = await storageGet<import('../state/types').PriceAlert[]>('even-market:alerts', []);
    if (alerts.length > 0) store.dispatch({ type: 'ALERTS_LOADED', alerts });
  } catch { /* ignore */ }
}

export function getStore(): ReturnType<typeof createStore> {
  return store;
}

export function getPoller(): Poller {
  return poller;
}

export async function initGlassesRenderer(): Promise<void> {
  mountHiddenCanvas();

  store = createStore();
  poller = new Poller(store);
  await loadSettings();

  const sdkHub = new EvenHubBridge();
  sdkHub.init().then(async () => {
    hub = sdkHub;
    store.dispatch({ type: 'CONNECTION_STATUS', status: 'connected' });

    // Set up home layout with icon tile BEFORE dispatching (avoids race with subscriber)
    const tiles = marketSplash.getTiles();
    const t = tiles[0];
    const imageTiles = t ? [{ id: t.id, name: t.name, x: t.x, y: t.y, w: t.w, h: t.h }] : undefined;
    await hub.showHomePage(buildHomeText(store.getState()), imageTiles);
    if (t) await hub.sendImage(t.id, t.name, t.bytes);

    hub.onEvent((event) => {
      if (glassAlertToastActive) {
        const action = mapEvenHubEvent(event, store.getState());
        if (action?.type === 'SELECT_HIGHLIGHTED') dismissGlassAlertToast();
        return;
      }
      const action = mapEvenHubEvent(event, store.getState());
      if (action) store.dispatch(action);
    });

    // Now dispatch — subscriber won't rebuild since layout is already 'home'
    store.dispatch({ type: 'APP_INIT' });

  }).catch(() => { });

  store.subscribe((state, prev) => {
    if (shouldUpdateDisplay(state, prev)) {
      flushDisplay(state, prev);
    }
    handleSideEffects(state, prev);
  });

  poller.start();
  activateKeepAlive();
}
