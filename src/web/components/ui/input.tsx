import * as React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-9 bg-surface-light border border-border text-text rounded-lg px-4 text-sm outline-none placeholder:text-text-dim uppercase transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
