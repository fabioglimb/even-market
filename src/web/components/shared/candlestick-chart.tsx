import { useRef, useEffect, useCallback, useState } from 'react';
import type { Candle, ChartResolution } from '../../../state/types';
import { formatPrice, formatCandleTime } from '../../../utils/format';

const CHART_W = 800;
const CHART_H = 400;
const VOLUME_H = 80;
const PADDING = { top: 20, right: 60, bottom: 30, left: 10 };
const MIN_VISIBLE = 10;
const MAX_VISIBLE = 500;

interface CandlestickChartProps {
  candles: Candle[];
  resolution: ChartResolution;
  onHover?: (candle: Candle | null, index: number) => void;
}

function CandlestickChart({ candles, resolution, onHover }: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewStart, setViewStart] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const dragRef = useRef<{ startX: number; startViewStart: number } | null>(null);

  // Reset viewport when candles change
  useEffect(() => {
    setViewStart(0);
    setViewCount(candles.length);
  }, [candles.length]);

  const clampView = useCallback(
    (start: number, count: number) => {
      const c = Math.max(MIN_VISIBLE, Math.min(MAX_VISIBLE, count, candles.length));
      const s = Math.max(0, Math.min(candles.length - c, start));
      return { start: s, count: c };
    },
    [candles.length],
  );

  const visibleCandles = candles.slice(viewStart, viewStart + viewCount);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCandles(canvas, visibleCandles, resolution);
  }, [visibleCandles, resolution]);

  // Wheel → zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (candles.length === 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseRatio = (e.clientX - rect.left) / rect.width;

      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
      const newCount = Math.round(viewCount * zoomFactor);
      const delta = newCount - viewCount;
      const newStart = viewStart - Math.round(delta * mouseRatio);

      const clamped = clampView(newStart, newCount);
      setViewStart(clamped.start);
      setViewCount(clamped.count);
    },
    [candles.length, viewStart, viewCount, clampView],
  );

  // Drag to pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      dragRef.current = { startX: e.clientX, startViewStart: viewStart };
    },
    [viewStart],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Dragging → pan
      if (dragRef.current) {
        const rect = canvas.getBoundingClientRect();
        const dx = e.clientX - dragRef.current.startX;
        const candlesPerPixel = viewCount / rect.width;
        const shift = Math.round(-dx * candlesPerPixel);
        const newStart = dragRef.current.startViewStart + shift;
        const clamped = clampView(newStart, viewCount);
        setViewStart(clamped.start);
        return;
      }

      // Hover
      if (!onHover || visibleCandles.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CHART_W / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      const drawW = CHART_W - PADDING.left - PADDING.right;
      const candleW = drawW / visibleCandles.length;
      const idx = Math.floor((mx - PADDING.left) / candleW);
      if (idx >= 0 && idx < visibleCandles.length) {
        onHover(visibleCandles[idx]!, viewStart + idx);
      }
    },
    [visibleCandles, viewStart, viewCount, onHover, clampView],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    onHover?.(null, -1);
  }, [onHover]);

  // Touch: pinch-zoom + drag
  const touchRef = useRef<{ touches: { id: number; x: number }[]; startViewStart: number; startViewCount: number }>({
    touches: [],
    startViewStart: viewStart,
    startViewCount: viewCount,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const touches = Array.from(e.touches).map((t) => ({ id: t.identifier, x: t.clientX }));
      touchRef.current = { touches, startViewStart: viewStart, startViewCount: viewCount };
    },
    [viewStart, viewCount],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || candles.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const cur = Array.from(e.touches);
      const { touches: prev, startViewStart: svs, startViewCount: svc } = touchRef.current;

      if (cur.length === 1 && prev.length === 1) {
        // Single finger → pan
        const dx = cur[0]!.clientX - prev[0]!.x;
        const candlesPerPixel = svc / rect.width;
        const shift = Math.round(-dx * candlesPerPixel);
        const clamped = clampView(svs + shift, svc);
        setViewStart(clamped.start);
      } else if (cur.length >= 2 && prev.length >= 2) {
        // Pinch → zoom
        const prevDist = Math.abs(prev[0]!.x - prev[1]!.x) || 1;
        const curDist = Math.abs(cur[0]!.clientX - cur[1]!.clientX) || 1;
        const scale = prevDist / curDist;
        const newCount = Math.round(svc * scale);
        const midX = (cur[0]!.clientX + cur[1]!.clientX) / 2;
        const mouseRatio = (midX - rect.left) / rect.width;
        const delta = newCount - svc;
        const newStart = svs - Math.round(delta * mouseRatio);
        const clamped = clampView(newStart, newCount);
        setViewStart(clamped.start);
        setViewCount(clamped.count);
      }
    },
    [candles.length, clampView],
  );

  return (
    <canvas
      ref={canvasRef}
      width={CHART_W}
      height={CHART_H}
      className="bg-surface rounded-md block w-full cursor-grab active:cursor-grabbing touch-none"
      style={{ maxWidth: CHART_W + 'px' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    />
  );
}

function drawCandles(canvas: HTMLCanvasElement, candles: Candle[], resolution: ChartResolution): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, CHART_W, CHART_H);

  if (candles.length === 0) {
    ctx.fillStyle = '#8a7f72';
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
  ctx.strokeStyle = '#2a2519';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PADDING.top + (priceH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(CHART_W - PADDING.right, y);
    ctx.stroke();

    const price = allHigh - (priceRange * i) / 4;
    ctx.fillStyle = '#6b6054';
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
