import { signInWithGitHub } from '@asterism/db';
import { toast } from '@asterism/ui';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { getGitHubSessionStatus } from './github-session';
import { useSession } from './use-session';

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

export function useGitHubReconnect() {
  const { t } = useTranslation();
  const { session, loading } = useSession();
  const [reconnectPending, setReconnectPending] = useState(false);
  const status = getGitHubSessionStatus(session);

  const reconnect = useCallback(async () => {
    if (reconnectPending) {
      return;
    }

    setReconnectPending(true);
    const redirectTo = window.location.origin;

    await waitForNextPaint();

    const { error } = await signInWithGitHub(supabase, redirectTo);

    if (error) {
      setReconnectPending(false);
      toast.error(t('sync.reconnectError'), { description: error.message });
    }
  }, [reconnectPending, t]);

  return {
    session,
    loading,
    reconnectPending,
    ...status,
    reconnect,
  };
}
