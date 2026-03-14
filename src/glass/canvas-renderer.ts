import { DISPLAY_W, DISPLAY_H } from './layout';
import { canvasToPngBytes } from './png-utils';
import { drawSparkline, drawMiniCandles } from './chart-renderer';
import type { DisplayData, DisplayLine, ActionButton } from '../state/selectors';

const FONT_SIZE = 22;
const LINE_HEIGHT = 28;
const PADDING_LEFT = 12;
const PADDING_TOP = 8;
const FONT = `${FONT_SIZE}px "Courier New", monospace`;

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
  }
  return ctx;
}

export function getCanvas(): HTMLCanvasElement {
  ensureCanvas();
  return canvas!;
}

function drawLine(ctx: CanvasRenderingContext2D, line: DisplayLine, y: number): void {
  const x = PADDING_LEFT;

  if (line.style === 'separator') {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + LINE_HEIGHT / 2);
    ctx.lineTo(DISPLAY_W - PADDING_LEFT, y + LINE_HEIGHT / 2);
    ctx.stroke();
    return;
  }

  if (line.inverted) {
    // Highlighted row: bright bg + dark text
    ctx.fillStyle = '#606060';
    ctx.fillRect(0, y, DISPLAY_W, LINE_HEIGHT);
    ctx.fillStyle = '#000000';
    ctx.font = FONT;
    ctx.fillText(line.text, x, y + FONT_SIZE);
    return;
  }

  ctx.font = FONT;

  switch (line.style) {
    case 'meta':
      ctx.fillStyle = '#808080';
      break;
    case 'normal':
    default:
      ctx.fillStyle = '#e0e0e0';
      break;
  }

  ctx.fillText(line.text, x, y + FONT_SIZE);
}

function drawActionButtons(ctx: CanvasRenderingContext2D, buttons: ActionButton[], flashPhase: boolean): void {
  const btnY = PADDING_TOP + 2;
  const btnH = LINE_HEIGHT - 4;
  const btnPadding = 10;
  const btnFont = `${FONT_SIZE - 4}px "Courier New", monospace`;
  const btnGap = 6;

  // Measure max width so all buttons are the same size
  ctx.font = btnFont;
  let maxTextW = 0;
  for (const btn of buttons) {
    const tw = ctx.measureText(btn.label).width;
    if (tw > maxTextW) maxTextW = tw;
  }
  const btnW = maxTextW + btnPadding * 2;

  // Start position: right-aligned
  let btnX = DISPLAY_W - PADDING_LEFT - buttons.length * btnW - (buttons.length - 1) * btnGap;

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i]!;
    ctx.font = btnFont;
    const textW = ctx.measureText(btn.label).width;
    const textX = btnX + (btnW - textW) / 2;

    if (btn.active) {
      // Active: flash between filled and outline
      if (flashPhase) {
        ctx.fillStyle = '#606060';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#000000';
      } else {
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 1;
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#606060';
      }
    } else if (btn.highlighted) {
      // Cursor on button: filled
      ctx.fillStyle = '#606060';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.fillStyle = '#000000';
    } else {
      // Normal: outline only
      ctx.strokeStyle = '#606060';
      ctx.lineWidth = 1;
      ctx.strokeRect(btnX, btnY, btnW, btnH);
      ctx.fillStyle = '#606060';
    }

    ctx.fillText(btn.label, textX, btnY + FONT_SIZE - 4);
    btnX += btnW + btnGap;
  }
}

