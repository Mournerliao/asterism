import {
  extractGenerationText,
  extractGenerationUsage,
  extractJsonObject,
  type GenerationAdapterId,
  isGenerationOutputTruncated,
  type OrganizationGenerationInput,
  type RawProviderResponse,
} from '../../../packages/core/src/ai/generation-registry.ts';
import {
  interpretOrganizationPageOutput,
  mergeOrganizationPlan,
  type OrganizationPageResult,
  type OrganizationPlanDocument,
  stableOrganizationHash,
} from '../../../packages/core/src/ai/organization-plan.ts';
import {
  buildCandidateSnapshot,
  buildGenerationManifest,
  buildOrganizationRepositoryContentFingerprint,
  type OrganizationCandidateSnapshot,
  type OrganizationDiscoveryRepository,
  type OrganizationGenerationManifest,
  type OrganizationGenerationRunOutcome,
  type OrganizationGenerationRunResult,
  type OrganizationOpportunityView,
  type OrganizationTaskView,
  reviseCandidateExclusion,
} from '../../../packages/core/src/ai/organization-task.ts';

const DISCOVERY_VERSION = 'goal-metadata-derived-v2';
const DESCRIPTION_CODE_POINT_LIMIT = 1_000;
const NOTE_CODE_POINT_LIMIT = 2_000;
const TOKEN_CEILING_PER_CALL = 128_000;
const MAX_RETRIES_PER_PAGE = 1;
const GENERATION_LEASE_SECONDS = 180;
const GENERATION_REQUEST_SCHEMA = 'organization-generation-v3';

interface RevisionInput {
  taskId: string;
  expectedRevision: number;
}

export interface GenerationPageClaim {
  outcome: 'claimed';
  callId: string;
  pageRunId: string;
  pageKey: string;
  pageIndex: number;
  repoIds: string[];
  attempt: number;
  leaseId: string;
  connectionId: string;
  adapter: string;
  model: string;
  fields: string[];
  descriptionCodePointLimit: number;
  noteCodePointLimit: number;
  snapshotRevision: number;
  manifestFingerprint: string;
}

export type GenerationClaimOutcome =
  | GenerationPageClaim
  | { outcome: 'not_found' }
  | { outcome: 'not_generating'; status: string }
  | { outcome: 'call_ceiling' }
  | { outcome: 'token_ceiling' }
  | { outcome: 'complete' }
  | { outcome: 'in_flight' }
  | { outcome: 'exhausted' };

export interface GenerationPageContext {
  repositories: OrganizationDiscoveryRepository[];
  contentFingerprints: Record<string, string>;
  tags: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
}

export interface PlanMergeContext {
  nextPlanRevision: number;
  pages: Array<{ pageIndex: number; result: OrganizationPageResult }>;
  existingTags: Array<{ id: string; name: string }>;
  existingCollections: Array<{ id: string; name: string }>;
  preconditions: {
    snapshotFingerprint: string;
    manifestFingerprint: string;
    candidateFingerprints: Array<{ repositoryId: string; contentFingerprint: string }>;
  };
}

export interface CompleteGenerationPageInput {
  taskId: string;
  callId: string;
  leaseId: string;
  status: 'succeeded' | 'failed';
  requestHash: string | null;
  truncation: { descriptionCodePoints: number; noteCodePoints: number } | null;
  usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
  errorCode: string | null;
  result: OrganizationPageResult | null;
}

export type GenerationRunOutcome = OrganizationGenerationRunOutcome;

export type GenerationRunResult = OrganizationGenerationRunResult;

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
  startGenerationCas: (
    userId: string,
    input: RevisionInput,
  ) => Promise<OrganizationTaskView | null>;
  pauseGenerationCas: (
    userId: string,
    input: RevisionInput,
  ) => Promise<OrganizationTaskView | null>;
  resumeGenerationCas: (
    userId: string,
    input: RevisionInput,
  ) => Promise<OrganizationTaskView | null>;
  retryGenerationRpc: (userId: string, input: RevisionInput) => Promise<{ outcome: string }>;
  flagGenerationAttention: (
    userId: string,
    input: RevisionInput & { code: string },
  ) => Promise<boolean>;
  claimGenerationPage: (
    userId: string,
    input: { taskId: string; leaseSeconds: number },
  ) => Promise<GenerationClaimOutcome>;
  completeGenerationPage: (
    userId: string,
    input: CompleteGenerationPageInput,
  ) => Promise<{ outcome: string }>;
  loadGenerationPageContext: (
    userId: string,
    input: { taskId: string; repoIds: string[]; snapshotRevision: number },
  ) => Promise<GenerationPageContext>;
  callGenerationPage: (
    userId: string,
    input: {
      connectionId: string;
      adapter: string;
      model: string;
      input: OrganizationGenerationInput;
    },
  ) => Promise<RawProviderResponse>;
  loadPlanMergeContext: (userId: string, input: { taskId: string }) => Promise<PlanMergeContext>;
  savePlan: (
    userId: string,
    input: RevisionInput & { plan: OrganizationPlanDocument },
  ) => Promise<{ outcome: string; planRevision?: number }>;
  readPlan: (
    userId: string,
    input: { taskId: string; revision: number | null },
  ) => Promise<OrganizationPlanDocument | null>;
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

