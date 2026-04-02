import type { ChartResolution } from '../state/types';

export function formatPrice(price: number): string {
  if (price === 0 || isNaN(price)) return '---.--';
  return price.toFixed(2);
}

export function formatPercent(pct: number): string {
  if (isNaN(pct)) return '--.--';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatVolume(vol: number): string {
  if (!vol || isNaN(vol)) return '--';
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(1) + 'B';
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(1) + 'K';
  return vol.toString();
}

export function formatChange(change: number): string {
  if (isNaN(change)) return '--';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

export function formatCandleTime(timestamp: number, _resolution?: ChartResolution): string {
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${yy} ${hh}:${min}`;
}

/** Strip Yahoo suffixes (=X, =F) for display */
export function displaySymbol(symbol: string): string {
  return symbol.replace(/=X$/, '').replace(/=F$/, '');
}

export function formatResolutionShort(res: ChartResolution): string {
  switch (res) {
    case '1': return 'M1';
    case '5': return 'M5';
    case '15': return 'M15';
    case '60': return 'H1';
    case 'D': return 'D';
    case 'W': return 'W';
    case 'M': return 'Mo';
    default: return res;
  }
}
