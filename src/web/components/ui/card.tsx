import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const cardVariants = cva('rounded-xl border border-border bg-surface', {
  variants: {
    variant: {
      default: '',
      elevated: 'shadow-lg shadow-black/20',
      interactive: 'transition-colors hover:border-border-light',
    },
    padding: {
      default: 'p-4',
      sm: 'p-3',
      lg: 'p-6',
      none: 'p-0',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  ),
);

Card.displayName = 'Card';

export { Card, cardVariants };
export type { CardProps };
