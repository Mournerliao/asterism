import type { ComponentType, ReactNode, SVGProps } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      {Icon ? <Icon className="size-8 text-muted-foreground" aria-hidden="true" /> : null}
      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
