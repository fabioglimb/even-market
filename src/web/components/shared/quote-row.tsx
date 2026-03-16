import type { GraphicEntry, StockQuote } from '../../../state/types';
import { formatPrice, formatPercent, formatChange, formatVolume, formatResolutionShort } from '../../../utils/format';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
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
      <TableCell className="font-semibold text-accent">{graphic.symbol}</TableCell>
      <TableCell>{formatResolutionShort(graphic.resolution)}</TableCell>
      <TableCell>{quote ? formatPrice(quote.price) : '--'}</TableCell>
      <TableCell className={colorClass}>{quote ? formatChange(quote.change) : '--'}</TableCell>
      <TableCell className={colorClass}>{quote ? formatPercent(quote.changePercent) : '--'}</TableCell>
      <TableCell>{quote ? formatPrice(quote.high) : '--'}</TableCell>
      <TableCell>{quote ? formatPrice(quote.low) : '--'}</TableCell>
      <TableCell>{quote ? formatVolume(quote.volume) : '--'}</TableCell>
      <TableCell>
        <Button
          variant="danger"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          x
        </Button>
      </TableCell>
    </TableRow>
  );
}

export { QuoteRow };
