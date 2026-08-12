import { listCollectionRepos, mutateCollectionRelation } from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
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
  const requestIds = useRef(new Map<string, string>());

  return useMutation({
    mutationFn: (input: { collectionId: string; repoId: string; member: boolean }) => {
      if (!userId) {
        throw new Error(NO_USER);
      }
      const requestKey = `${input.collectionId}:${input.repoId}:${input.member ? 'remove' : 'add'}`;
      const clientRequestId = requestIds.current.get(requestKey) ?? crypto.randomUUID();
      requestIds.current.set(requestKey, clientRequestId);
      return mutateCollectionRelation(supabase, {
        collectionId: input.collectionId,
        repoId: input.repoId,
        action: input.member ? 'remove' : 'add',
        clientRequestId,
      });
    },
    onSuccess: (_result, input) => {
      requestIds.current.delete(
        `${input.collectionId}:${input.repoId}:${input.member ? 'remove' : 'add'}`,
      );
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: collectionRepoKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: collectionKeys.list(userId) });
      }
    },
  });
}
