import { cn } from '@asterism/ui';
import type { ReactNode } from 'react';

export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn('min-w-0', className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
