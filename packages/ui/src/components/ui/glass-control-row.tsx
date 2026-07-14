import * as React from 'react';
import { cn } from '../../lib/utils';

const GlassControlRow = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { stuck?: boolean }
>(({ children, className, stuck = false, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="glass-control-row"
    data-stuck={stuck ? 'true' : undefined}
    className={cn('asterism-glass-control-row', className)}
    {...props}
  >
    {children}
  </div>
));

GlassControlRow.displayName = 'GlassControlRow';

export { GlassControlRow };
