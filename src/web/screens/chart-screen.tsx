import { useState, useCallback } from 'react';
import type { Candle, ChartResolution } from '../../state/types';
import { formatPrice } from '../../utils/format';
import { useSelector, useDispatch } from '../hooks/use-store';
import { cn } from '../utils/cn';
import { Page } from '../components/shared/page';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { CandlestickChart } from '../components/shared/candlestick-chart';
import { ChartInfo } from '../components/shared/chart-info';

const RES_OPTIONS = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '60', label: '1 hour' },
  { value: 'D', label: 'Daily' },
  { value: 'W', label: 'Weekly' },
  { value: 'M', label: 'Monthly' },
];

function ChartScreen() {
  const dispatch = useDispatch();
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
        <div className="flex items-center gap-3 mb-2.5">
          <Button variant="outline" onClick={() => dispatch({ type: 'GO_BACK' })}>
            &larr; Back
          </Button>
          <h2 className="text-2xl font-semibold">{sym}</h2>
          <span className="text-lg text-text-dim">
            {quote ? (
              <>
                ${formatPrice(quote.price)}{' '}
                <span className={cn(isUp ? 'text-positive' : 'text-negative')}>
                  {isUp ? '+' : ''}
                  {quote.changePercent.toFixed(2)}%
                </span>
              </>
            ) : (
              'Loading...'
            )}
          </span>
        </div>

        <div>
          <Select
            options={RES_OPTIONS}
            value={graphic.resolution}
            onValueChange={(res) =>
              dispatch({
                type: 'SET_RESOLUTION',
                graphicId: graphic.id,
                resolution: res as ChartResolution,
              })
            }
            className="bg-surface border border-border text-text rounded-md px-3 py-1 text-sm outline-none w-auto"
          />
        </div>
      </div>

      {/* Chart */}
      <CandlestickChart
        candles={candles}
        resolution={graphic.resolution}
        onHover={handleHover}
      />
      <ChartInfo candle={hoveredCandle} resolution={graphic.resolution} />
    </Page>
  );
}

export { ChartScreen };
