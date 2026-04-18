import type { GraphicEntry } from '../../state/types';
import { useSelector } from './use-store';

export function useGraphics(): GraphicEntry[] {
  return useSelector((s) => s.settings.graphics);
}
