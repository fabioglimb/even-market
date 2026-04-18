import type { Settings } from '../../state/types';
import { useSelector } from './use-store';

export function useSettings(): Settings {
  return useSelector((s) => s.settings);
}
