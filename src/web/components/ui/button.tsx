import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent/90',
        outline: 'border border-border bg-surface text-text hover:border-accent',
        ghost: 'border border-border text-text-dim hover:text-text hover:border-text-dim',
        danger: 'border border-border text-text-dim hover:text-negative hover:border-negative',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'size-6 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };
