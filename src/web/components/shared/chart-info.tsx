import type { Candle, ChartResolution } from '../../../state/types';
import { formatPrice, formatVolume, formatCandleTime } from '../../../utils/format';

interface ChartInfoProps {
  candle: Candle | null;
  resolution: ChartResolution;
}

function ChartInfo({ candle, resolution }: ChartInfoProps) {
  if (!candle) return <div className="flex gap-4 mt-2 text-[13px] text-text-muted font-mono tabular-nums min-h-[20px]" />;

  return (
    <div className="flex gap-4 mt-2 text-[13px] font-mono tabular-nums min-h-[20px]">
      <span className="text-text-dim">{formatCandleTime(candle.time, resolution)}</span>
      <span><span className="text-text-muted">O:</span> {formatPrice(candle.open)}</span>
      <span><span className="text-text-muted">H:</span> {formatPrice(candle.high)}</span>
      <span><span className="text-text-muted">L:</span> {formatPrice(candle.low)}</span>
      <span><span className="text-text-muted">C:</span> {formatPrice(candle.close)}</span>
      <span><span className="text-text-muted">V:</span> {formatVolume(candle.volume)}</span>
    </div>
  );
}

export { ChartInfo };
