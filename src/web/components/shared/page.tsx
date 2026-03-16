import { cn } from '../../utils/cn';
import type { ReactNode } from 'react';

interface PageProps {
  children: ReactNode;
  className?: string;
}

function Page({ children, className }: PageProps) {
  return <div className={cn('min-h-[400px]', className)}>{children}</div>;
}

export { Page };
