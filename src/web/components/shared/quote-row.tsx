import type { GraphicEntry, StockQuote } from '../../../state/types';
import { formatPrice, formatPercent, formatChange, formatVolume, formatResolutionShort } from '../../../utils/format';
import { Button, TableRow, TableCell } from 'even-toolkit/web';

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
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </Button>
      </TableCell>
      <TableCell className="font-normal text-text">{graphic.symbol}</TableCell>
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
