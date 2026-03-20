import { useState, useCallback } from 'react';
import type { Candle, ChartResolution } from '../../state/types';
import { formatPrice, formatPercent } from '../../utils/format';
import { useSelector, useDispatch } from '../hooks/use-store';
import { usePoller } from '../contexts/poller-context';
import { AppShell, NavHeader, Button, Badge, Card, SegmentedControl, EmptyState } from 'even-toolkit/web';
import { IcChevronBack } from 'even-toolkit/web/icons/svg-icons';
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
      <AppShell header={<NavHeader title="Chart" left={<Button variant="ghost" size="icon" onClick={() => dispatch({ type: 'GO_BACK' })}><IcChevronBack width={20} height={20} /></Button>} />}>
        <EmptyState title="No graphic selected" />
      </AppShell>
    );
  }

  const sym = graphic.symbol;
  const isUp = quote ? quote.changePercent >= 0 : true;

  return (
    <AppShell
      header={
        <NavHeader
          title={sym}
          left={
            <Button variant="ghost" size="icon" onClick={() => dispatch({ type: 'GO_BACK' })}>
              <IcChevronBack width={20} height={20} />
            </Button>
          }
        />
      }
    >
      <div className="px-3 pt-3 pb-8">
        {quote && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-[17px] tracking-[-0.17px] font-mono tabular-nums">
              ${formatPrice(quote.price)}
            </span>
            <Badge variant={isUp ? 'positive' : 'negative'}>
              {formatPercent(quote.changePercent)}
            </Badge>
          </div>
        )}
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
      </div>
    </AppShell>
  );
}

export { ChartScreen };
