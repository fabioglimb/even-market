import { cn } from '../../utils/cn';

interface SegmentedControlOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

function SegmentedControl({ options, value, onValueChange, className }: SegmentedControlProps) {
  return (
    <div className={cn('inline-flex gap-1 rounded-lg bg-surface-light p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onValueChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
            value === opt.value
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-dim hover:text-text',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps, SegmentedControlOption };
