import { useCallback } from 'react';
import { useSelector } from './use-store';
import type { AssetType } from '../../state/types';
import { formatPrice, convertPrice, getCurrencySymbol } from '../../utils/format';

export function useCurrency() {
  const displayCurrency = useSelector((s) => s.settings.displayCurrency);
  const fxRates = useSelector((s) => s.fxRates);

  const convert = useCallback(
    (priceUsd: number, assetType?: AssetType) => {
      // Crypto prices already come in the target currency from CoinGecko
      if (assetType === 'crypto') return priceUsd;
      return convertPrice(priceUsd, displayCurrency, fxRates);
    },
    [displayCurrency, fxRates],
  );

  const format = useCallback(
    (price: number, assetType?: AssetType) => {
      return formatPrice(convert(price, assetType), displayCurrency);
    },
    [convert, displayCurrency],
  );

  return {
    displayCurrency,
    convert,
    format,
    symbol: getCurrencySymbol(displayCurrency),
  };
}
