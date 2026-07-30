export type OrganizationTaskStatus =
  | 'clarifying'
  | 'discovering'
  | 'awaiting_generation_approval'
  | 'generation_approved'
  | 'generating'
  | 'generation_paused'
  | 'needs_attention'
  | 'plan_ready'
  | 'ended';

export type OrganizationCandidateReason =
  | { kind: 'goal_term'; value: string }
  | { kind: 'unorganized' }
  | { kind: 'archived' }
  | { kind: 'recently_starred' }
  | { kind: 'precise_context' }
  | { kind: 'derived_similarity'; value: number };

export interface OrganizationDiscoveryRepository {
  id: string;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: readonly string[];
  archived: boolean;
  starredAt: string | null;
  tags: ReadonlyArray<{ id: string; name: string }>;
  collections: ReadonlyArray<{ id: string; name: string }>;
  note: string | null;
  derivedEmbedding: {
    model: string;
    contentHash: string;
    vector: readonly number[];
  } | null;
}

export interface OrganizationCandidateSnapshot {
  taskId: string;
  revision: number;
  discoveryVersion: string;
  libraryCount: number;
  candidateCount: number;
  fingerprint: string;
  items: Array<{
    repositoryId: string;
    contentFingerprint: string;
    included: boolean;
    reasons: OrganizationCandidateReason[];
  }>;
}

export interface OrganizationGenerationManifest {
  taskId: string;
  snapshotRevision: number;
  candidateCount: number;
  pageCount: number;
  maxInitialCalls: number;
  maxRetryCalls: number;
  maxTotalCalls: number;
  estimatedTokenCeiling: number;
  monetaryCost: { kind: 'unknown' };
  fields: Array<
    'full_name' | 'description' | 'language' | 'topics' | 'tags' | 'collections' | 'note'
  >;
  truncation: {
    descriptionCodePoints: number;
    noteCodePoints: number;
  };
  connection: {
    id: string;
    adapter: string;
    model: string;
  };
  pages: Array<{
    key: string;
    index: number;
    repositoryIds: string[];
  }>;
  fingerprint: string;
}

export interface OrganizationTaskMessage {
  id: string;
  role: 'user' | 'assistant' | 'checkpoint';
  text: string;
  checkpointType: 'goal' | 'discovery' | 'generation_approval' | 'ended' | null;
  checkpointRevision: number | null;
  createdAt: string;
}

export interface OrganizationGenerationApproval {
  revision: number;
  manifestFingerprint: string;
  approvedAt: string;
}

export type OrganizationGenerationPageStatus =
  | 'pending'
  | 'leased'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface OrganizationGenerationRunPage {
  key: string;
  index: number;
  status: OrganizationGenerationPageStatus;
  attemptCount: number;
  errorCode: string | null;
}

export interface OrganizationGenerationRunView {
  approvalTaskRevision: number;
  pages: OrganizationGenerationRunPage[];
  callsUsed: number;
  maxTotalCalls: number;
  tokensUsed: number;
  estimatedTokenCeiling: number;
  maxAttemptsPerPage: number;
}

/**
 * Outcome of advancing one bounded generation page. Consumers (data layer, UI)
 * key off `outcome` to decide whether to keep driving the loop (`page_succeeded`),
 * surface a recoverable failure (`page_failed`), stop on a finalized Plan
 * (`plan_ready`), or yield without further calls (`attention` / `in_flight` /
 * `not_generating`).
 */
export type OrganizationGenerationRunOutcome =
  | 'page_succeeded'
  | 'page_failed'
  | 'plan_ready'
  | 'attention'
  | 'in_flight'
  | 'not_generating';

export interface OrganizationGenerationRunResult {
  outcome: OrganizationGenerationRunOutcome;
  attentionCode?: string;
  planRevision?: number;
  status?: string;
}

export interface OrganizationPlanSummary {
  revision: number;
  actionCount: number;
  conflictCount: number;
  uncertaintyCount: number;
  preconditionFingerprint: string;
  fingerprint: string;
  createdAt: string;
}

