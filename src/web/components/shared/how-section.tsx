import type { ReactNode } from 'react';
import { Card } from 'even-toolkit/web';

interface HowSectionProps {
  title: string;
  children: ReactNode;
}

function HowSection({ title, children }: HowSectionProps) {
  return (
    <Card>
      <h2 className="text-[13px] tracking-[-0.13px] font-normal text-text mb-2">{title}</h2>
      <div className="text-text-dim text-[13px] tracking-[-0.13px] leading-relaxed [&_p]:my-1 [&_ul]:pl-5 [&_ul]:my-1 [&_strong]:text-text">
        {children}
      </div>
    </Card>
  );
}

export { HowSection };
