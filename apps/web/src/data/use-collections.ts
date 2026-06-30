import {
  type CollectionWithMeta,
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { collectionKeys, collectionRepoKeys } from './keys';

const NO_USER = 'NO_USER';

/** 当前用户的全部集合（带仓库计数与更新时间）。 */
export function useCollections() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? collectionKeys.list(userId) : collectionKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listCollections(supabase, userId as string),
  });
}

/** 新建集合。 */
export function useCreateCollection() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) => {
      if (!userId) {
        throw new Error(NO_USER);
      }
      return createCollection(supabase, {
        userId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      });
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: collectionKeys.list(userId) });
      }
    },
  });
}

/** 编辑集合名称 / 描述。 */
export function useUpdateCollection() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { id: string; name?: string; description?: string | null }) =>
      updateCollection(supabase, input.id, {
        name: input.name?.trim(),
        description:
          input.description === undefined ? undefined : input.description?.trim() || null,
      }),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: collectionKeys.list(userId) });
      }
    },
  });
}

/** 删除集合（关联仓库记录随级联清除）。 */
export function useDeleteCollection() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (collection: CollectionWithMeta) => deleteCollection(supabase, collection.id),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: collectionKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: collectionRepoKeys.list(userId) });
      }
    },
  });
}
