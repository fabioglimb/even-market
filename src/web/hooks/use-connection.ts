import type { AppState } from '../../state/types';
import { useSelector } from './use-store';

export function useConnection(): AppState['connectionStatus'] {
  return useSelector((s) => s.connectionStatus);
}
