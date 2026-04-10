/**
 * Offscreen canvas line chart renderer for G2 glasses.
 * Renders a 576x100 line chart that gets split into 3 image tiles.
 */

const CANVAS_W = 576;
const CANVAS_H = 100;
const PADDING = { top: 6, right: 4, bottom: 6, left: 4 };

let canvas: OffscreenCanvas | null = null;

function getCanvas(): OffscreenCanvas {
  if (!canvas) {
    canvas = new OffscreenCanvas(CANVAS_W, CANVAS_H);
  }
  return canvas;
}

export function renderPortfolioLineChart(data: Array<{ time: number; value: number }>): OffscreenCanvas {
  const cvs = getCanvas();
  const ctx = cvs.getContext('2d')!;

  // Clear to black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (data.length < 2) {
    ctx.fillStyle = '#4BB956';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No chart data', CANVAS_W / 2, CANVAS_H / 2 + 5);
    return cvs;
  }

  const plotX = PADDING.left;
  const plotW = CANVAS_W - PADDING.left - PADDING.right;
  const plotY = PADDING.top;
  const plotH = CANVAS_H - PADDING.top - PADDING.bottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => plotX + (i / (data.length - 1)) * plotW;
  const toY = (v: number) => plotY + plotH - ((v - minVal) / range) * plotH;

  const isPositive = data[data.length - 1]!.value >= data[0]!.value;
  const lineColor = isPositive ? '#4BB956' : '#FF453A';

  // Area fill
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(data[0]!.value));
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(toX(i), toY(data[i]!.value));
  }
  ctx.lineTo(toX(data.length - 1), plotY + plotH);
  ctx.lineTo(toX(0), plotY + plotH);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
  grad.addColorStop(0, lineColor + '40');
  grad.addColorStop(1, lineColor + '08');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(data[0]!.value));
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(toX(i), toY(data[i]!.value));
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Grid lines with price labels
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);
  ctx.font = '9px monospace';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = plotY + (i / 4) * plotH;
    if (i > 0 && i < 4) {
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW - 50, y);
      ctx.stroke();
    }
    const val = maxVal - (i / 4) * range;
    ctx.fillText(`$${val.toFixed(0)}`, plotX + plotW - 2, y + 3);
  }
  ctx.setLineDash([]);

  return cvs;
}
