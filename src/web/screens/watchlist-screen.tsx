import { useQuotes } from '../hooks/use-quotes';
import { useGraphics } from '../hooks/use-graphics';
import { useDispatch } from '../hooks/use-store';
import { Page } from '../components/shared/page';
import { ScreenHeader } from '../components/shared/screen-header';
import { TickerInput } from '../components/shared/ticker-input';
import { Table, TableHeader, TableBody, TableHead, TableRow } from '../components/ui/table';
import { QuoteRow } from '../components/shared/quote-row';

function WatchlistScreen() {
  const dispatch = useDispatch();
  const quotes = useQuotes();
  const graphics = useGraphics();

  return (
    <Page>
      <ScreenHeader
        title="EvenMarket"
        actions={
          <TickerInput
            onAdd={(symbol, resolution) =>
              dispatch({ type: 'GRAPHIC_ADD', symbol, resolution })
            }
          />
        }
      />

      <Table>
        <TableHeader>
          <TableRow className="cursor-default hover:bg-transparent">
            <TableHead>Symbol</TableHead>
            <TableHead>TF</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>%Change</TableHead>
            <TableHead>High</TableHead>
            <TableHead>Low</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead />
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
    </Page>
  );
}

export { WatchlistScreen };