function drawSplash(c: CanvasRenderingContext2D): void {
  const cx = DISPLAY_W / 2;
  const textY = DISPLAY_H / 2 + 45;

  // Rising candlestick chart
  const numCandles = 14;
  const chartX = cx - 170;
  const chartW = 340;
  const chartTop = 10;
  const chartBot = DISPLAY_H / 2 + 20;
  const chartH = chartBot - chartTop;

  const gap = 3;
  const candleW = Math.floor((chartW - gap * (numCandles - 1)) / numCandles);

  // Hand-crafted 14 candles with VARIED heights: tall, short, medium mix
  // Values are 0-1 in chart space (0=top, 1=bottom)
  const candles: { o: number; h: number; l: number; c: number }[] = [
    { o: 0.92, h: 0.86, l: 0.95, c: 0.87 },  // 1  short up
    { o: 0.87, h: 0.70, l: 0.90, c: 0.72 },  // 2  TALL up (big move)
    { o: 0.72, h: 0.67, l: 0.78, c: 0.76 },  // 3  medium down
    { o: 0.76, h: 0.58, l: 0.79, c: 0.60 },  // 4  TALL up (recovery)
    { o: 0.60, h: 0.55, l: 0.63, c: 0.57 },  // 5  short up
    { o: 0.57, h: 0.52, l: 0.66, c: 0.64 },  // 6  medium down
    { o: 0.64, h: 0.60, l: 0.67, c: 0.62 },  // 7  short up
    { o: 0.62, h: 0.42, l: 0.65, c: 0.44 },  // 8  TALL up (breakout!)
    { o: 0.44, h: 0.38, l: 0.52, c: 0.50 },  // 9  medium down
    { o: 0.50, h: 0.46, l: 0.53, c: 0.48 },  // 10 short up
    { o: 0.48, h: 0.30, l: 0.51, c: 0.32 },  // 11 TALL up (rally)
    { o: 0.32, h: 0.26, l: 0.38, c: 0.36 },  // 12 medium down
    { o: 0.36, h: 0.22, l: 0.39, c: 0.24 },  // 13 medium up
    { o: 0.24, h: 0.08, l: 0.28, c: 0.12 },  // 14 TALL up (finale)
  ];

  for (let i = 0; i < candles.length; i++) {
    const cd = candles[i]!;
    const x = chartX + i * (candleW + gap);
    const midX = x + candleW / 2;
    const isUp = cd.c <= cd.o;

    const wickTop = chartTop + cd.h * chartH;
    const wickBot = chartTop + cd.l * chartH;
    const bodyTop = chartTop + Math.min(cd.o, cd.c) * chartH;
    const bodyBot = chartTop + Math.max(cd.o, cd.c) * chartH;
    const bodyH = Math.max(3, bodyBot - bodyTop);

    const color = isUp ? '#d0d0d0' : '#505050';

    // Wick
    c.beginPath();
    c.moveTo(midX, wickTop);
    c.lineTo(midX, wickBot);
    c.strokeStyle = color;
    c.lineWidth = 1;
    c.stroke();

    // Body
    if (isUp) {
      c.fillStyle = color;
      c.fillRect(x, bodyTop, candleW, bodyH);
    } else {
      // Down candles: outline only for contrast
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.strokeRect(x, bodyTop, candleW, bodyH);
    }
  }

  // "EvenMarket" text below the candles
  c.fillStyle = '#e0e0e0';
  c.font = 'bold 28px "Courier New", monospace';
  c.textAlign = 'center';
  c.fillText('EvenMarket', cx, textY);

  // Subtitle
  c.font = '14px "Courier New", monospace';
  c.fillStyle = '#606060';
  c.fillText('Loading...', cx, textY + 22);

  c.textAlign = 'left';
}

export function drawToCanvas(data: DisplayData): void {
  const c = ensureCanvas();

  // Clear
  c.fillStyle = '#000000';
  c.fillRect(0, 0, DISPLAY_W, DISPLAY_H);

  if (data.showSplash) {
    drawSplash(c);
    return;
  }

  // Draw text lines
  let y = PADDING_TOP;
  for (const line of data.lines) {
    drawLine(c, line, y);
    y += LINE_HEIGHT;
  }

  // Draw action buttons (top-right) if present
  if (data.actionButtons && data.actionButtons.length > 0) {
    drawActionButtons(c, data.actionButtons, data.candleFlashPhase ?? false);
  }

  // Draw chart overlay if present
  if (data.chartData) {
    const hlOpts = {
      highlightedIndex: data.highlightedCandleIndex,
      flashPhase: data.candleFlashPhase,
    };

    if (data.chartType === 'candles' && data.chartData.candles.length > 0) {
      drawMiniCandles(c, data.chartData.candles, hlOpts);
    } else if (data.chartData.closes.length > 0) {
      drawSparkline(c, data.chartData.closes, hlOpts);
    }
  }
}

export async function renderToImage(data: DisplayData): Promise<number[]> {
  drawToCanvas(data);
  return canvasToPngBytes(canvas!);
}

export function renderToCanvasDirect(data: DisplayData): HTMLCanvasElement {
  drawToCanvas(data);
  return canvas!;
}
