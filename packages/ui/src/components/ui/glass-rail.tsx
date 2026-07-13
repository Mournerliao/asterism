import * as React from 'react';
import { cn } from '../../lib/utils';

type GlassRailVariant = 'glass' | 'solid';

const GlassRail = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { variant?: GlassRailVariant }
>(({ className, variant = 'glass', ...props }, ref) => (
  <div
    ref={ref}
    data-slot="glass-rail"
    className={cn(
      'w-fit max-w-full rounded-xl border p-1',
      variant === 'glass' &&
        'asterism-glass-surface border-[var(--glass-rail-border)] bg-[var(--glass-rail-bg)] backdrop-blur-[8px]',
      variant === 'solid' &&
        'border-[var(--glass-rail-solid-border)] bg-[var(--glass-rail-solid-bg)]',
      className,
    )}
    {...props}
  />
));

GlassRail.displayName = 'GlassRail';

export type { GlassRailVariant };
export { GlassRail };
