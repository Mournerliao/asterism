import { Button } from '@asterism/ui';
import { AlertTriangleIcon, LoaderCircleIcon, LogInIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGitHubReconnect } from '../auth/use-github-reconnect';

export function GitHubSessionBanner() {
  const { t } = useTranslation();
  const { reconnectPending, requiresReconnect, reconnect } = useGitHubReconnect();

  if (!requiresReconnect) {
    return null;
  }

  return (
    <div className="border-border border-b bg-muted/60 px-6 py-2">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-foreground">
        <AlertTriangleIcon className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1">{t('sync.reconnectNotice')}</span>
        <Button
          variant="outline"
          size="xs"
          disabled={reconnectPending}
          onClick={() => void reconnect()}
        >
          {reconnectPending ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <LogInIcon className="size-3.5" />
          )}
          {reconnectPending ? t('sync.reconnecting') : t('sync.reconnectAction')}
        </Button>
      </div>
    </div>
  );
}
