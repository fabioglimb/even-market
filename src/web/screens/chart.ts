import type { Store } from '../../state/store';
import type { AppState, Candle, ChartResolution } from '../../state/types';
import { formatPrice, formatVolume, formatCandleTime } from '../../utils/format';

const CHART_W = 800;
const CHART_H = 400;
const VOLUME_H = 80;
const PADDING = { top: 20, right: 60, bottom: 30, left: 10 };

const RES_LABELS: Record<string, string> = {
  '1': '1 min', '5': '5 min', '15': '15 min', '60': '1 hour',
  'D': 'Daily', 'W': 'Weekly', 'M': 'Monthly',
};
const RESOLUTIONS: ChartResolution[] = ['1', '5', '15', '60', 'D', 'W', 'M'];

let currentResolution: ChartResolution = 'D';
let unsubChart: (() => void) | null = null;

export function renderChart(container: HTMLElement, store: Store): void {
  if (unsubChart) { unsubChart(); unsubChart = null; }
  container.innerHTML = '';

  const state = store.getState();
  const graphic = state.settings.graphics.find((g) => g.id === state.selectedGraphicId);
  if (!graphic) {
    container.innerHTML = '<p>No graphic selected</p>';
    return;
  }

  const sym = graphic.symbol;
  currentResolution = graphic.resolution;
  const header = document.createElement('div');
  header.className = 'chart-header';

  const quote = state.quotes[sym];
  const priceInfo = quote
    ? `$${formatPrice(quote.price)} <span class="${quote.changePercent >= 0 ? 'green' : 'red'}">${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%</span>`
    : 'Loading...';

  header.innerHTML = `
    <div class="chart-title">
      <button id="chart-back" class="back-btn">&larr; Back</button>
      <h2>${sym}</h2>
      <span class="chart-price">${priceInfo}</span>
    </div>
    <div class="chart-controls">
      <select id="resolution-select">
        ${RESOLUTIONS.map((r) =>
          `<option value="${r}" ${r === graphic.resolution ? 'selected' : ''}>${RES_LABELS[r]}</option>`
        ).join('')}
      </select>
    </div>
  `;
  container.appendChild(header);

  const canvasEl = document.createElement('canvas');
  canvasEl.id = 'chart-canvas';
  canvasEl.width = CHART_W;
  canvasEl.height = CHART_H;
  canvasEl.style.width = '100%';
  canvasEl.style.maxWidth = CHART_W + 'px';
  container.appendChild(canvasEl);

  // OHLC info on hover
  const infoEl = document.createElement('div');
  infoEl.className = 'chart-info';
  infoEl.id = 'chart-info';
  container.appendChild(infoEl);

  // Back button
  document.getElementById('chart-back')?.addEventListener('click', () => {
    store.dispatch({ type: 'GO_BACK' });
  });

  // Resolution selector
  document.getElementById('resolution-select')?.addEventListener('change', (e) => {
    const res = (e.target as HTMLSelectElement).value as ChartResolution;
    currentResolution = res;
    if (graphic) {
      store.dispatch({ type: 'SET_RESOLUTION', graphicId: graphic.id, resolution: res });
    }
  });

  // Hover crosshair
  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = CHART_W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const candles = store.getState().candles;
    if (candles.length === 0) return;

    const drawW = CHART_W - PADDING.left - PADDING.right;
    const candleW = drawW / candles.length;
    const idx = Math.floor((mx - PADDING.left) / candleW);
    if (idx >= 0 && idx < candles.length) {
      const c = candles[idx]!;
      const dateStr = formatCandleTime(c.time, currentResolution);
      infoEl.innerHTML = `
        <span>${dateStr}</span>
        <span>O: ${formatPrice(c.open)}</span>
        <span>H: ${formatPrice(c.high)}</span>
        <span>L: ${formatPrice(c.low)}</span>
        <span>C: ${formatPrice(c.close)}</span>
        <span>V: ${formatVolume(c.volume)}</span>
      `;
    }
  });

  // Draw initial
  drawCandles(canvasEl, state.candles);

  // Track the graphic ID we rendered with so we only re-render on actual changes
  let renderedGraphicId = graphic.id;

  // Subscribe to updates
  unsubChart = store.subscribe((newState, prev) => {
    // Re-render if the selected graphic's resolution changed (e.g. from glasses TF nav)
    const currentGraphic = newState.settings.graphics.find((g) => g.id === newState.selectedGraphicId);
    if (newState.selectedGraphicId !== renderedGraphicId && newState.screen === 'stock-detail') {
      renderedGraphicId = newState.selectedGraphicId ?? '';
      renderChart(container, store);
      return;
    }
    if (newState.candles !== prev.candles) {
      drawCandles(canvasEl, newState.candles);
    }
  });
}

function drawCandles(canvas: HTMLCanvasElement, candles: Candle[]): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, CHART_W, CHART_H);

  if (candles.length === 0) {
    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No chart data', CHART_W / 2, CHART_H / 2);
    ctx.textAlign = 'left';
    return;
  }

  const priceH = CHART_H - VOLUME_H - PADDING.top - PADDING.bottom;
  const drawW = CHART_W - PADDING.left - PADDING.right;

  const allHigh = Math.max(...candles.map((c) => c.high));
  const allLow = Math.min(...candles.map((c) => c.low));
  const priceRange = allHigh - allLow || 1;
  const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;

  const candleW = drawW / candles.length;
  const bodyW = Math.max(1, candleW * 0.7);

  function priceY(p: number): number {
    return PADDING.top + priceH - ((p - allLow) / priceRange) * priceH;
  }

  // Draw grid lines
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PADDING.top + (priceH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(CHART_W - PADDING.right, y);
    ctx.stroke();

    const price = allHigh - (priceRange * i) / 4;
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(formatPrice(price), CHART_W - 5, y + 4);
  }

  // Draw candles
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    const cx = PADDING.left + i * candleW + candleW / 2;
    const isUp = c.close >= c.open;

    // Wick
    ctx.strokeStyle = isUp ? '#26a69a' : '#ef5350';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, priceY(c.high));
    ctx.lineTo(cx, priceY(c.low));
    ctx.stroke();

    // Body
    const bodyTop = priceY(Math.max(c.open, c.close));
    const bodyBot = priceY(Math.min(c.open, c.close));
    ctx.fillStyle = isUp ? '#26a69a' : '#ef5350';
    ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, Math.max(1, bodyBot - bodyTop));

    // Volume bar
    const volH = (c.volume / maxVol) * VOLUME_H;
    const volY = CHART_H - PADDING.bottom - volH;
    ctx.fillStyle = isUp ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)';
    ctx.fillRect(cx - bodyW / 2, volY, bodyW, volH);
  }

  // X-axis date labels
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(candles.length / 8));
  for (let i = 0; i < candles.length; i += step) {
    const c = candles[i]!;
    const cx = PADDING.left + i * candleW + candleW / 2;
    const label = formatCandleTime(c.time, currentResolution);
    ctx.fillText(label, cx, CHART_H - 5);
  }

  ctx.textAlign = 'left';
}
