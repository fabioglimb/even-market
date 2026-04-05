import { useState, useCallback } from 'react';
import type { Candle, ChartResolution } from '../../state/types';
import { useSelector, useDispatch } from '../hooks/use-store';
import { usePoller } from '../contexts/poller-context';
import { Card, SegmentedControl, EmptyState } from 'even-toolkit/web';
import { CandlestickChart } from '../components/shared/candlestick-chart';
import { ChartInfo } from '../components/shared/chart-info';

const RES_OPTIONS = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1H' },
  { value: 'D', label: 'D' },
  { value: 'W', label: 'W' },
  { value: 'M', label: 'M' },
];

function ChartScreen() {
  const dispatch = useDispatch();
  const poller = usePoller();
  const graphic = useSelector((s) => {
    const g = s.settings.graphics.find((g) => g.id === s.selectedGraphicId);
    return g ?? null;
  });
  const candles = useSelector((s) => s.candles);

  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const handleHover = useCallback((candle: Candle | null) => {
    setHoveredCandle(candle);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (graphic) {
      poller.fetchOlderCandles(graphic.symbol, graphic.resolution);
    }
  }, [poller, graphic]);

  if (!graphic) {
    return (
      <EmptyState title="No graphic selected" />
    );
  }

  return (
    <>
      <SegmentedControl
        options={RES_OPTIONS}
        value={graphic.resolution}
        onValueChange={(res) =>
          dispatch({
            type: 'SET_RESOLUTION',
            graphicId: graphic.id,
            resolution: res as ChartResolution,
          })
        }
        className="mb-3"
      />

      <Card padding="none" className="overflow-hidden">
        <CandlestickChart
          candles={candles}
          resolution={graphic.resolution}
          onHover={handleHover}
          onLoadMore={handleLoadMore}
        />
      </Card>
      <ChartInfo candle={hoveredCandle} resolution={graphic.resolution} />
    </>
  );
}

export { ChartScreen };
