/**
 * Canvas renderer: chart-only for image tiles. 400x100.
 */
import { CHART_CANVAS_W, CHART_CANVAS_H, VIEWPORT_PER_RESOLUTION } from './layout';
import type { DisplayData } from '../state/selectors';
import type { Candle } from '../state/types';

function getViewportSize(resolution?: string): number {
  return VIEWPORT_PER_RESOLUTION[resolution ?? 'D'] ?? 40;
}

const W = CHART_CANVAS_W;
const H = CHART_CANVAS_H;
const PAD = 6;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function ensureCanvas(): CanvasRenderingContext2D {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const container = document.getElementById('glasses-canvas');
    if (container) container.appendChild(canvas);
  }
  if (!ctx) { ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false; }
  return ctx;
}

export function getCanvas(): HTMLCanvasElement { ensureCanvas(); return canvas!; }

// Sticky viewport for candle navigation
let viewportStart = -1;
export function resetViewport(): void { viewportStart = -1; }
export function getViewportStart(): number { return viewportStart; }

function drawSparkline(c: CanvasRenderingContext2D, closes: number[], hlIdx?: number, flash?: boolean): void {
  if (closes.length < 2) return;
  const min = Math.min(...closes), max = Math.max(...closes), range = max - min || 1;
  const cw = W - PAD * 2, ch = H - PAD * 2;
  const stepX = cw / (closes.length - 1);

  c.beginPath(); c.moveTo(PAD, PAD + ch);
  for (let i = 0; i < closes.length; i++)
    c.lineTo(PAD + i * stepX, PAD + ch - ((closes[i]! - min) / range) * ch);
  c.lineTo(PAD + cw, PAD + ch); c.closePath();
  c.fillStyle = 'rgba(255,255,255,0.06)'; c.fill();

  c.beginPath();
  for (let i = 0; i < closes.length; i++) {
    const px = PAD + i * stepX, py = PAD + ch - ((closes[i]! - min) / range) * ch;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.strokeStyle = '#e0e0e0'; c.lineWidth = 2; c.stroke();

  if (hlIdx != null && hlIdx >= 0 && hlIdx < closes.length) {
    const px = PAD + hlIdx * stepX, py = PAD + ch - ((closes[hlIdx]! - min) / range) * ch;
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.setLineDash([2, 4]);
    c.beginPath(); c.moveTo(px, PAD); c.lineTo(px, PAD + ch); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(px, py, 3, 0, Math.PI * 2);
    c.fillStyle = flash ? '#ffffff' : '#a0a0a0'; c.fill();
  }
}

function drawCandles(c: CanvasRenderingContext2D, candles: Candle[], hlIdx?: number, flash?: boolean, resolution?: string): void {
  if (candles.length === 0) return;
  const VP = getViewportSize(resolution);
  let view = candles, offset = 0;
  if (candles.length > VP) {
    if (hlIdx != null && hlIdx >= 0) {
      // Initialize viewport at the end (most recent candles)
      if (viewportStart < 0) viewportStart = candles.length - VP;
      // Only shift if highlight goes outside the viewport
      if (hlIdx < viewportStart) viewportStart = hlIdx;
      else if (hlIdx >= viewportStart + VP) viewportStart = hlIdx - VP + 1;
      // Clamp
      viewportStart = Math.max(0, Math.min(candles.length - VP, viewportStart));
      view = candles.slice(viewportStart, viewportStart + VP);
      offset = viewportStart;
    } else {
      viewportStart = candles.length - VP;
      view = candles.slice(-VP);
      offset = candles.length - VP;
    }
  } else {
    viewportStart = 0;
  }

  const cw = W - PAD * 2, ch = H - PAD * 2;
  const min = Math.min(...view.map((cd) => cd.low)), max = Math.max(...view.map((cd) => cd.high));
  const range = max - min || 1, maxVol = Math.max(...view.map((cd) => cd.volume)) || 1;
  const gap = 1, bw = Math.max(2, Math.floor(cw / view.length) - gap);
  const volH = ch * 0.18;

  for (let i = 0; i < view.length; i++) {
    const cd = view[i]!, cx = PAD + i * (bw + gap) + bw / 2;
    const isUp = cd.close >= cd.open, isHL = hlIdx != null && (i + offset) === hlIdx;
    const color = isHL && flash ? '#ffffff' : isHL ? '#c0c0c0' : isUp ? '#d0d0d0' : '#606060';

    const wT = PAD + ch - volH - ((cd.high - min) / range) * (ch - volH);
    const wB = PAD + ch - volH - ((cd.low - min) / range) * (ch - volH);
    c.strokeStyle = color; c.lineWidth = 1;
    c.beginPath(); c.moveTo(cx, wT); c.lineTo(cx, wB); c.stroke();

    const bT = PAD + ch - volH - ((Math.max(cd.open, cd.close) - min) / range) * (ch - volH);
    const bB = PAD + ch - volH - ((Math.min(cd.open, cd.close) - min) / range) * (ch - volH);
    c.fillStyle = color; c.fillRect(cx - bw / 2, bT, bw, Math.max(1, bB - bT));

    const vH = (cd.volume / maxVol) * volH;
    c.fillStyle = isUp ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)';
    c.fillRect(cx - bw / 2, PAD + ch - vH, bw, vH);

    if (isHL) {
      c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1; c.setLineDash([2, 3]);
      c.beginPath(); c.moveTo(cx, PAD); c.lineTo(cx, PAD + ch); c.stroke(); c.setLineDash([]);
    }
  }
}

export function renderToCanvasDirect(data: DisplayData): HTMLCanvasElement {
  const c = ensureCanvas();
  c.fillStyle = '#000000'; c.fillRect(0, 0, W, H);

  if (data.chartData) {
    if (data.chartType === 'candles' && data.chartData.candles.length > 0)
      drawCandles(c, data.chartData.candles, data.highlightedCandleIndex, data.candleFlashPhase, data.resolution);
    else if (data.chartData.closes.length > 0)
      drawSparkline(c, data.chartData.closes, data.highlightedCandleIndex, data.candleFlashPhase);
  }

  return canvas!;
}
