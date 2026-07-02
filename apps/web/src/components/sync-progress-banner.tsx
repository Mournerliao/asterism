import { cn } from '@asterism/ui';
import { RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SyncProgressBanner({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);

  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center gap-3">
        <RefreshCwIcon className="size-5 shrink-0 animate-spin text-link" aria-hidden="true" />
        <p className="font-medium text-[13px] text-foreground">
          {t('sync.progress', { current: fmt(current), total: fmt(total) })}
        </p>
      </div>
      <div className="h-1 overflow-hidden rounded-sm bg-secondary">
        <div
          className="h-full rounded-sm bg-link transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
