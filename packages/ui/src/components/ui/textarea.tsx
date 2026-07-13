import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-[var(--glass-surface)] px-3 py-2 text-base shadow-[inset_0_1px_0_var(--glass-highlight)] outline-none backdrop-blur-[8px] transition-[color,background-color,border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out-quart)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
