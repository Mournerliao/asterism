import type {
  AiOrganizationDraft,
  AiOrganizationReviewChange,
  ConfirmAiOrganizationDraftInput,
  SupabaseClient,
} from '@asterism/db';
import {
  confirmAiOrganizationDraft,
  discardAiOrganizationDraft,
  generateAiOrganizationDraft,
  getAiOrganizationDraft,
  listBulkOperations,
  updateAiOrganizationDraftReview,
} from '@asterism/db';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import {
  aiOrganizationKeys,
  bulkOperationKeys,
  collectionKeys,
  collectionRepoKeys,
  repoTagKeys,
  tagKeys,
} from './keys';

const NO_USER = 'NO_USER';

export function useAiOrganizationDraft() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? aiOrganizationKeys.draft(userId) : aiOrganizationKeys.all,
    enabled: Boolean(userId),
    queryFn: () => getAiOrganizationDraft(supabase),
  });
}

export function useGenerateAiOrganizationDraft() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repoIds: string[]) => generateAiOrganizationDraft(supabase, repoIds),
    onSuccess: (draft) => {
      if (userId) queryClient.setQueryData(aiOrganizationKeys.draft(userId), draft);
    },
  });
}

export function useDiscardAiOrganizationDraft() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => discardAiOrganizationDraft(supabase),
    onSuccess: () => {
      if (userId) queryClient.setQueryData(aiOrganizationKeys.draft(userId), null);
    },
  });
}

function applyReviewChange(
  draft: AiOrganizationDraft,
  change: AiOrganizationReviewChange,
): AiOrganizationDraft {
  if (change.kind === 'relation') {
    return {
      ...draft,
      suggestions: {
        ...draft.suggestions,
        relationChanges: draft.suggestions.relationChanges.map((item) =>
          item.id === change.suggestionId ? { ...item, selected: change.selected } : item,
        ),
      },
    };
  }
  return {
    ...draft,
    suggestions: {
      ...draft.suggestions,
      newClassifications: draft.suggestions.newClassifications.map((item) =>
        item.id === change.suggestionId ? { ...item, approved: change.approved } : item,
      ),
    },
  };
}

export function useUpdateAiOrganizationDraftReview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    // 同一作用域串行执行，revision 在执行时从缓存读取，快速连续审阅不会自相冲突
    scope: { id: 'ai-organization-review' },
    mutationFn: (change: AiOrganizationReviewChange) => {
      if (!userId) throw new Error(NO_USER);
      const draft = queryClient.getQueryData<AiOrganizationDraft | null>(
        aiOrganizationKeys.draft(userId),
      );
      if (!draft) throw new Error('NO_DRAFT');
      return updateAiOrganizationDraftReview(supabase, {
        expectedRevision: draft.revision,
        change,
      });
    },
    onMutate: async (change) => {
      if (!userId) return { previous: undefined };
      const key = aiOrganizationKeys.draft(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AiOrganizationDraft | null>(key);
      if (previous) queryClient.setQueryData(key, applyReviewChange(previous, change));
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (userId && context?.previous !== undefined) {
        queryClient.setQueryData(aiOrganizationKeys.draft(userId), context.previous ?? null);
      }
    },
    onSuccess: async (result) => {
      if (!userId) return;
      if (result.status === 'updated') {
        queryClient.setQueryData(aiOrganizationKeys.draft(userId), result.draft);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: aiOrganizationKeys.draft(userId) });
    },
  });
}

export async function refreshAiOrganizationConfirmationState(
  queryClient: QueryClient,
  userId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: aiOrganizationKeys.draft(userId) }),
    queryClient.invalidateQueries({ queryKey: bulkOperationKeys.list(userId) }),
    queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) }),
    queryClient.invalidateQueries({ queryKey: repoTagKeys.list(userId) }),
    queryClient.invalidateQueries({ queryKey: collectionKeys.list(userId) }),
    queryClient.invalidateQueries({ queryKey: collectionRepoKeys.list(userId) }),
  ]);
}

export async function fetchBulkOperationById(
  client: SupabaseClient,
  queryClient: QueryClient,
  userId: string,
  operationId: string,
) {
  const operations = await queryClient.fetchQuery({
    queryKey: bulkOperationKeys.list(userId),
    queryFn: () => listBulkOperations(client, userId),
    staleTime: 0,
  });
  return operations.find((operation) => operation.id === operationId) ?? null;
}

export function useConfirmAiOrganizationDraft() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    // 只提交确认事务；执行进度交给批量操作横幅，不在对话框内阻塞
    mutationFn: (input: ConfirmAiOrganizationDraftInput) =>
      confirmAiOrganizationDraft(supabase, input),
    onSuccess: () => {
      if (userId) queryClient.setQueryData(aiOrganizationKeys.draft(userId), null);
    },
    onSettled: async () => {
      if (!userId) return;
      await refreshAiOrganizationConfirmationState(queryClient, userId);
    },
  });
}
