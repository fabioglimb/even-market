import type { GraphicEntry, StockQuote } from '../../../state/types';
import { formatPrice, formatPercent, formatChange, formatVolume, formatResolutionShort } from '../../../utils/format';
import { Button } from '../ui/button';
import { TrashIcon } from '../ui/icons';
import { TableRow, TableCell } from '../ui/table';

interface QuoteRowProps {
  graphic: GraphicEntry;
  quote: StockQuote | undefined;
  onClick: () => void;
  onRemove: () => void;
}

function QuoteRow({ graphic, quote, onClick, onRemove }: QuoteRowProps) {
  const isUp = quote ? quote.changePercent >= 0 : true;
  const colorClass = isUp ? 'text-positive' : 'text-negative';

  return (
    <TableRow onClick={onClick}>
      <TableCell className="w-8">
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
      </TableCell>
      <TableCell className="font-semibold text-accent font-sans">{graphic.symbol}</TableCell>
      <TableCell className="text-text-dim">{formatResolutionShort(graphic.resolution)}</TableCell>
      <TableCell className="text-right">{quote ? formatPrice(quote.price) : '--'}</TableCell>
      <TableCell className={`text-right ${colorClass}`}>{quote ? formatChange(quote.change) : '--'}</TableCell>
      <TableCell className={`text-right ${colorClass}`}>{quote ? formatPercent(quote.changePercent) : '--'}</TableCell>
      <TableCell className="text-right">{quote ? formatPrice(quote.high) : '--'}</TableCell>
      <TableCell className="text-right">{quote ? formatPrice(quote.low) : '--'}</TableCell>
      <TableCell className="text-right">{quote ? formatVolume(quote.volume) : '--'}</TableCell>
    </TableRow>
  );
}

export { QuoteRow };
