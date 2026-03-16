import * as React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'bg-surface border border-border text-text rounded-md px-3 py-1.5 text-sm outline-none placeholder:text-text-dim uppercase w-40',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
