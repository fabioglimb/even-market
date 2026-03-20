import type { GraphicEntry } from '../../../state/types';
import { Pill } from 'even-toolkit/web';

const RES_LABELS: Record<string, string> = {
  '1': '1min', '5': '5min', '15': '15min', '60': '1hr',
  'D': 'Daily', 'W': 'Weekly', 'M': 'Monthly',
};

interface GraphicPillsProps {
  graphics: GraphicEntry[];
  onRemove: (graphicId: string) => void;
}

function GraphicPills({ graphics, onRemove }: GraphicPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {graphics.map((g) => (
        <Pill
          key={g.id}
          label={`${g.symbol} (${RES_LABELS[g.resolution] ?? g.resolution})`}
          onRemove={() => onRemove(g.id)}
          className="font-mono"
        />
      ))}
    </div>
  );
}

export { GraphicPills };
