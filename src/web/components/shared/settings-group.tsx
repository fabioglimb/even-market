import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SettingsGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

function SettingsGroup({ label, children, className }: SettingsGroupProps) {
  return (
    <div className={cn('mb-5', className)}>
      <label className="block text-[13px] text-text-dim mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

export { SettingsGroup };
