import { createContext, useContext, type ReactNode } from 'react';
import type { Poller } from '../../data/poller';

const PollerContext = createContext<Poller | null>(null);

export function PollerProvider({ poller, children }: { poller: Poller; children: ReactNode }) {
  return <PollerContext.Provider value={poller}>{children}</PollerContext.Provider>;
}

export function usePoller(): Poller {
  const poller = useContext(PollerContext);
  if (!poller) throw new Error('usePoller must be used within a PollerProvider');
  return poller;
}
