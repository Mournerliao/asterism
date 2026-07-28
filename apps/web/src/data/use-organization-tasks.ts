import { DEFAULT_EMBEDDING_MODEL, toQueryInput } from '@asterism/core';
import {
  acceptOrganizationOpportunity,
  approveOrganizationTaskGeneration,
  createOrganizationTask,
  discoverOrganizationTaskCandidates,
  endOrganizationTask,
  excludeOrganizationTaskCandidate,
  getOrganizationTask,
  ignoreOrganizationOpportunity,
  listOrganizationOpportunities,
  listOrganizationTasks,
  updateOrganizationTaskGoal,
} from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { readEmbeddingConsent } from '../lib/embedding-consent';
import { supabase } from '../lib/supabase';
import { organizationTaskKeys } from './keys';

export function useOrganizationTasks() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? organizationTaskKeys.list(userId) : organizationTaskKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listOrganizationTasks(supabase),
  });
}

export function useOrganizationTask(taskId: string | undefined) {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey:
      userId && taskId ? organizationTaskKeys.detail(userId, taskId) : organizationTaskKeys.all,
    enabled: Boolean(userId && taskId),
    queryFn: () => getOrganizationTask(supabase, taskId as string),
  });
}

export function useOrganizationOpportunities() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? organizationTaskKeys.opportunities(userId) : organizationTaskKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listOrganizationOpportunities(supabase),
  });
}

function useTaskMutation<TInput>(
  mutationFn: (input: TInput) => Promise<Awaited<ReturnType<typeof getOrganizationTask>>>,
) {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (task) => {
      if (!userId) return;
      queryClient.setQueryData(organizationTaskKeys.detail(userId, task.id), task);
      void queryClient.invalidateQueries({ queryKey: organizationTaskKeys.list(userId) });
      void queryClient.invalidateQueries({
        queryKey: organizationTaskKeys.opportunities(userId),
      });
    },
    onError: (_error, input) => {
      if (!(userId && typeof input === 'object' && input !== null && 'taskId' in input)) return;
      const taskId = (input as { taskId?: unknown }).taskId;
      if (typeof taskId === 'string') {
        void queryClient.invalidateQueries({
          queryKey: organizationTaskKeys.detail(userId, taskId),
        });
      }
    },
  });
}

export const useCreateOrganizationTask = () =>
  useTaskMutation((input: { goal: string; contextRepositoryIds?: string[] }) =>
    createOrganizationTask(supabase, input),
  );

export const useUpdateOrganizationTaskGoal = () =>
  useTaskMutation(
    (input: { taskId: string; expectedRevision: number; goal: string; message?: string }) =>
      updateOrganizationTaskGoal(supabase, input),
  );

export function useDiscoverOrganizationTask() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useTaskMutation(
    async (input: { taskId: string; expectedRevision: number; goal: string }) => {
      let goalEmbedding: { model: string; vector: readonly number[] } | null = null;
      if (userId && readEmbeddingConsent(userId)) {
        try {
          const { getEmbeddingRuntime } = await import('../lib/embedding-runtime');
          const [vector] = await getEmbeddingRuntime().embed([toQueryInput(input.goal)]);
          if (vector) goalEmbedding = { model: DEFAULT_EMBEDDING_MODEL, vector };
        } catch {
          // Derived signals are optional; public metadata discovery remains available.
        }
      }
      return discoverOrganizationTaskCandidates(supabase, {
        taskId: input.taskId,
        expectedRevision: input.expectedRevision,
        goalEmbedding,
      });
    },
  );
}

export const useExcludeOrganizationCandidate = () =>
  useTaskMutation(
    (input: {
      taskId: string;
      expectedRevision: number;
      repositoryId: string;
      excluded: boolean;
    }) => excludeOrganizationTaskCandidate(supabase, input),
  );

export const useApproveOrganizationGeneration = () =>
  useTaskMutation((input: { taskId: string; expectedRevision: number }) =>
    approveOrganizationTaskGeneration(supabase, input),
  );

export const useEndOrganizationTask = () =>
  useTaskMutation((input: { taskId: string; expectedRevision: number }) =>
    endOrganizationTask(supabase, input),
  );

export const useAcceptOrganizationOpportunity = () =>
  useTaskMutation((input: { opportunityId: string; goal: string }) =>
    acceptOrganizationOpportunity(supabase, input),
  );

export function useIgnoreOrganizationOpportunity() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opportunityId: string) => ignoreOrganizationOpportunity(supabase, opportunityId),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: organizationTaskKeys.opportunities(userId),
        });
      }
    },
  });
}
