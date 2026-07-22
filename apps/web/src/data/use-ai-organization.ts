import {
  discardAiOrganizationDraft,
  generateAiOrganizationDraft,
  getAiOrganizationDraft,
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
