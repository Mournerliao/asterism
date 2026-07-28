import {
  buildCandidateSnapshot,
  buildGenerationManifest,
  buildOrganizationRepositoryContentFingerprint,
  type OrganizationCandidateSnapshot,
  type OrganizationDiscoveryRepository,
  type OrganizationGenerationManifest,
  type OrganizationOpportunityView,
  type OrganizationTaskView,
  reviseCandidateExclusion,
} from '../../../packages/core/src/ai/organization-task.ts';

const DISCOVERY_VERSION = 'goal-metadata-derived-v2';
const DESCRIPTION_CODE_POINT_LIMIT = 1_000;
const NOTE_CODE_POINT_LIMIT = 2_000;
const TOKEN_CEILING_PER_CALL = 128_000;
const MAX_RETRIES_PER_PAGE = 1;

interface RevisionInput {
  taskId: string;
  expectedRevision: number;
}

export interface OrganizationTaskServiceDependencies {
  createTask: (
    userId: string,
    input: {
      goal: string;
      contextRepositoryIds: string[];
      origin: 'direct_goal' | 'opportunity';
      suggestedGoal: string | null;
      opportunityId: string | null;
    },
  ) => Promise<OrganizationTaskView>;
  listTasks: (userId: string) => Promise<OrganizationTaskView[]>;
  getTask: (userId: string, taskId: string) => Promise<OrganizationTaskView | null>;
  updateGoalCas: (
    userId: string,
    input: RevisionInput & { goal: string; message: string | null },
  ) => Promise<OrganizationTaskView | null>;
  loadAuthorizedLibrary: (userId: string) => Promise<OrganizationDiscoveryRepository[]>;
  beginDiscoveryCas: (userId: string, input: RevisionInput) => Promise<OrganizationTaskView | null>;
  loadGenerationDisclosure: (userId: string) => Promise<{
    connection: { id: string; adapter: string; model: string };
    includeNotes: boolean;
  }>;
  persistDiscoveryCas: (
    userId: string,
    input: RevisionInput & {
      snapshot: OrganizationCandidateSnapshot;
      manifest: OrganizationGenerationManifest;
    },
  ) => Promise<OrganizationTaskView | null>;
  persistExclusionCas: (
    userId: string,
    input: RevisionInput & {
      snapshot: OrganizationCandidateSnapshot;
      manifest: OrganizationGenerationManifest | null;
    },
  ) => Promise<OrganizationTaskView | null>;
  persistApprovalCas: (
    userId: string,
    input: RevisionInput & { manifestFingerprint: string },
  ) => Promise<OrganizationTaskView | null>;
  persistEndCas: (userId: string, input: RevisionInput) => Promise<OrganizationTaskView | null>;
  listOpportunities: (userId: string) => Promise<OrganizationOpportunityView[]>;
  acceptOpportunity: (
    userId: string,
    opportunityId: string,
    goal: string,
  ) => Promise<OrganizationTaskView>;
  ignoreOpportunity: (userId: string, opportunityId: string) => Promise<boolean>;
}

function requireTask(
  task: OrganizationTaskView | null,
  expectedRevision?: number,
): OrganizationTaskView {
  if (!task) throw new Error('organization_task_not_found');
  if (task.status === 'ended') throw new Error('organization_task_ended');
  if (expectedRevision !== undefined && task.revision !== expectedRevision) {
    throw new Error('organization_task_conflict');
  }
  return task;
}

function requireCas(result: OrganizationTaskView | null): OrganizationTaskView {
  if (!result) throw new Error('organization_task_conflict');
  return result;
}

function manifestFor(
  taskId: string,
  snapshot: OrganizationCandidateSnapshot,
  disclosure: {
    connection: { id: string; adapter: string; model: string };
    includeNotes: boolean;
  },
): OrganizationGenerationManifest | null {
  const repositoryIds = snapshot.items
    .filter((item) => item.included)
    .map((item) => item.repositoryId);
  if (repositoryIds.length === 0) return null;
  return buildGenerationManifest({
    taskId,
    snapshotRevision: snapshot.revision,
    repositoryIds,
    connection: disclosure.connection,
    includeNotes: disclosure.includeNotes,
    descriptionCodePointLimit: DESCRIPTION_CODE_POINT_LIMIT,
    noteCodePointLimit: NOTE_CODE_POINT_LIMIT,
    maxRetriesPerPage: MAX_RETRIES_PER_PAGE,
    tokenCeilingPerCall: TOKEN_CEILING_PER_CALL,
  });
}

