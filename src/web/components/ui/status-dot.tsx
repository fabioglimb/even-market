import { cn } from '../../utils/cn';

interface StatusDotProps {
  connected: boolean;
  className?: string;
}

function StatusDot({ connected, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        connected ? 'bg-positive animate-pulse-dot' : 'bg-negative',
        className,
      )}
    />
  );
}

export { StatusDot };
export type { StatusDotProps };
