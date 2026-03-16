import type { ReactNode } from 'react';

interface HowSectionProps {
  title: string;
  children: ReactNode;
}

function HowSection({ title, children }: HowSectionProps) {
  return (
    <div className="mb-6">
      <h2 className="text-base text-text mb-2 border-b border-border pb-1">{title}</h2>
      <div className="text-text-dim text-sm leading-relaxed [&_p]:my-1 [&_ul]:pl-5 [&_ul]:my-1 [&_strong]:text-text">
        {children}
      </div>
    </div>
  );
}

export { HowSection };
