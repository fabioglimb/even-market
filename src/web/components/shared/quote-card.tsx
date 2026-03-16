import type { GraphicEntry, StockQuote } from '../../../state/types';
import { formatPrice, formatPercent, formatChange, formatVolume, formatResolutionShort } from '../../../utils/format';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TrashIcon } from '../ui/icons';

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
            <TrashIcon />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-accent">{graphic.symbol}</span>
              <span className="text-xs text-text-dim">{formatResolutionShort(graphic.resolution)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono tabular-nums text-sm">
            {quote ? formatPrice(quote.price) : '--'}
          </span>
          <Badge variant={isUp ? 'positive' : 'negative'}>
            {quote ? formatPercent(quote.changePercent) : '--'}
          </Badge>
        </div>
      </div>
      {quote && (
        <div className="flex gap-4 mt-2 pt-2 border-t border-border/50 text-xs text-text-dim font-mono tabular-nums">
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
