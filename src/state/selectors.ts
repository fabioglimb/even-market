import type { AppState } from './types';
import { formatPrice, formatPercent, formatVolume, formatResolutionShort, formatCandleTime } from '../utils/format';

export type LineStyle = 'normal' | 'inverted' | 'separator' | 'meta';

export interface DisplayLine {
  text: string;
  inverted: boolean;
  style: LineStyle;
}

export interface ActionButton {
  label: string;
  highlighted: boolean;
  active: boolean;
}

export interface DisplayData {
  lines: DisplayLine[];
  showSplash?: boolean;
  chartData?: { closes: number[]; candles: import('./types').Candle[] };
  chartType?: 'sparkline' | 'candles';
  resolution?: string;
  highlightedCandleIndex?: number;
  candleFlashPhase?: boolean;
  actionButtons?: ActionButton[];
}

function line(text: string, style: LineStyle = 'normal', inverted = false): DisplayLine {
  return { text, inverted, style };
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;
}

export function getDisplayData(state: AppState): DisplayData {
  switch (state.screen) {
    case 'splash':
      return { lines: [], showSplash: true };
    case 'watchlist':
      return getWatchlistDisplay(state);
    case 'stock-detail':
      return getStockDetailDisplay(state);
    case 'settings':
      return getSettingsDisplay(state);
    default:
      return { lines: [line('Unknown screen', 'normal')] };
  }
}

function getWatchlistDisplay(state: AppState): DisplayData {
  const lines: DisplayLine[] = [];
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const settingsHighlighted = state.highlightedIndex === state.settings.graphics.length;

  const gap = 30 - 7 - time.length;
  const leftGap = Math.floor(gap / 2);
  const rightGap = gap - leftGap;
  lines.push(line(`MARKETS${' '.repeat(leftGap)}${time}${' '.repeat(rightGap)}`, 'normal'));
  lines.push(line('', 'separator'));

  for (let i = 0; i < state.settings.graphics.length; i++) {
    const graphic = state.settings.graphics[i]!;
    const quote = state.quotes[graphic.symbol];
    const isHighlighted = i === state.highlightedIndex;
    const resShort = formatResolutionShort(graphic.resolution);

    let text: string;
    if (quote) {
      const symRes = padRight(`${graphic.symbol} ${resShort}`, 11);
      const price = padLeft(formatPrice(quote.price), 10);
      const pct = padLeft(formatPercent(quote.changePercent), 8);
      text = ` ${symRes}${price}  ${pct}`;
    } else {
      text = ` ${padRight(`${graphic.symbol} ${resShort}`, 11)}    ---.--     --.--`;
    }

    lines.push(line(text, isHighlighted ? 'inverted' : 'normal', isHighlighted));
  }

  const actionButtons: ActionButton[] = [
    { label: 'Settings', highlighted: settingsHighlighted, active: false },
  ];

  return { lines, actionButtons };
}

function getStockDetailDisplay(state: AppState): DisplayData {
  const graphic = state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
  if (!graphic) return { lines: [line('No graphic selected', 'normal')] };

  const sym = graphic.symbol;
  const quote = state.quotes[sym];
  const lines: DisplayLine[] = [];
  const resShort = formatResolutionShort(graphic.resolution);

  // Action buttons — active = mode is entered, highlighted = cursor is on it
  const inButtonMode = !state.candleNavActive && !state.tfNavActive;
  const actionButtons: ActionButton[] = [
    { label: resShort, highlighted: inButtonMode && state.highlightedIndex === 0, active: state.tfNavActive },
    { label: 'NAV', highlighted: inButtonMode && state.highlightedIndex === 1, active: state.candleNavActive },
  ];

  // Determine OHLC source: highlighted candle or quote
  const showCandleData = state.candleNavActive && state.highlightedCandleIndex >= 0
    && state.highlightedCandleIndex < state.candles.length;
  const candle = showCandleData ? state.candles[state.highlightedCandleIndex]! : null;

  if (quote) {
    const pct = formatPercent(quote.changePercent);
    lines.push(line(`${sym} ${resShort}  $${formatPrice(quote.price)}  ${pct}`, 'normal'));
    lines.push(line('', 'separator'));

    if (candle) {
      const dateStr = formatCandleTime(candle.time, graphic.resolution);
      const vol = formatVolume(candle.volume);
      lines.push(line(`O: ${padLeft(formatPrice(candle.open), 8)}  C: ${padLeft(formatPrice(candle.close), 8)}  V: ${vol}`, 'meta'));
      lines.push(line(`H: ${padLeft(formatPrice(candle.high), 8)}  L: ${padLeft(formatPrice(candle.low), 8)}  ${dateStr}`, 'meta'));
    } else {
      const vol = formatVolume(quote.volume);
      const dateStr = quote.timestamp ? formatCandleTime(quote.timestamp) : '';
      lines.push(line(`O: ${padLeft(formatPrice(quote.open), 8)}  C: ${padLeft(formatPrice(quote.price), 8)}  V: ${vol}`, 'meta'));
      lines.push(line(`H: ${padLeft(formatPrice(quote.high), 8)}  L: ${padLeft(formatPrice(quote.low), 8)}  ${dateStr}`, 'meta'));
    }
  } else {
    lines.push(line(`${sym} ${resShort}  Loading...`, 'normal'));
    lines.push(line('', 'separator'));
    lines.push(line('Waiting for data...', 'meta'));
  }

  lines.push(line('', 'separator'));

  return {
    lines,
    chartData: state.candles.length > 0
      ? { closes: state.candles.map((c) => c.close), candles: state.candles }
      : undefined,
    chartType: state.settings.chartType,
    resolution: graphic.resolution,
    highlightedCandleIndex: state.candleNavActive ? state.highlightedCandleIndex : undefined,
    candleFlashPhase: state.candleFlashPhase,
    actionButtons,
  };
}

function getSettingsDisplay(state: AppState): DisplayData {
  const lines: DisplayLine[] = [];
  const s = state.settings;

  lines.push(line('SETTINGS', 'normal'));
  lines.push(line('', 'separator'));

  const items = [
    `Refresh: ${s.refreshInterval}s`,
    `Chart: ${s.chartType === 'sparkline' ? 'Sparkline' : 'Candles'}`,
  ];

  for (let i = 0; i < items.length; i++) {
    const isHighlighted = i === state.highlightedIndex;
    lines.push(line(` ${items[i]}`, isHighlighted ? 'inverted' : 'normal', isHighlighted));
  }

  lines.push(line('', 'separator'));
  lines.push(line(' Tap to cycle value', 'meta'));

  return { lines };
}