export function createOrganizationTaskService(dependencies: OrganizationTaskServiceDependencies) {
  return {
    listTasks: dependencies.listTasks,
    listOpportunities: dependencies.listOpportunities,
    ignoreOpportunity: dependencies.ignoreOpportunity,
    acceptOpportunity: dependencies.acceptOpportunity,

    async createTask(
      userId: string,
      input: { goal: string; contextRepositoryIds: string[] },
    ): Promise<OrganizationTaskView> {
      return dependencies.createTask(userId, {
        ...input,
        origin: 'direct_goal',
        suggestedGoal: null,
        opportunityId: null,
      });
    },

    async getTask(userId: string, taskId: string): Promise<OrganizationTaskView> {
      const task = await dependencies.getTask(userId, taskId);
      if (!task) throw new Error('organization_task_not_found');
      return task;
    },

    async updateGoal(
      userId: string,
      input: RevisionInput & { goal: string; message: string | null },
    ): Promise<OrganizationTaskView> {
      const task = requireTask(
        await dependencies.getTask(userId, input.taskId),
        input.expectedRevision,
      );
      if (!['clarifying', 'awaiting_generation_approval'].includes(task.status)) {
        throw new Error('organization_task_invalid_transition');
      }
      return requireCas(await dependencies.updateGoalCas(userId, input));
    },

    async discover(
      userId: string,
      input: RevisionInput & {
        goalEmbedding?: { model: string; vector: readonly number[] } | null;
      },
    ): Promise<OrganizationTaskView> {
      const task = requireTask(
        await dependencies.getTask(userId, input.taskId),
        input.expectedRevision,
      );
      if (!['clarifying', 'discovering', 'awaiting_generation_approval'].includes(task.status)) {
        throw new Error('organization_task_invalid_transition');
      }
      const discoveringTask =
        task.status === 'discovering'
          ? task
          : requireCas(await dependencies.beginDiscoveryCas(userId, input));
      const [repositories, disclosure] = await Promise.all([
        dependencies.loadAuthorizedLibrary(userId),
        dependencies.loadGenerationDisclosure(userId),
      ]);
      const snapshot = buildCandidateSnapshot({
        taskId: discoveringTask.id,
        revision: (discoveringTask.snapshot?.revision ?? 0) + 1,
        goal: discoveringTask.goal,
        repositories,
        discoveryVersion: DISCOVERY_VERSION,
        contextRepositoryIds: discoveringTask.contextRepositoryIds,
        goalEmbedding: input.goalEmbedding,
        includeNotes: disclosure.includeNotes,
        descriptionCodePointLimit: DESCRIPTION_CODE_POINT_LIMIT,
        noteCodePointLimit: NOTE_CODE_POINT_LIMIT,
      });
      const manifest = manifestFor(discoveringTask.id, snapshot, disclosure);
      if (!manifest) throw new Error('organization_candidates_required');
      return requireCas(
        await dependencies.persistDiscoveryCas(userId, {
          taskId: input.taskId,
          expectedRevision: discoveringTask.revision,
          snapshot,
          manifest,
        }),
      );
    },

    async excludeCandidate(
      userId: string,
      input: RevisionInput & { repositoryId: string; excluded: boolean },
    ): Promise<OrganizationTaskView> {
      const task = requireTask(
        await dependencies.getTask(userId, input.taskId),
        input.expectedRevision,
      );
      if (task.status !== 'awaiting_generation_approval' || !task.snapshot) {
        throw new Error('organization_task_invalid_transition');
      }
      const snapshot = reviseCandidateExclusion({
        snapshot: task.snapshot,
        repositoryId: input.repositoryId,
        excluded: input.excluded,
      });
      const disclosure = await dependencies.loadGenerationDisclosure(userId);
      const manifest = manifestFor(task.id, snapshot, disclosure);
      return requireCas(
        await dependencies.persistExclusionCas(userId, { ...input, snapshot, manifest }),
      );
    },

    async approveGeneration(userId: string, input: RevisionInput): Promise<OrganizationTaskView> {
      const task = requireTask(
        await dependencies.getTask(userId, input.taskId),
        input.expectedRevision,
      );
      if (task.status !== 'awaiting_generation_approval' || !task.manifest) {
        throw new Error('organization_task_invalid_transition');
      }
      const library = await dependencies.loadAuthorizedLibrary(userId);
      const authorized = new Map(library.map((repository) => [repository.id, repository]));
      const invalidCandidate = task.snapshot?.items
        .filter((item) => item.included)
        .some((item) => {
          const repository = authorized.get(item.repositoryId);
          return (
            !repository ||
            buildOrganizationRepositoryContentFingerprint(repository, {
              includeNotes: task.manifest?.fields.includes('note') ?? false,
              descriptionCodePointLimit: task.manifest?.truncation.descriptionCodePoints ?? 0,
              noteCodePointLimit: task.manifest?.truncation.noteCodePoints ?? 0,
            }) !== item.contentFingerprint
          );
        });
      if (invalidCandidate) {
        throw new Error('organization_candidate_authorization_changed');
      }
      return requireCas(
        await dependencies.persistApprovalCas(userId, {
          ...input,
          manifestFingerprint: task.manifest.fingerprint,
        }),
      );
    },

    async endTask(userId: string, input: RevisionInput): Promise<OrganizationTaskView> {
      requireTask(await dependencies.getTask(userId, input.taskId), input.expectedRevision);
      return requireCas(await dependencies.persistEndCas(userId, input));
    },
  };
}
