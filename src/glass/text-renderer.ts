import type { DisplayData, DisplayLine, ActionButton } from '../state/selectors';
import type { Candle } from '../state/types';

// ── Unicode toolkit (confirmed working on G2 hardware) ──
const BOX_H  = '\u2500'; // ─
const BOX_TL = '\u250C'; // ┌
const BOX_TR = '\u2510'; // ┐
const BOX_BL = '\u2514'; // └
const BOX_BR = '\u2518'; // ┘
const BOX_V  = '\u2502'; // │

const TRI_R  = '\u25B6'; // ▶  cursor / highlighted
const TRI_U  = '\u25B2'; // ▲  up
const TRI_D  = '\u25BC'; // ▼  down

// Block elements for sparkline (bottom-aligned, 8 levels)
const SPARK = [
  ' ',       // 0 - empty
  '\u2581',  // 1 - ▁
  '\u2582',  // 2 - ▂
  '\u2583',  // 3 - ▃
  '\u2584',  // 4 - ▄
  '\u2585',  // 5 - ▅
  '\u2586',  // 6 - ▆
  '\u2587',  // 7 - ▇
  '\u2588',  // 8 - █
];

const SHADE_LIGHT = '\u2591'; // ░
const DOT = '\u25CF';         // ●
const CIRCLE = '\u25CB';      // ○
const BULLET = '\u2022';      // •

const COLS = 30;

function sep(): string {
  return BOX_H.repeat(COLS);
}

function padR(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function padL(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s;
}

function renderButtons(buttons: ActionButton[]): string {
  return buttons.map((b) => {
    if (b.active) return `\u00AB${b.label}\u00BB`;  // «label»
    if (b.highlighted) return `[${b.label}]`;
    return ` ${b.label} `;
  }).join(' ');
}

/**
 * Render candle data as a Unicode sparkline using block elements.
 * Returns a single line of COLS characters.
 */
function renderSparkline(candles: Candle[], highlightIdx?: number, flash?: boolean): string {
  if (candles.length === 0) return '';

  // Show last COLS candles
  const view = candles.length <= COLS ? candles : candles.slice(-COLS);
  const offset = candles.length <= COLS ? 0 : candles.length - COLS;

  const min = Math.min(...view.map((c) => c.low));
  const max = Math.max(...view.map((c) => c.high));
  const range = max - min || 1;

  let line = '';
  for (let i = 0; i < view.length; i++) {
    const c = view[i]!;
    const globalIdx = i + offset;
    const isHL = highlightIdx !== undefined && globalIdx === highlightIdx;

    // Map close price to 0-8 level
    const level = Math.round(((c.close - min) / range) * 8);
    const clamped = Math.max(0, Math.min(8, level));

    if (isHL && flash) {
      line += BOX_V; // │ blinking highlight
    } else if (isHL) {
      line += DOT;   // ● highlighted candle
    } else {
      line += SPARK[clamped];
    }
  }

  // Pad to COLS
  while (line.length < COLS) line += ' ';
  return line;
}

/**
 * Render a mini candle chart (2 rows: body + wick indicator)
 */
function renderCandleChart(candles: Candle[], highlightIdx?: number, flash?: boolean): string[] {
  if (candles.length === 0) return [];

  const view = candles.length <= COLS ? candles : candles.slice(-COLS);
  const offset = candles.length <= COLS ? 0 : candles.length - COLS;

  const min = Math.min(...view.map((c) => c.low));
  const max = Math.max(...view.map((c) => c.high));
  const range = max - min || 1;

  let bodyRow = '';
  let wickRow = '';

  for (let i = 0; i < view.length; i++) {
    const c = view[i]!;
    const globalIdx = i + offset;
    const isHL = highlightIdx !== undefined && globalIdx === highlightIdx;
    const isUp = c.close >= c.open;

    // Body: block height based on |open - close|
    const bodySize = Math.abs(c.close - c.open) / range;
    const bodyLevel = Math.max(1, Math.round(bodySize * 8));

    // Wick: relative position
    const wickSize = (c.high - c.low) / range;
    const wickLevel = Math.max(1, Math.round(wickSize * 4));

    if (isHL && flash) {
      bodyRow += '\u2503'; // ┃
      wickRow += '\u2503';
    } else if (isHL) {
      bodyRow += DOT;
      wickRow += BOX_V;
    } else if (isUp) {
      bodyRow += SPARK[Math.min(8, bodyLevel)];
      wickRow += wickLevel >= 3 ? SHADE_LIGHT : ' ';
    } else {
      bodyRow += SPARK[Math.min(4, bodyLevel)]; // shorter for down candles
      wickRow += wickLevel >= 3 ? SHADE_LIGHT : ' ';
    }
  }

  while (bodyRow.length < COLS) bodyRow += ' ';
  while (wickRow.length < COLS) wickRow += ' ';

  return [bodyRow, wickRow];
}

/**
 * Main render: convert DisplayData → text string for glasses.
 */
export function renderToText(data: DisplayData): string {
  if (data.showSplash) {
    return [
      '',
      '    ' + SPARK[2] + SPARK[5] + SPARK[3] + SPARK[7] + SPARK[4] + SPARK[8] + SPARK[6] + SPARK[8],
      '',
      '     EvenMarket',
      '',
      '     Loading...',
    ].join('\n');
  }

  const parts: string[] = [];

  // Action buttons
  const btnStr = data.actionButtons && data.actionButtons.length > 0
    ? renderButtons(data.actionButtons)
    : '';

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i]!;

    if (line.style === 'separator') {
      parts.push(sep());
      continue;
    }

    let text = line.text;

    // Append buttons to first content line
    if (i === 0 && btnStr) {
      const gap = Math.max(1, COLS - text.length - btnStr.length);
      text = text + ' '.repeat(gap) + btnStr;
    }

    if (line.inverted) {
      parts.push(`${TRI_R} ${text.trim()}`);
    } else {
      parts.push(text);
    }
  }

  // Chart
  if (data.chartData && data.chartData.candles.length > 0) {
    if (data.chartType === 'candles') {
      const rows = renderCandleChart(
        data.chartData.candles,
        data.highlightedCandleIndex,
        data.candleFlashPhase,
      );
      parts.push(...rows);
    } else {
      // Sparkline
      parts.push(renderSparkline(
        data.chartData.candles,
        data.highlightedCandleIndex,
        data.candleFlashPhase,
      ));
    }

    // Price range labels
    const candles = data.chartData.candles;
    const hi = Math.max(...candles.map((c) => c.high)).toFixed(2);
    const lo = Math.min(...candles.map((c) => c.low)).toFixed(2);
    parts.push(`${TRI_U}${hi}  ${TRI_D}${lo}`);
  }

  return parts.join('\n');
}
