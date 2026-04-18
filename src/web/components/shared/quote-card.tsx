import type { GraphicEntry, StockQuote } from '../../../state/types';
import { formatPrice, formatPercent, formatChange, formatVolume, formatResolutionShort } from '../../../utils/format';
import { Card, Badge, Button } from 'even-toolkit/web';
import { IcTrash } from 'even-toolkit/web/icons/svg-icons';

interface QuoteCardProps {
  graphic: GraphicEntry;
  quote: StockQuote | undefined;
  onClick: () => void;
  onRemove: () => void;
}

function QuoteCard({ graphic, quote, onClick, onRemove }: QuoteCardProps) {
  const isUp = quote ? quote.changePercent >= 0 : true;

  return (
    <Card variant="interactive" padding="sm" className="cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="danger"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <IcTrash width={14} height={14} />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-normal text-text">{graphic.symbol}</span>
              <span className="text-[11px] tracking-[-0.11px] text-text-dim">{formatResolutionShort(graphic.resolution)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono tabular-nums text-[13px] tracking-[-0.13px]">
            {quote ? formatPrice(quote.price) : '--'}
          </span>
          <Badge variant={isUp ? 'positive' : 'negative'}>
            {quote ? formatPercent(quote.changePercent) : '--'}
          </Badge>
        </div>
      </div>
      {quote && (
        <div className="flex gap-4 mt-2 pt-2 border-t border-border/50 text-[11px] tracking-[-0.11px] text-text-dim font-mono tabular-nums">
          <span>H: {formatPrice(quote.high)}</span>
          <span>L: {formatPrice(quote.low)}</span>
          <span>V: {formatVolume(quote.volume)}</span>
          <span className={isUp ? 'text-positive' : 'text-negative'}>
            {formatChange(quote.change)}
          </span>
        </div>
      )}
    </Card>
  );
}

export { QuoteCard };
