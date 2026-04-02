import { useQuotes } from '../hooks/use-quotes';
import { useGraphics } from '../hooks/use-graphics';
import { useSettings } from '../hooks/use-settings';
import { useSelector, useDispatch } from '../hooks/use-store';
import { ListItem, Badge, CategoryFilter } from 'even-toolkit/web';
import { TickerInput } from '../components/shared/ticker-input';
import { formatPrice, formatPercent, formatResolutionShort, displaySymbol } from '../../utils/format';
import { t } from '../../utils/i18n';
import type { AssetType } from '../../state/types';

const FILTER_OPTIONS = ['All', 'Stock', 'Crypto', 'Forex', 'Commodity'];

const FILTER_MAP: Record<string, 'all' | AssetType> = {
  All: 'all',
  Stock: 'stock',
  Crypto: 'crypto',
  Forex: 'forex',
  Commodity: 'commodity',
};

const FILTER_REVERSE: Record<string, string> = {
  all: 'All',
  stock: 'Stock',
  crypto: 'Crypto',
  forex: 'Forex',
  commodity: 'Commodity',
};

function WatchlistScreen() {
  const dispatch = useDispatch();
  const quotes = useQuotes();
  const graphics = useGraphics();
  const settings = useSettings();
  const lang = settings.language;
  const filter = useSelector((s) => s.watchlistFilter);

  const filteredGraphics = filter === 'all'
    ? graphics
    : graphics.filter((g) => (g.assetType ?? 'stock') === filter);

  return (
    <>
      <TickerInput
        onAdd={(symbol, resolution, assetType, geckoId) =>
          dispatch({ type: 'GRAPHIC_ADD', symbol, resolution, assetType, geckoId, quoteCurrency: assetType === 'crypto' ? 'usd' : undefined })
        }
      />

      {/* Category filter */}
      <div className="mt-3">
        <CategoryFilter
          categories={FILTER_OPTIONS}
          selected={FILTER_REVERSE[filter] ?? 'All'}
          onSelect={(cat) => dispatch({ type: 'WATCHLIST_FILTER', filter: FILTER_MAP[cat] ?? 'all' })}
        />
      </div>

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
        {filteredGraphics.map((graphic) => {
          const quote = quotes[graphic.symbol];
          const isUp = quote ? quote.changePercent >= 0 : true;
          return (
            <ListItem
              key={graphic.id}
              title={displaySymbol(graphic.symbol)}
              subtitle={graphic.assetType ?? 'stock'}
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
        {filteredGraphics.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] tracking-[-0.13px] text-text-dim">
            {filter === 'all'
              ? 'No stocks added. Use the input above to add symbols.'
              : `No ${filter} assets in watchlist.`}
          </div>
        )}
      </div>
    </>
  );
}

export { WatchlistScreen };
