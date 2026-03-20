import { useQuotes } from '../hooks/use-quotes';
import { useGraphics } from '../hooks/use-graphics';
import { useSettings } from '../hooks/use-settings';
import { useDispatch } from '../hooks/use-store';
import { Page, ScreenHeader, ListItem, Badge } from 'even-toolkit/web';
import { TickerInput } from '../components/shared/ticker-input';
import { formatPrice, formatPercent, formatResolutionShort } from '../../utils/format';
import { t } from '../../utils/i18n';

function WatchlistScreen() {
  const dispatch = useDispatch();
  const quotes = useQuotes();
  const graphics = useGraphics();
  const settings = useSettings();
  const lang = settings.language;

  return (
    <Page>
      <ScreenHeader
        title={t('web.title', lang)}
        subtitle={t('web.subtitle', lang)}
      />

      <TickerInput
        onAdd={(symbol, resolution) =>
          dispatch({ type: 'GRAPHIC_ADD', symbol, resolution })
        }
      />

      {/* Watchlist — swipe to delete */}
      <div className="mt-3 rounded-[6px] overflow-hidden bg-surface">
        {/* Header */}
        <div className="flex items-center px-4 py-3 bg-surface-light/50 text-[13px] tracking-[-0.13px] text-text-dim">
          <span className="flex-1">Symbol</span>
          <span className="w-12 text-center">TF</span>
          <span className="w-20 text-right">Price</span>
          <span className="w-20 text-right">Change</span>
        </div>
        {/* Rows */}
        {graphics.map((graphic) => {
          const quote = quotes[graphic.symbol];
          const isUp = quote ? quote.changePercent >= 0 : true;
          return (
            <ListItem
              key={graphic.id}
              title={graphic.symbol}
              onPress={() => dispatch({ type: 'SELECT_GRAPHIC', graphicId: graphic.id })}
              onDelete={() => dispatch({ type: 'GRAPHIC_REMOVE', graphicId: graphic.id })}
              trailing={
                <div className="flex items-center">
                  <span className="w-12 text-center text-[13px] tracking-[-0.13px] text-text-dim">
                    {formatResolutionShort(graphic.resolution)}
                  </span>
                  <span className="w-20 text-right font-mono tabular-nums text-[13px] tracking-[-0.13px]">
                    {quote ? formatPrice(quote.price) : '--'}
                  </span>
                  <span className="w-20 text-right">
                    <Badge variant={isUp ? 'positive' : 'negative'}>
                      {quote ? formatPercent(quote.changePercent) : '--'}
                    </Badge>
                  </span>
                </div>
              }
            />
          );
        })}
        {graphics.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] tracking-[-0.13px] text-text-dim">
            No stocks added. Use the input above to add symbols.
          </div>
        )}
      </div>
    </Page>
  );
}

export { WatchlistScreen };
