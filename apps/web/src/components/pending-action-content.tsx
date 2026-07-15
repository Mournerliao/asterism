import { cn } from '@asterism/ui';
import { LoaderCircleIcon, type LucideIcon } from 'lucide-react';

export function PendingActionContent({
  pending,
  idleLabel,
  pendingLabel,
  idleIcon: IdleIcon,
  iconClassName,
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
  idleIcon?: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <span className="inline-grid items-center justify-items-center">
      <span
        aria-hidden={pending}
        className={cn(
          'col-start-1 row-start-1 inline-flex items-center gap-2',
          pending && 'invisible',
        )}
      >
        {IdleIcon ? <IdleIcon className={cn('size-4', iconClassName)} aria-hidden="true" /> : null}
        {idleLabel}
      </span>
      <span
        aria-hidden={!pending}
        className={cn(
          'col-start-1 row-start-1 inline-flex items-center gap-2',
          !pending && 'invisible',
        )}
      >
        <LoaderCircleIcon
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        {pendingLabel}
      </span>
    </span>
  );
}
