import { addRepoTag, listRepoTags, removeRepoTag } from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { repoTagKeys, tagKeys } from './keys';

const NO_USER = 'NO_USER';

/** 当前用户全部 repo↔tag 关联（前端按 repoId 过滤即可得到单仓库标签）。 */
export function useRepoTags() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? repoTagKeys.list(userId) : repoTagKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listRepoTags(supabase, userId as string),
  });
}

/** 在仓库上增删某标签（assigned 为当前是否已打，决定增/删方向）。 */
export function useToggleRepoTag() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { repoId: string; tagId: string; assigned: boolean }) => {
      if (!userId) {
        throw new Error(NO_USER);
      }
      const payload = { userId, repoId: input.repoId, tagId: input.tagId };
      return input.assigned ? removeRepoTag(supabase, payload) : addRepoTag(supabase, payload);
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: repoTagKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) });
      }
    },
  });
}
