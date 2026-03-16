import type { ReactNode } from 'react';
import { Card } from '../ui/card';

interface SettingsGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

function SettingsGroup({ label, children }: SettingsGroupProps) {
  return (
    <Card className="mb-4">
      <label className="block text-xs font-medium text-text-dim mb-2 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </Card>
  );
}

export { SettingsGroup };
