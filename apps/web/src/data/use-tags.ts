import { pickTagColor } from '@asterism/core';
import { createTag, deleteTag, listTags, type TagWithCount, updateTag } from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { repoTagKeys, tagKeys } from './keys';

const NO_USER = 'NO_USER';

/** 当前用户的全部标签（带仓库计数）。 */
export function useTags() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? tagKeys.list(userId) : tagKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listTags(supabase, userId as string),
  });
}

/** 新建标签：未指定颜色时按现有标签数取调色板色。 */
export function useCreateTag() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { name: string; color?: string | null; seed?: number }) => {
      if (!userId) {
        throw new Error(NO_USER);
      }
      const color = input.color ?? pickTagColor(input.seed ?? 0);
      return createTag(supabase, { userId, name: input.name.trim(), color });
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) });
      }
    },
  });
}

/** 重命名 / 改色标签。 */
export function useUpdateTag() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { id: string; name?: string; color?: string | null }) =>
      updateTag(supabase, input.id, {
        name: input.name?.trim(),
        color: input.color,
      }),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) });
      }
    },
  });
}

/** 删除标签（关联打标签记录随级联清除）。 */
export function useDeleteTag() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (tag: TagWithCount) => deleteTag(supabase, tag.id),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: repoTagKeys.list(userId) });
      }
    },
  });
}
