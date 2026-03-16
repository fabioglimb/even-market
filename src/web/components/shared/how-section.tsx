import type { ReactNode } from 'react';
import { Card } from '../ui/card';

interface HowSectionProps {
  title: string;
  children: ReactNode;
}

function HowSection({ title, children }: HowSectionProps) {
  return (
    <Card className="mb-4">
      <h2 className="text-sm font-bold tracking-tight text-text mb-2">{title}</h2>
      <div className="text-text-dim text-sm leading-relaxed [&_p]:my-1 [&_ul]:pl-5 [&_ul]:my-1 [&_strong]:text-text">
        {children}
      </div>
    </Card>
  );
}

export { HowSection };
