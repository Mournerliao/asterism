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
    <div className="asterism-glass-surface border-b px-6 py-2">
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-2 text-[13px] text-foreground sm:flex sm:items-center">
        <AlertTriangleIcon className="mt-0.5 size-4 text-warning sm:mt-0" />
        <span className="min-w-0 sm:flex-1">{t('sync.reconnectNotice')}</span>
        <Button
          variant="outline"
          size="xs"
          className="col-span-2 ml-6 min-h-10 justify-self-start sm:ml-0 sm:min-h-8"
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
