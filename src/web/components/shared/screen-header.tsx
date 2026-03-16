import { cn } from '../../utils/cn';
import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  actions?: ReactNode;
  className?: string;
}

function ScreenHeader({ title, actions, className }: ScreenHeaderProps) {
  return (
    <div className={cn('flex items-center gap-4 mb-4 flex-wrap', className)}>
      <h1 className="text-[22px] font-semibold">{title}</h1>
      {actions}
    </div>
  );
}

export { ScreenHeader };
