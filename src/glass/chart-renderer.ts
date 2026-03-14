import type { Candle } from '../state/types';
import { CHART_AREA } from './layout';

const VIEWPORT_SIZE = 30;

interface HighlightOpts {
  highlightedIndex?: number;
  flashPhase?: boolean;
}

function computeViewport(candles: Candle[], highlightedIndex?: number): Candle[] {
  if (candles.length <= VIEWPORT_SIZE) return candles;
  if (highlightedIndex == null || highlightedIndex < 0) {
    return candles.slice(-VIEWPORT_SIZE);
  }
  // Pan viewport to keep highlighted candle visible
  let start = highlightedIndex - Math.floor(VIEWPORT_SIZE / 2);
  start = Math.max(0, Math.min(candles.length - VIEWPORT_SIZE, start));
  return candles.slice(start, start + VIEWPORT_SIZE);
}

function localIndex(candles: Candle[], subset: Candle[], highlightedIndex?: number): number {
  if (highlightedIndex == null || highlightedIndex < 0) return -1;
  if (candles.length <= VIEWPORT_SIZE) return highlightedIndex;
  let start = highlightedIndex - Math.floor(VIEWPORT_SIZE / 2);
  start = Math.max(0, Math.min(candles.length - VIEWPORT_SIZE, start));
  return highlightedIndex - start;
}

export function drawSparkline(ctx: CanvasRenderingContext2D, closes: number[], opts?: HighlightOpts): void {
  if (closes.length < 2) return;

  const { x, y, w, h } = CHART_AREA;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const stepX = w / (closes.length - 1);

  // Fill area under the line
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  for (let i = 0; i < closes.length; i++) {
    const px = x + i * stepX;
    const py = y + h - ((closes[i]! - min) / range) * h;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 200, 100, 0.08)';
  ctx.fill();

  // Draw the line
  ctx.beginPath();
  for (let i = 0; i < closes.length; i++) {
    const px = x + i * stepX;
    const py = y + h - ((closes[i]! - min) / range) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlighted point
  if (opts?.highlightedIndex != null && opts.highlightedIndex >= 0 && opts.highlightedIndex < closes.length) {
    const hi = opts.highlightedIndex;
    const px = x + hi * stepX;
    const py = y + h - ((closes[hi]! - min) / range) * h;
    drawHighlightMarker(ctx, px, py, y, y + h, opts.flashPhase ?? false);
  }
}

export function drawMiniCandles(ctx: CanvasRenderingContext2D, candles: Candle[], opts?: HighlightOpts): void {
  if (candles.length === 0) return;

  const { x, y, w, h } = CHART_AREA;
  const subset = computeViewport(candles, opts?.highlightedIndex);
  const hlLocal = localIndex(candles, subset, opts?.highlightedIndex);

  const maxCandles = subset.length;
  const allLows = subset.map((c) => c.low);
  const allHighs = subset.map((c) => c.high);
  const min = Math.min(...allLows);
  const max = Math.max(...allHighs);
  const range = max - min || 1;

  const candleW = Math.floor(w / maxCandles) - 2;
  const gap = 2;

  for (let i = 0; i < subset.length; i++) {
    const c = subset[i]!;
    const cx = x + i * (candleW + gap) + candleW / 2;

    const isUp = c.close >= c.open;
    const isHighlighted = i === hlLocal;
    let color = isUp ? '#d0d0d0' : '#505050';

    if (isHighlighted) {
      const flash = opts?.flashPhase ?? false;
      if (flash) {
        // Solid phase: bright white
        color = '#ffffff';
      } else {
        // Dotted phase: dimmer
        color = '#a0a0a0';
      }
    }

    // Wick
    const wickTop = y + h - ((c.high - min) / range) * h;
    const wickBot = y + h - ((c.low - min) / range) * h;
    ctx.beginPath();
    ctx.moveTo(cx, wickTop);
    ctx.lineTo(cx, wickBot);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    if (isHighlighted && !(opts?.flashPhase)) {
      ctx.setLineDash([3, 3]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Body
    const bodyTop = y + h - ((Math.max(c.open, c.close) - min) / range) * h;
    const bodyBot = y + h - ((Math.min(c.open, c.close) - min) / range) * h;
    const bodyH = Math.max(1, bodyBot - bodyTop);

    if (isHighlighted) {
      if (opts?.flashPhase) {
        ctx.fillStyle = color;
        ctx.fillRect(x + i * (candleW + gap), bodyTop, candleW, bodyH);
      } else {
        // Dashed outline
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x + i * (candleW + gap), bodyTop, candleW, bodyH);
        ctx.setLineDash([]);
      }
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x + i * (candleW + gap), bodyTop, candleW, bodyH);
    }

    // Vertical marker line at highlighted position
    if (isHighlighted) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, y + h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawHighlightMarker(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  top: number, bottom: number,
  flashPhase: boolean,
): void {
  // Vertical line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(px, top);
  ctx.lineTo(px, bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // Circle at data point
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fillStyle = flashPhase ? '#ffffff' : '#a0a0a0';
  ctx.fill();
}
