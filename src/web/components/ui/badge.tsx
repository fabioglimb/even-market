import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium font-mono tabular-nums',
  {
    variants: {
      variant: {
        positive: 'bg-positive-alpha text-positive',
        negative: 'bg-negative-alpha text-negative',
        accent: 'bg-accent-alpha text-accent',
        neutral: 'bg-surface-light text-text-dim',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  ),
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
export type { BadgeProps };
