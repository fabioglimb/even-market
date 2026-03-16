import * as React from 'react';
import { cn } from '../../utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  onValueChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, onValueChange, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 bg-surface-light border border-border text-text rounded-lg px-4 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30 appearance-none cursor-pointer',
        className,
      )}
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
);

Select.displayName = 'Select';

export { Select };
export type { SelectProps, SelectOption };
