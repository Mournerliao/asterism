import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
  size = 'page',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  size?: 'page' | 'section';
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1
          className={
            size === 'page'
              ? 'font-bold text-page-title text-foreground tracking-tight'
              : 'font-semibold text-section-title text-foreground tracking-tight'
          }
        >
          {title}
        </h1>
        {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
