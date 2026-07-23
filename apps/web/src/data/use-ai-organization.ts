import type {
  AiOrganizationReviewChange,
  ConfirmAiOrganizationDraftInput,
  ConfirmAiOrganizationDraftResult,
  SupabaseClient,
} from '@asterism/db';
import {
  confirmAiOrganizationDraft,
  discardAiOrganizationDraft,
  generateAiOrganizationDraft,
  getAiOrganizationDraft,
  invokeBulkOperation,
  updateAiOrganizationDraftReview,
} from '@asterism/db';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { runBulkOperationUntilSettled } from '../lib/bulk-operation-runner';
import { supabase } from '../lib/supabase';
import {
  aiOrganizationKeys,
  bulkOperationKeys,
  collectionKeys,
  collectionRepoKeys,
  repoTagKeys,
  tagKeys,
} from './keys';

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

export function useUpdateAiOrganizationDraftReview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { expectedRevision: number; change: AiOrganizationReviewChange }) =>
      updateAiOrganizationDraftReview(supabase, input),
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

export async function confirmAndExecuteAiOrganizationDraft(
  client: SupabaseClient,
  input: ConfirmAiOrganizationDraftInput,
): Promise<ConfirmAiOrganizationDraftResult> {
  const confirmed = await confirmAiOrganizationDraft(client, input);
  await runBulkOperationUntilSettled(confirmed.operationId, 'execute', 'pending', (request) =>
    invokeBulkOperation(client, request),
  );
  return confirmed;
}

export function useConfirmAiOrganizationDraft() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const refreshAuthoritativeState = async () => {
    if (!userId) return;
    await refreshAiOrganizationConfirmationState(queryClient, userId);
  };
  return useMutation({
    mutationFn: async (input: Parameters<typeof confirmAiOrganizationDraft>[1]) => {
      return confirmAndExecuteAiOrganizationDraft(supabase, input);
    },
    onSuccess: () => {
      if (userId) queryClient.setQueryData(aiOrganizationKeys.draft(userId), null);
    },
    onSettled: refreshAuthoritativeState,
  });
}
