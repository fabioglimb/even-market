import { useState, useCallback } from 'react';
import type { Candle, ChartResolution } from '../../state/types';
import { formatPrice, formatPercent } from '../../utils/format';
import { useSelector, useDispatch } from '../hooks/use-store';
import { usePoller } from '../contexts/poller-context';
import { Page, Button, Badge, Card, SegmentedControl } from 'even-toolkit/web';
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
      {/* Header — single row: back icon, symbol, price, badge */}
      <div className="mb-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'GO_BACK' })}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-[6px] cursor-pointer text-text hover:bg-surface-light transition-colors"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-[17px] tracking-[-0.17px] font-normal">{sym}</span>
          <div className="flex items-center gap-2 ml-auto">
            {quote ? (
              <>
                <span className="text-[17px] tracking-[-0.17px] font-mono font-normal tabular-nums">
                  ${formatPrice(quote.price)}
                </span>
                <Badge variant={isUp ? 'positive' : 'negative'}>
                  {formatPercent(quote.changePercent)}
                </Badge>
              </>
            ) : (
              <span className="text-text-dim text-[13px]">Loading...</span>
            )}
          </div>
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