function truncateCodePoints(value: string, limit: number): string {
  return Array.from(value).slice(0, limit).join('');
}

/** Build the provider input for one page, gating and truncating to the approved disclosure. */
function buildGenerationPageInput(
  claim: GenerationPageClaim,
  context: GenerationPageContext,
): OrganizationGenerationInput {
  const includeNotes = claim.fields.includes('note');
  return {
    repositories: context.repositories.map((repository) => ({
      id: repository.id,
      fullName: repository.fullName,
      description:
        repository.description === null
          ? null
          : truncateCodePoints(repository.description, claim.descriptionCodePointLimit),
      language: repository.language,
      topics: [...repository.topics],
      existingTagIds: repository.tags.map((tag) => tag.id),
      existingCollectionIds: repository.collections.map((collection) => collection.id),
      ...(includeNotes && repository.note
        ? { note: truncateCodePoints(repository.note, claim.noteCodePointLimit) }
        : {}),
    })),
    tags: context.tags,
    collections: context.collections,
  };
}

/** Never surface unsanitized upstream text: only pass through our own provider_* codes. */
function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return message.startsWith('provider_') ? message : 'provider_call_failed';
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

    async startGeneration(userId: string, input: RevisionInput): Promise<OrganizationTaskView> {
      const task = requireTask(
        await dependencies.getTask(userId, input.taskId),
        input.expectedRevision,
      );
      if (task.status !== 'generation_approved') {
        throw new Error('organization_task_invalid_transition');
      }
      return requireCas(await dependencies.startGenerationCas(userId, input));
    },

    async pauseGeneration(userId: string, input: RevisionInput): Promise<OrganizationTaskView> {
      const task = requireTask(
        await dependencies.getTask(userId, input.taskId),
        input.expectedRevision,
      );
      if (task.status !== 'generating') throw new Error('organization_task_invalid_transition');
      return requireCas(await dependencies.pauseGenerationCas(userId, input));
    },

    async resumeGeneration(userId: string, input: RevisionInput): Promise<OrganizationTaskView> {
      const task = requireTask(
        await dependencies.getTask(userId, input.taskId),
        input.expectedRevision,
      );
      if (task.status !== 'generation_paused') {
        throw new Error('organization_task_invalid_transition');
      }
      return requireCas(await dependencies.resumeGenerationCas(userId, input));
    },

    async retryGeneration(userId: string, input: RevisionInput): Promise<OrganizationTaskView> {
      const task = requireTask(
        await dependencies.getTask(userId, input.taskId),
        input.expectedRevision,
      );
      if (task.status !== 'needs_attention') {
        throw new Error('organization_task_invalid_transition');
      }
      const result = await dependencies.retryGenerationRpc(userId, input);
      if (result.outcome === 'exhausted') throw new Error('organization_retry_exhausted');
      if (result.outcome !== 'retrying') throw new Error('organization_task_conflict');
      const retried = await dependencies.getTask(userId, input.taskId);
      if (!retried) throw new Error('organization_task_not_found');
      return retried;
    },

    async readPlan(
      userId: string,
      input: { taskId: string; revision: number | null },
    ): Promise<OrganizationPlanDocument> {
      const plan = await dependencies.readPlan(userId, input);
      if (!plan) throw new Error('organization_plan_not_found');
      return plan;
    },

    /**
     * Advance one bounded generation page: claim deterministically, execute the
     * provider call, and record the attempt exactly once. When no page remains,
     * finalize by deterministically merging accepted pages into an immutable
     * Plan revision. Ceilings and exhaustion route to needs-attention.
     */
    async runGenerationPage(
      userId: string,
      input: { taskId: string },
    ): Promise<{ task: OrganizationTaskView; run: GenerationRunResult }> {
      const claim = await dependencies.claimGenerationPage(userId, {
        taskId: input.taskId,
        leaseSeconds: GENERATION_LEASE_SECONDS,
      });
      const reload = async (): Promise<OrganizationTaskView> => {
        const task = await dependencies.getTask(userId, input.taskId);
        if (!task) throw new Error('organization_task_not_found');
        return task;
      };

      if (claim.outcome === 'not_found') throw new Error('organization_task_not_found');
      if (claim.outcome === 'not_generating') {
        return { task: await reload(), run: { outcome: 'not_generating', status: claim.status } };
      }
      if (claim.outcome === 'in_flight') {
        return { task: await reload(), run: { outcome: 'in_flight' } };
      }
      if (
        claim.outcome === 'call_ceiling' ||
        claim.outcome === 'token_ceiling' ||
        claim.outcome === 'exhausted'
      ) {
        const code = claim.outcome === 'exhausted' ? 'retry_exhausted' : claim.outcome;
        const current = await reload();
        await dependencies.flagGenerationAttention(userId, {
          taskId: input.taskId,
          expectedRevision: current.revision,
          code,
        });
        return { task: await reload(), run: { outcome: 'attention', attentionCode: code } };
      }
      if (claim.outcome === 'complete') {
        const current = await reload();
        if (current.status === 'plan_ready') {
          return {
            task: current,
            run: { outcome: 'plan_ready', planRevision: current.plans[0]?.revision },
          };
        }
        const merge = await dependencies.loadPlanMergeContext(userId, { taskId: input.taskId });
        const plan = mergeOrganizationPlan({
          taskId: input.taskId,
          planRevision: merge.nextPlanRevision,
          pages: merge.pages,
          existingTags: merge.existingTags,
          existingCollections: merge.existingCollections,
          preconditions: merge.preconditions,
        });
        const saved = await dependencies.savePlan(userId, {
          taskId: input.taskId,
          expectedRevision: current.revision,
          plan,
        });
        if (saved.outcome !== 'saved') throw new Error('organization_task_conflict');
        return {
          task: await reload(),
          run: { outcome: 'plan_ready', planRevision: plan.revision },
        };
      }

      const context = await dependencies.loadGenerationPageContext(userId, {
        taskId: input.taskId,
        repoIds: claim.repoIds,
        snapshotRevision: claim.snapshotRevision,
      });
      const policy = {
        includeNotes: claim.fields.includes('note'),
        descriptionCodePointLimit: claim.descriptionCodePointLimit,
        noteCodePointLimit: claim.noteCodePointLimit,
      };
      const drift =
        context.repositories.length !== claim.repoIds.length ||
        context.repositories.some(
          (repository) =>
            buildOrganizationRepositoryContentFingerprint(repository, policy) !==
            context.contentFingerprints[repository.id],
        );
      const truncation = {
        descriptionCodePoints: claim.descriptionCodePointLimit,
        noteCodePoints: claim.noteCodePointLimit,
      };
      const emptyUsage = { inputTokens: null, outputTokens: null, totalTokens: null };

      if (drift) {
        await dependencies.completeGenerationPage(userId, {
          taskId: input.taskId,
          callId: claim.callId,
          leaseId: claim.leaseId,
          status: 'failed',
          requestHash: null,
          truncation: null,
          usage: emptyUsage,
          errorCode: 'organization_candidate_authorization_changed',
          result: null,
        });
        const current = await reload();
        await dependencies.flagGenerationAttention(userId, {
          taskId: input.taskId,
          expectedRevision: current.revision,
          code: 'authorization_changed',
        });
        return {
          task: await reload(),
          run: { outcome: 'attention', attentionCode: 'authorization_changed' },
        };
      }

      const generationInput = buildGenerationPageInput(claim, context);
      const requestHash = stableOrganizationHash({
        schema: GENERATION_REQUEST_SCHEMA,
        input: generationInput,
      });
      const validationInput = {
        repositoryIds: claim.repoIds,
        tagIds: context.tags.map((tag) => tag.id),
        collectionIds: context.collections.map((collection) => collection.id),
      };

      const failPage = async (usage: CompleteGenerationPageInput['usage'], errorCode: string) => {
        await dependencies.completeGenerationPage(userId, {
          taskId: input.taskId,
          callId: claim.callId,
          leaseId: claim.leaseId,
          status: 'failed',
          requestHash,
          truncation,
          usage,
          errorCode,
          result: null,
        });
        const current = await reload();
        await dependencies.flagGenerationAttention(userId, {
          taskId: input.taskId,
          expectedRevision: current.revision,
          code: 'page_failed',
        });
        return {
          task: await reload(),
          run: { outcome: 'attention' as const, attentionCode: 'page_failed' },
        };
      };

      let raw: RawProviderResponse;
      try {
        raw = await dependencies.callGenerationPage(userId, {
          connectionId: claim.connectionId,
          adapter: claim.adapter,
          model: claim.model,
          input: generationInput,
        });
      } catch (error) {
        return failPage(emptyUsage, sanitizeProviderError(error));
      }

      const usage = extractGenerationUsage(claim.adapter as GenerationAdapterId, raw.body);
      if (!raw.ok) return failPage(usage, `provider_http_${raw.status}`);
      if (isGenerationOutputTruncated(claim.adapter as GenerationAdapterId, raw.body)) {
        return failPage(usage, 'provider_output_truncated');
      }
      const text = extractGenerationText(claim.adapter as GenerationAdapterId, raw.body);
      const parsed = text === null ? null : extractJsonObject(text);
      const outcome = interpretOrganizationPageOutput(parsed, validationInput);
      if (!outcome.ok) return failPage(usage, outcome.reason);

      await dependencies.completeGenerationPage(userId, {
        taskId: input.taskId,
        callId: claim.callId,
        leaseId: claim.leaseId,
        status: 'succeeded',
        requestHash,
        truncation,
        usage,
        errorCode: null,
        result: outcome.result,
      });
      return { task: await reload(), run: { outcome: 'page_succeeded' } };
    },
  };
}
