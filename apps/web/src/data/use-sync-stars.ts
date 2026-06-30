import { invokeSyncStars } from '@asterism/db';
import { toast } from '@asterism/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { repoKeys } from './keys';

const NO_PROVIDER_TOKEN = 'NO_PROVIDER_TOKEN';

/** 触发 stars 同步（Edge Function），并在完成后刷新仓库列表 + sonner 进度反馈。 */
export function useSyncStars() {
  const { t } = useTranslation();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: () => {
      const providerToken = session?.provider_token;
      if (!providerToken) {
        throw new Error(NO_PROVIDER_TOKEN);
      }
      return invokeSyncStars(supabase, providerToken);
    },
    onSuccess: (result) => {
      toast.success(t('sync.success', { count: result.starsLinked }));
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: repoKeys.starred(userId) });
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error && error.message === NO_PROVIDER_TOKEN
          ? t('sync.noToken')
          : t('sync.error');
      toast.error(message);
    },
  });
}
