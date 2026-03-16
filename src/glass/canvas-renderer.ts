/**
 * Canvas renderer: chart-only graphics for image tiles.
 * Text/data is handled by the text panel.
 * Canvas: 600x100 — 3 tiles side by side.
 */
import { CHART_CANVAS_W, CHART_CANVAS_H } from './layout';

const DISPLAY_W = CHART_CANVAS_W;
const DISPLAY_H = CHART_CANVAS_H;
import type { DisplayData } from '../state/selectors';
import type { Candle } from '../state/types';

const CHART_X = 10;
const CHART_Y = 5;
const CHART_W = DISPLAY_W - 20;
const CHART_H = DISPLAY_H - 10;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function ensureCanvas(): CanvasRenderingContext2D {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = DISPLAY_W;
    canvas.height = DISPLAY_H;
    const container = document.getElementById('glasses-canvas');
    if (container) container.appendChild(canvas);
  }
  if (!ctx) {
    ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
  }
  return ctx;
}

export function getCanvas(): HTMLCanvasElement {
  ensureCanvas();
  return canvas!;
}

function drawSparkline(c: CanvasRenderingContext2D, closes: number[], hlIdx?: number, flash?: boolean): void {
  if (closes.length < 2) return;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const stepX = CHART_W / (closes.length - 1);

  // Fill area
  c.beginPath();
  c.moveTo(CHART_X, CHART_Y + CHART_H);
  for (let i = 0; i < closes.length; i++) {
    c.lineTo(CHART_X + i * stepX, CHART_Y + CHART_H - ((closes[i]! - min) / range) * CHART_H);
  }
  c.lineTo(CHART_X + CHART_W, CHART_Y + CHART_H);
  c.closePath();
  c.fillStyle = 'rgba(255, 255, 255, 0.08)';
  c.fill();

  // Line
  c.beginPath();
  for (let i = 0; i < closes.length; i++) {
    const px = CHART_X + i * stepX;
    const py = CHART_Y + CHART_H - ((closes[i]! - min) / range) * CHART_H;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.strokeStyle = '#e0e0e0';
  c.lineWidth = 2;
  c.stroke();

  // Highlight marker
  if (hlIdx != null && hlIdx >= 0 && hlIdx < closes.length) {
    const px = CHART_X + hlIdx * stepX;
    const py = CHART_Y + CHART_H - ((closes[hlIdx]! - min) / range) * CHART_H;
    // Vertical line
    c.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    c.lineWidth = 1;
    c.setLineDash([2, 4]);
    c.beginPath();
    c.moveTo(px, CHART_Y);
    c.lineTo(px, CHART_Y + CHART_H);
    c.stroke();
    c.setLineDash([]);
    // Dot
    c.beginPath();
    c.arc(px, py, 3, 0, Math.PI * 2);
    c.fillStyle = flash ? '#ffffff' : '#a0a0a0';
    c.fill();
  }
}

function drawCandles(c: CanvasRenderingContext2D, candles: Candle[], hlIdx?: number, flash?: boolean): void {
  if (candles.length === 0) return;

  const VIEWPORT = 40;
  let view = candles;
  let offset = 0;
  if (candles.length > VIEWPORT) {
    if (hlIdx != null && hlIdx >= 0) {
      let start = hlIdx - Math.floor(VIEWPORT / 2);
      start = Math.max(0, Math.min(candles.length - VIEWPORT, start));
      view = candles.slice(start, start + VIEWPORT);
      offset = start;
    } else {
      view = candles.slice(-VIEWPORT);
      offset = candles.length - VIEWPORT;
    }
  }

  const min = Math.min(...view.map((cd) => cd.low));
  const max = Math.max(...view.map((cd) => cd.high));
  const range = max - min || 1;
  const maxVol = Math.max(...view.map((cd) => cd.volume)) || 1;
  const gap = 1;
  const candleW = Math.max(2, Math.floor(CHART_W / view.length) - gap);
  const volH = CHART_H * 0.2;

  for (let i = 0; i < view.length; i++) {
    const cd = view[i]!;
    const cx = CHART_X + i * (candleW + gap) + candleW / 2;
    const isUp = cd.close >= cd.open;
    const isHL = hlIdx != null && (i + offset) === hlIdx;

    let color: string;
    if (isHL && flash) color = '#ffffff';
    else if (isHL) color = '#c0c0c0';
    else if (isUp) color = '#d0d0d0';
    else color = '#606060';

    // Wick
    const wickTop = CHART_Y + CHART_H - volH - ((cd.high - min) / range) * (CHART_H - volH);
    const wickBot = CHART_Y + CHART_H - volH - ((cd.low - min) / range) * (CHART_H - volH);
    c.strokeStyle = color;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx, wickTop);
    c.lineTo(cx, wickBot);
    c.stroke();

    // Body
    const bodyTop = CHART_Y + CHART_H - volH - ((Math.max(cd.open, cd.close) - min) / range) * (CHART_H - volH);
    const bodyBot = CHART_Y + CHART_H - volH - ((Math.min(cd.open, cd.close) - min) / range) * (CHART_H - volH);
    c.fillStyle = color;
    c.fillRect(cx - candleW / 2, bodyTop, candleW, Math.max(1, bodyBot - bodyTop));

    // Volume bar (bottom)
    const vH = (cd.volume / maxVol) * volH;
    c.fillStyle = isUp ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    c.fillRect(cx - candleW / 2, CHART_Y + CHART_H - vH, candleW, vH);

    // Highlight vertical line
    if (isHL) {
      c.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      c.lineWidth = 1;
      c.setLineDash([2, 3]);
      c.beginPath();
      c.moveTo(cx, CHART_Y);
      c.lineTo(cx, CHART_Y + CHART_H);
      c.stroke();
      c.setLineDash([]);
    }
  }
}

