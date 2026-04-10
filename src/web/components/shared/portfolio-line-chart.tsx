import { useRef, useEffect, useState } from 'react';
import type { PortfolioValuePoint } from '../../../data/portfolio-history';
import { formatPrice } from '../../../utils/format';

const CHART_W = 800;
const CHART_H = 280;
const PADDING = { top: 16, right: 60, bottom: 28, left: 10 };

interface PortfolioLineChartProps {
  data: PortfolioValuePoint[];
  loading?: boolean;
  currency?: string;
}

function PortfolioLineChart({ data, loading, currency }: PortfolioLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ time: number; value: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CHART_W * dpr;
    canvas.height = CHART_H * dpr;
    ctx.scale(dpr, dpr);

    // Read CSS colors
    const style = getComputedStyle(canvas);
    const colorPositive = style.getPropertyValue('--color-positive').trim() || '#4BB956';
    const colorNegative = style.getPropertyValue('--color-negative').trim() || '#FF453A';
    const colorBorder = style.getPropertyValue('--color-border').trim() || '#ddd';
    const colorTextDim = style.getPropertyValue('--color-text-dim').trim() || '#7B7B7B';

    ctx.clearRect(0, 0, CHART_W, CHART_H);

    if (data.length < 2) {
      ctx.fillStyle = colorTextDim;
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(loading ? 'Loading...' : 'No data', CHART_W / 2, CHART_H / 2);
      return;
    }

    const plotX = PADDING.left;
    const plotW = CHART_W - PADDING.left - PADDING.right;
    const plotY = PADDING.top;
    const plotH = CHART_H - PADDING.top - PADDING.bottom;

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const toX = (i: number) => plotX + (i / (data.length - 1)) * plotW;
    const toY = (v: number) => plotY + plotH - ((v - minVal) / range) * plotH;

    const isPositive = data[data.length - 1]!.value >= data[0]!.value;
    const lineColor = isPositive ? colorPositive : colorNegative;

    // Grid lines
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = plotY + (i / gridCount) * plotH;
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();

      // Price label
      const val = maxVal - (i / gridCount) * range;
      ctx.fillStyle = colorTextDim;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(val, currency), plotX + plotW + 6, y + 4);
    }
    ctx.setLineDash([]);

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
    grad.addColorStop(0, lineColor + '30');
    grad.addColorStop(1, lineColor + '05');
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

    // Date labels
    ctx.fillStyle = colorTextDim;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const labelCount = Math.min(6, data.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      const d = new Date(data[idx]!.time);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      ctx.fillText(label, toX(idx), CHART_H - 6);
    }
  }, [data, loading, currency]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (data.length < 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const plotX = PADDING.left;
    const plotW = CHART_W - PADDING.left - PADDING.right;
    const ratio = Math.max(0, Math.min(1, (x - plotX) / plotW));
    const idx = Math.round(ratio * (data.length - 1));
    const point = data[idx];
    if (point) setHoverInfo({ time: point.time, value: point.value });
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CHART_W}
        height={CHART_H}
        className="w-full rounded-[6px]"
        style={{ height: 'auto', aspectRatio: `${CHART_W}/${CHART_H}` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
      />
      {hoverInfo && (
        <div className="absolute top-2 left-3 bg-surface/90 rounded-[4px] px-2 py-1 text-[11px] tracking-[-0.11px] text-text-dim font-mono">
          {new Date(hoverInfo.time).toLocaleDateString()} — {formatPrice(hoverInfo.value, currency)}
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/50 rounded-[6px]">
          <span className="text-[13px] tracking-[-0.13px] text-text-dim">Loading...</span>
        </div>
      )}
    </div>
  );
}

export { PortfolioLineChart };
