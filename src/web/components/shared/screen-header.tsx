import { cn } from '../../utils/cn';
import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

function ScreenHeader({ title, subtitle, actions, className }: ScreenHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-text-dim mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export { ScreenHeader };
