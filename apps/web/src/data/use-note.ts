import { getNote, saveNote } from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { noteKeys } from './keys';

const NO_USER = 'NO_USER';

/** 读取某仓库的笔记正文（无则空串）。 */
export function useNote(repoId: string | null) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: noteKeys.detail(userId ?? 'anon', repoId ?? 'none'),
    enabled: Boolean(userId && repoId),
    queryFn: () => getNote(supabase, { userId: userId as string, repoId: repoId as string }),
  });
}

/** 保存笔记（空正文等价删除），完成后刷新该仓库笔记。 */
export function useSaveNote() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { repoId: string; body: string }) => {
      if (!userId) {
        throw new Error(NO_USER);
      }
      return saveNote(supabase, { userId, repoId: input.repoId, body: input.body });
    },
    onSuccess: (_result, variables) => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: noteKeys.detail(userId, variables.repoId),
        });
      }
    },
  });
}
