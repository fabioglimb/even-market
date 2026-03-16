import { useSyncExternalStore, useCallback } from 'react';
import type { AppState } from '../../state/types';
import { useStoreContext } from '../contexts/store-context';

export function useSelector<T>(selector: (state: AppState) => T): T {
  const store = useStoreContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return store.subscribe(onStoreChange);
    },
    [store],
  );

  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useDispatch() {
  const store = useStoreContext();
  return store.dispatch;
}

export function useStore() {
  return useStoreContext();
}
