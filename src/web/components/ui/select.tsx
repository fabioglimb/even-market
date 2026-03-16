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
  ({ className, options, onValueChange, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'bg-surface border border-border text-text rounded-md px-3 py-2 text-sm w-full outline-none',
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
    );
  },
);

Select.displayName = 'Select';

export { Select };
export type { SelectProps, SelectOption };
