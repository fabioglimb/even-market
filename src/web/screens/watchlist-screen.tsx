import { useQuotes } from '../hooks/use-quotes';
import { useGraphics } from '../hooks/use-graphics';
import { useDispatch } from '../hooks/use-store';
import { Page } from '../components/shared/page';
import { ScreenHeader } from '../components/shared/screen-header';
import { TickerInput } from '../components/shared/ticker-input';
import { Table, TableHeader, TableBody, TableHead, TableRow } from '../components/ui/table';
import { QuoteRow } from '../components/shared/quote-row';
import { QuoteCard } from '../components/shared/quote-card';

function WatchlistScreen() {
  const dispatch = useDispatch();
  const quotes = useQuotes();
  const graphics = useGraphics();

  return (
    <Page>
      <ScreenHeader
        title="EvenMarket"
        subtitle="Real-time market data on your glasses"
        actions={
          <TickerInput
            onAdd={(symbol, resolution) =>
              dispatch({ type: 'GRAPHIC_ADD', symbol, resolution })
            }
          />
        }
      />

      {/* Mobile: card stack */}
      <div className="flex flex-col gap-2 sm:hidden">
        {graphics.map((graphic) => (
          <QuoteCard
            key={graphic.id}
            graphic={graphic}
            quote={quotes[graphic.symbol]}
            onClick={() => dispatch({ type: 'SELECT_GRAPHIC', graphicId: graphic.id })}
            onRemove={() => dispatch({ type: 'GRAPHIC_REMOVE', graphicId: graphic.id })}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="cursor-default hover:bg-transparent">
              <TableHead className="w-8" />
              <TableHead>Symbol</TableHead>
              <TableHead>TF</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">%Change</TableHead>
              <TableHead className="text-right">High</TableHead>
              <TableHead className="text-right">Low</TableHead>
              <TableHead className="text-right">Volume</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {graphics.map((graphic) => (
              <QuoteRow
                key={graphic.id}
                graphic={graphic}
                quote={quotes[graphic.symbol]}
                onClick={() => dispatch({ type: 'SELECT_GRAPHIC', graphicId: graphic.id })}
                onRemove={() => dispatch({ type: 'GRAPHIC_REMOVE', graphicId: graphic.id })}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </Page>
  );
}

export { WatchlistScreen };
