import { AlertCircle, Check, RefreshCw } from 'lucide-react';
import { useAppState } from '@/app/app-state';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';

export function SyncButton() {
  const { syncStatus, startSync } = useAppState();
  const { t } = useI18n();
  const busy = syncStatus === 'syncing';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => startSync(true)}
      disabled={busy}
      aria-live="polite"
    >
      {syncStatus === 'done' ? (
        <Check className="text-chart-2" />
      ) : (
        <RefreshCw className={cn(busy && 'animate-spin')} />
      )}
      <span className="hidden sm:inline">
        {busy ? t('topbar.syncing') : syncStatus === 'done' ? t('topbar.synced') : t('topbar.sync')}
      </span>
    </Button>
  );
}

/** Full-width banner shown beneath the topbar while syncing / on result. */
export function SyncBanner() {
  const { syncStatus, syncPage, syncProgress, lastSyncedAt, startSync } = useAppState();
  const { t, locale } = useI18n();

  if (syncStatus === 'idle') {
    if (!lastSyncedAt) return null;
    return (
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-1.5 text-muted-foreground text-xs sm:px-6">
        <Check className="size-3.5 text-chart-2" />
        {t('sync.lastSynced', { time: timeAgo(lastSyncedAt, locale) })}
      </div>
    );
  }

  return (
    <div className="border-b bg-muted/40 px-4 py-2 sm:px-6">
      <div className="flex items-center gap-3">
        {syncStatus === 'failed' ? (
          <AlertCircle className="size-4 text-destructive" />
        ) : syncStatus === 'done' ? (
          <Check className="size-4 text-chart-2" />
        ) : (
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-sm">
              {syncStatus === 'failed'
                ? t('sync.failed')
                : syncStatus === 'done'
                  ? t('sync.done', { count: 620 })
                  : t('sync.title')}
            </span>
            {syncStatus === 'syncing' ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                {t('sync.fetching', { page: syncPage })}
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                syncStatus === 'failed' ? 'bg-destructive' : 'bg-primary',
              )}
              style={{ width: `${Math.round(syncProgress * 100)}%` }}
            />
          </div>
        </div>
        {syncStatus === 'failed' ? (
          <Button size="sm" variant="outline" onClick={() => startSync(false)}>
            {t('sync.retry')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
