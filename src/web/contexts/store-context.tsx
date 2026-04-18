import { createContext, useContext, type ReactNode } from 'react';
import type { Store } from '../../state/store';

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStoreContext(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStoreContext must be used within a StoreProvider');
  return store;
}
