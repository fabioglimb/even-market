import { cn } from '../../utils/cn';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'bg-surface border border-border rounded px-1.5 py-0.5 font-mono text-xs text-text',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export { Kbd };
export type { KbdProps };
