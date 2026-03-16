import * as React from 'react';
import { cn } from '../../utils/cn';

interface PillProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

function Pill({ label, onRemove, className }: PillProps) {
  return (
    <span
      className={cn(
        'bg-surface border border-border px-2.5 py-1 rounded-full text-[13px] inline-flex items-center gap-1.5',
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-text-dim hover:text-negative text-xs leading-none cursor-pointer bg-transparent border-none p-0"
        >
          x
        </button>
      )}
    </span>
  );
}

export { Pill };
export type { PillProps };
