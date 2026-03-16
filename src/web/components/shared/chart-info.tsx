import type { Candle, ChartResolution } from '../../../state/types';
import { formatPrice, formatVolume, formatCandleTime } from '../../../utils/format';

interface ChartInfoProps {
  candle: Candle | null;
  resolution: ChartResolution;
}

function ChartInfo({ candle, resolution }: ChartInfoProps) {
  if (!candle) return <div className="flex gap-4 mt-2 text-[13px] text-text-dim tabular-nums min-h-[20px]" />;

  return (
    <div className="flex gap-4 mt-2 text-[13px] text-text-dim tabular-nums min-h-[20px]">
      <span>{formatCandleTime(candle.time, resolution)}</span>
      <span>O: {formatPrice(candle.open)}</span>
      <span>H: {formatPrice(candle.high)}</span>
      <span>L: {formatPrice(candle.low)}</span>
      <span>C: {formatPrice(candle.close)}</span>
      <span>V: {formatVolume(candle.volume)}</span>
    </div>
  );
}

export { ChartInfo };
