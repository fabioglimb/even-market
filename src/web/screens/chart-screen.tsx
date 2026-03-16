import { useState, useCallback } from 'react';
import type { Candle, ChartResolution } from '../../state/types';
import { formatPrice, formatPercent } from '../../utils/format';
import { useSelector, useDispatch } from '../hooks/use-store';
import { usePoller } from '../contexts/poller-context';
import { Page } from '../components/shared/page';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { SegmentedControl } from '../components/ui/segmented-control';
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
  const quote = useSelector((s) => (graphic ? s.quotes[graphic.symbol] : undefined));
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
      <Page>
        <p className="text-text-dim">No graphic selected</p>
      </Page>
    );
  }

  const sym = graphic.symbol;
  const isUp = quote ? quote.changePercent >= 0 : true;

  return (
    <Page>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO_BACK' })}>
            &larr; Back
          </Button>
          <h2 className="text-lg font-bold tracking-tight">{sym}</h2>
        </div>

        <div className="flex items-baseline gap-3 mb-4">
          {quote ? (
            <>
              <span className="text-3xl font-mono font-bold tabular-nums">
                ${formatPrice(quote.price)}
              </span>
              <Badge variant={isUp ? 'positive' : 'negative'}>
                {formatPercent(quote.changePercent)}
              </Badge>
            </>
          ) : (
            <span className="text-text-dim">Loading...</span>
          )}
        </div>

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
        />
      </div>

      {/* Chart */}
      <Card padding="none" className="overflow-hidden">
        <CandlestickChart
          candles={candles}
          resolution={graphic.resolution}
          onHover={handleHover}
          onLoadMore={handleLoadMore}
        />
      </Card>
      <ChartInfo candle={hoveredCandle} resolution={graphic.resolution} />
    </Page>
  );
}

export { ChartScreen };