export interface OrganizationTaskView {
  id: string;
  origin: 'direct_goal' | 'opportunity';
  status: OrganizationTaskStatus;
  goal: string;
  suggestedGoal: string | null;
  contextRepositoryIds: string[];
  revision: number;
  snapshot: OrganizationCandidateSnapshot | null;
  manifest: OrganizationGenerationManifest | null;
  generationApproval: OrganizationGenerationApproval | null;
  generationRun: OrganizationGenerationRunView | null;
  attentionCode: string | null;
  plans: OrganizationPlanSummary[];
  messages: OrganizationTaskMessage[];
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationOpportunityView {
  id: string;
  kind: 'initial_order' | 'new_stars';
  repositoryCount: number;
  status: 'available' | 'accepted' | 'ignored';
  createdAt: string;
}

export type OrganizationTaskErrorCode =
  | 'organization_task_conflict'
  | 'organization_task_ended'
  | 'organization_task_invalid_transition'
  | 'organization_manifest_invalid';

export class OrganizationTaskDomainError extends Error {
  constructor(readonly code: OrganizationTaskErrorCode) {
    super(code);
    this.name = 'OrganizationTaskDomainError';
  }
}

function stableHash(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function truncateCodePoints(value: string | null, limit: number): string | null {
  return value === null ? null : [...value].slice(0, Math.max(0, limit)).join('');
}

export function buildOrganizationRepositoryContentFingerprint(
  repository: OrganizationDiscoveryRepository,
  policy: {
    includeNotes: boolean;
    descriptionCodePointLimit: number;
    noteCodePointLimit: number;
  },
): string {
  return stableHash({
    fullName: repository.fullName,
    description: truncateCodePoints(repository.description, policy.descriptionCodePointLimit),
    language: repository.language,
    topics: [...repository.topics],
    archived: repository.archived,
    starredAt: repository.starredAt,
    tags: [...repository.tags].sort((left, right) => left.id.localeCompare(right.id)),
    collections: [...repository.collections].sort((left, right) => left.id.localeCompare(right.id)),
    note: policy.includeNotes
      ? truncateCodePoints(repository.note, policy.noteCodePointLimit)
      : null,
    derivedBasis: repository.derivedEmbedding
      ? {
          model: repository.derivedEmbedding.model,
          contentHash: repository.derivedEmbedding.contentHash,
        }
      : null,
  });
}

const LEGAL_TRANSITIONS: Record<OrganizationTaskStatus, ReadonlySet<OrganizationTaskStatus>> = {
  clarifying: new Set(['discovering', 'ended']),
  discovering: new Set(['awaiting_generation_approval', 'clarifying', 'ended']),
  awaiting_generation_approval: new Set([
    'clarifying',
    'discovering',
    'generation_approved',
    'ended',
  ]),
  generation_approved: new Set(['generating', 'clarifying', 'ended']),
  generating: new Set(['generation_paused', 'needs_attention', 'plan_ready', 'ended']),
  generation_paused: new Set(['generating', 'ended']),
  needs_attention: new Set(['generating', 'clarifying', 'ended']),
  plan_ready: new Set(['clarifying', 'ended']),
  ended: new Set(),
};

export function transitionOrganizationTask(
  current: {
    status: OrganizationTaskStatus;
    revision: number;
    endedAt: string | null;
  },
  change: {
    expectedRevision: number;
    to: OrganizationTaskStatus;
    endedAt?: string;
  },
) {
  if (current.status === 'ended') {
    throw new OrganizationTaskDomainError('organization_task_ended');
  }
  if (current.revision !== change.expectedRevision) {
    throw new OrganizationTaskDomainError('organization_task_conflict');
  }
  if (!LEGAL_TRANSITIONS[current.status].has(change.to)) {
    throw new OrganizationTaskDomainError('organization_task_invalid_transition');
  }
  return {
    status: change.to,
    revision: current.revision + 1,
    endedAt: change.to === 'ended' ? (change.endedAt ?? new Date().toISOString()) : null,
  };
}

const GOAL_STOP_WORDS = new Set([
  'active',
  'all',
  'and',
  'archived',
  'build',
  'classify',
  'create',
  'for',
  'github',
  'group',
  'initial',
  'into',
  'make',
  'my',
  'new',
  'newly',
  'of',
  'organize',
  'organization',
  'order',
  'please',
  'recent',
  'recently',
  'repositories',
  'repository',
  'sort',
  'stars',
  'the',
  'to',
  'useful',
]);

function tokenize(value: string): string[] {
  return value
    .toLocaleLowerCase('en')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3);
}

function normalizeToken(token: string): string {
  return token.endsWith('s') && token.length > 4 ? token.slice(0, -1) : token;
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number | null {
  if (left.length === 0 || left.length !== right.length) return null;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return null;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return null;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

export function buildCandidateSnapshot(input: {
  taskId: string;
  revision: number;
  goal: string;
  repositories: readonly OrganizationDiscoveryRepository[];
  discoveryVersion: string;
  contextRepositoryIds?: readonly string[];
  goalEmbedding?: { model: string; vector: readonly number[] } | null;
  includeNotes?: boolean;
  descriptionCodePointLimit?: number;
  noteCodePointLimit?: number;
}): OrganizationCandidateSnapshot {
  const rawGoalTokens = tokenize(input.goal);
  const goalTokens = [
    ...new Set(
      rawGoalTokens.filter((token) => /^[a-z0-9]+$/.test(token) && !GOAL_STOP_WORDS.has(token)),
    ),
  ];
  const activeOnly = rawGoalTokens.includes('active');
  const archivedOnly = rawGoalTokens.includes('archived');
  const recentOnly = rawGoalTokens.some((token) =>
    ['new', 'newly', 'recent', 'recently'].includes(token),
  );
  const newestStarredAt = Math.max(
    ...input.repositories.map((repository) =>
      repository.starredAt ? Date.parse(repository.starredAt) : Number.NEGATIVE_INFINITY,
    ),
  );
  const recentBoundary = newestStarredAt - 90 * 24 * 60 * 60 * 1_000;
  const preciseContext = new Set(input.contextRepositoryIds ?? []);
  const items = [...input.repositories]
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((repository) => {
      const exact = preciseContext.has(repository.id);
      if (preciseContext.size > 0 && !exact) return [];
      if (activeOnly && repository.archived && !exact) return [];
      if (archivedOnly && !repository.archived && !exact) return [];
      if (
        recentOnly &&
        (!repository.starredAt || Date.parse(repository.starredAt) < recentBoundary) &&
        !exact
      ) {
        return [];
      }
      const searchable = new Set(
        tokenize(
          [
            repository.fullName,
            repository.description,
            repository.language,
            ...repository.topics,
            ...repository.tags.map((tag) => tag.name),
            ...repository.collections.map((collection) => collection.name),
          ]
            .filter((value): value is string => Boolean(value))
            .join(' '),
        ).map(normalizeToken),
      );
      const matchedTerms = goalTokens.filter((term) => searchable.has(normalizeToken(term)));
      const derivedSimilarity =
        input.goalEmbedding && repository.derivedEmbedding?.model === input.goalEmbedding.model
          ? cosineSimilarity(repository.derivedEmbedding.vector, input.goalEmbedding.vector)
          : null;
      const derivedMatch = derivedSimilarity !== null && derivedSimilarity >= 0.8;
      if (goalTokens.length > 0 && matchedTerms.length === 0 && !derivedMatch && !exact) return [];
      if (goalTokens.length === 0 && input.goalEmbedding && !derivedMatch && !exact) return [];
      const reasons: OrganizationCandidateReason[] = matchedTerms.map((value) => ({
        kind: 'goal_term',
        value,
      }));
      if (matchedTerms.length === 0 && derivedMatch) {
        reasons.push({
          kind: 'derived_similarity',
          value: Math.round(derivedSimilarity * 1_000) / 1_000,
        });
      }
      if (exact) reasons.push({ kind: 'precise_context' });
      if (repository.tags.length === 0 && repository.collections.length === 0) {
        reasons.push({ kind: 'unorganized' });
      }
      if (repository.archived) reasons.push({ kind: 'archived' });
      if (recentOnly) reasons.push({ kind: 'recently_starred' });
      return [
        {
          repositoryId: repository.id,
          contentFingerprint: buildOrganizationRepositoryContentFingerprint(repository, {
            includeNotes: input.includeNotes ?? false,
            descriptionCodePointLimit: input.descriptionCodePointLimit ?? 1_000,
            noteCodePointLimit: input.noteCodePointLimit ?? 2_000,
          }),
          included: true,
          reasons,
        },
      ];
    });
  const immutable = {
    taskId: input.taskId,
    revision: input.revision,
    discoveryVersion: input.discoveryVersion,
    libraryCount: input.repositories.length,
    candidateCount: items.length,
    items,
  };
  return { ...immutable, fingerprint: stableHash(immutable) };
}

export function reviseCandidateExclusion(input: {
  snapshot: OrganizationCandidateSnapshot;
  repositoryId: string;
  excluded: boolean;
}): OrganizationCandidateSnapshot {
  if (!input.snapshot.items.some((item) => item.repositoryId === input.repositoryId)) {
    throw new OrganizationTaskDomainError('organization_manifest_invalid');
  }
  const items = input.snapshot.items.map((item) =>
    item.repositoryId === input.repositoryId ? { ...item, included: !input.excluded } : item,
  );
  const immutable = {
    taskId: input.snapshot.taskId,
    revision: input.snapshot.revision + 1,
    discoveryVersion: input.snapshot.discoveryVersion,
    libraryCount: input.snapshot.libraryCount,
    candidateCount: items.filter((item) => item.included).length,
    items,
  };
  return { ...immutable, fingerprint: stableHash(immutable) };
}

export function buildGenerationManifest(input: {
  taskId: string;
  snapshotRevision: number;
  repositoryIds: readonly string[];
  connection: {
    id: string;
    adapter: string;
    model: string;
  };
  includeNotes: boolean;
  descriptionCodePointLimit: number;
  noteCodePointLimit: number;
  maxRetriesPerPage: number;
  tokenCeilingPerCall: number;
}): OrganizationGenerationManifest {
  const uniqueIds = [...new Set(input.repositoryIds)];
  if (
    uniqueIds.length === 0 ||
    uniqueIds.length !== input.repositoryIds.length ||
    input.maxRetriesPerPage < 0 ||
    !Number.isSafeInteger(input.tokenCeilingPerCall) ||
    input.tokenCeilingPerCall <= 0
  ) {
    throw new OrganizationTaskDomainError('organization_manifest_invalid');
  }
  const pages: OrganizationGenerationManifest['pages'] = [];
  for (let start = 0; start < uniqueIds.length; start += 50) {
    const repositoryIds = uniqueIds.slice(start, start + 50);
    const index = pages.length + 1;
    pages.push({
      key: stableHash({ taskId: input.taskId, snapshotRevision: input.snapshotRevision, index }),
      index,
      repositoryIds,
    });
  }
  const fields: OrganizationGenerationManifest['fields'] = [
    'full_name',
    'description',
    'language',
    'topics',
    'tags',
    'collections',
  ];
  if (input.includeNotes) fields.push('note');
  const maxInitialCalls = pages.length;
  const maxRetryCalls = pages.length * input.maxRetriesPerPage;
  const immutable = {
    taskId: input.taskId,
    snapshotRevision: input.snapshotRevision,
    candidateCount: uniqueIds.length,
    pageCount: pages.length,
    maxInitialCalls,
    maxRetryCalls,
    maxTotalCalls: maxInitialCalls + maxRetryCalls,
    estimatedTokenCeiling: (maxInitialCalls + maxRetryCalls) * input.tokenCeilingPerCall,
    monetaryCost: { kind: 'unknown' } as const,
    fields,
    truncation: {
      descriptionCodePoints: input.descriptionCodePointLimit,
      noteCodePoints: input.includeNotes ? input.noteCodePointLimit : 0,
    },
    connection: input.connection,
    pages,
  };
  return { ...immutable, fingerprint: stableHash(immutable) };
}
