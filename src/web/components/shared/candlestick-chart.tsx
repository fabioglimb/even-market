import { useRef, useEffect, useCallback } from 'react';
import type { Candle, ChartResolution } from '../../../state/types';
import { formatPrice, formatCandleTime } from '../../../utils/format';

const CHART_W = 800;
const CHART_H = 400;
const VOLUME_H = 80;
const PADDING = { top: 20, right: 60, bottom: 30, left: 10 };

interface CandlestickChartProps {
  candles: Candle[];
  resolution: ChartResolution;
  onHover?: (candle: Candle | null, index: number) => void;
}

function CandlestickChart({ candles, resolution, onHover }: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCandles(canvas, candles, resolution);
  }, [candles, resolution]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onHover || candles.length === 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CHART_W / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;

      const drawW = CHART_W - PADDING.left - PADDING.right;
      const candleW = drawW / candles.length;
      const idx = Math.floor((mx - PADDING.left) / candleW);

      if (idx >= 0 && idx < candles.length) {
        onHover(candles[idx]!, idx);
      }
    },
    [candles, onHover],
  );

  return (
    <canvas
      ref={canvasRef}
      width={CHART_W}
      height={CHART_H}
      className="bg-surface border border-border rounded-md block w-full"
      style={{ maxWidth: CHART_W + 'px' }}
      onMouseMove={handleMouseMove}
    />
  );
}

function drawCandles(canvas: HTMLCanvasElement, candles: Candle[], resolution: ChartResolution): void {
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

  const style = getComputedStyle(document.documentElement);
  const colorUp = style.getPropertyValue('--color-positive').trim() || '#26a69a';
  const colorDown = style.getPropertyValue('--color-negative').trim() || '#ef5350';
  const colorUpAlpha = style.getPropertyValue('--color-positive-alpha').trim() || 'rgba(38,166,154,0.3)';
  const colorDownAlpha = style.getPropertyValue('--color-negative-alpha').trim() || 'rgba(239,83,80,0.3)';

  // Grid lines
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

  // Candles
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    const cx = PADDING.left + i * candleW + candleW / 2;
    const isUp = c.close >= c.open;

    // Wick
    ctx.strokeStyle = isUp ? colorUp : colorDown;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, priceY(c.high));
    ctx.lineTo(cx, priceY(c.low));
    ctx.stroke();

    // Body
    const bodyTop = priceY(Math.max(c.open, c.close));
    const bodyBot = priceY(Math.min(c.open, c.close));
    ctx.fillStyle = isUp ? colorUp : colorDown;
    ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, Math.max(1, bodyBot - bodyTop));

    // Volume bar
    const volH = (c.volume / maxVol) * VOLUME_H;
    const volY = CHART_H - PADDING.bottom - volH;
    ctx.fillStyle = isUp ? colorUpAlpha : colorDownAlpha;
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
    const label = formatCandleTime(c.time, resolution);
    ctx.fillText(label, cx, CHART_H - 5);
  }

  ctx.textAlign = 'left';
}

export { CandlestickChart };
