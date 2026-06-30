import { addRepoToCollection, listCollectionRepos, removeRepoFromCollection } from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { collectionKeys, collectionRepoKeys } from './keys';

const NO_USER = 'NO_USER';

/** 当前用户全部 collection↔repo 关联。 */
export function useCollectionRepos() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? collectionRepoKeys.list(userId) : collectionRepoKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listCollectionRepos(supabase, userId as string),
  });
}

/** 将仓库加入 / 移出集合（member 为当前是否已在集合内）。 */
export function useToggleCollectionRepo() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { collectionId: string; repoId: string; member: boolean }) => {
      if (!userId) {
        throw new Error(NO_USER);
      }
      const payload = { userId, collectionId: input.collectionId, repoId: input.repoId };
      return input.member
        ? removeRepoFromCollection(supabase, payload)
        : addRepoToCollection(supabase, payload);
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: collectionRepoKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: collectionKeys.list(userId) });
      }
    },
  });
}
