import type { AiOrganizationReviewChange } from '@asterism/db';
import {
  discardAiOrganizationDraft,
  generateAiOrganizationDraft,
  getAiOrganizationDraft,
  updateAiOrganizationDraftReview,
} from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { aiOrganizationKeys } from './keys';

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