function drawWatchlistBars(c: CanvasRenderingContext2D, data: DisplayData): void {
  // Simple price bars for each graphic in watchlist
  const graphics = data.lines.filter((l) => l.style !== 'separator');
  if (graphics.length === 0) return;

  const barW = Math.floor(CHART_W / graphics.length) - 4;
  const maxBarH = CHART_H - 10;

  for (let i = 0; i < graphics.length; i++) {
    const line = graphics[i]!;
    const x = CHART_X + i * (barW + 4);

    // Parse percent from the line text to set bar height
    const pctMatch = line.text.match(/([+-]?\d+\.\d+)%/);
    const pct = pctMatch ? parseFloat(pctMatch[1]!) : 0;
    const barH = Math.max(4, Math.min(maxBarH, Math.abs(pct) / 5 * maxBarH));
    const isUp = pct >= 0;

    // Bar
    c.fillStyle = line.inverted ? '#ffffff' : (isUp ? '#d0d0d0' : '#606060');
    c.fillRect(x, CHART_Y + CHART_H - barH, barW, barH);

    // Highlighted indicator
    if (line.inverted) {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.strokeRect(x - 1, CHART_Y + CHART_H - barH - 1, barW + 2, barH + 2);
    }
  }
}

export function renderToCanvasDirect(data: DisplayData): HTMLCanvasElement {
  const c = ensureCanvas();

  // Clear
  c.fillStyle = '#000000';
  c.fillRect(0, 0, DISPLAY_W, DISPLAY_H);

  if (data.showSplash) {
    // Splash: small rising candle pattern
    const bars = [0.3, 0.5, 0.35, 0.7, 0.45, 0.8, 0.6, 0.9, 0.55, 0.85, 0.75, 0.95];
    const bw = 8;
    const startX = DISPLAY_W / 2 - bars.length * (bw + 2) / 2;
    for (let i = 0; i < bars.length; i++) {
      const h = bars[i]! * (CHART_H - 20);
      c.fillStyle = i % 2 === 0 ? '#d0d0d0' : '#808080';
      c.fillRect(startX + i * (bw + 2), CHART_Y + CHART_H - 10 - h, bw, h);
    }
    return canvas!;
  }

  // Stock detail: chart
  if (data.chartData) {
    if (data.chartType === 'candles' && data.chartData.candles.length > 0) {
      drawCandles(c, data.chartData.candles, data.highlightedCandleIndex, data.candleFlashPhase);
    } else if (data.chartData.closes.length > 0) {
      drawSparkline(c, data.chartData.closes, data.highlightedCandleIndex, data.candleFlashPhase);
    }
  }
  // Watchlist: price change bars
  else if (!data.chartData && data.lines.length > 0) {
    drawWatchlistBars(c, data);
  }

  return canvas!;
}
