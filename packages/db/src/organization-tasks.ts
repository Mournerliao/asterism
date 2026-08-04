import type {
  OrganizationGenerationRunResult,
  OrganizationOpportunityView,
  OrganizationPlanReview,
  OrganizationTaskView,
} from '@asterism/core';
import type { SupabaseClient } from './client';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function sumValidatedIntegers(values: readonly unknown[]): number {
  return values.reduce<number>((total, value) => total + Number(value), 0);
}

const TASK_STATUSES = new Set([
  'clarifying',
  'discovering',
  'awaiting_generation_approval',
  'generation_approved',
  'generating',
  'generation_paused',
  'needs_attention',
  'plan_ready',
  'executing',
  'completed',
  'ended',
]);
const PAGE_STATUSES = new Set(['pending', 'leased', 'succeeded', 'failed', 'cancelled']);
const RUN_OUTCOMES = new Set([
  'page_succeeded',
  'page_failed',
  'plan_ready',
  'attention',
  'in_flight',
  'not_generating',
]);
const FIELDS = new Set([
  'full_name',
  'description',
  'language',
  'topics',
  'tags',
  'collections',
  'note',
]);

function isCandidateReason(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.kind === 'goal_term') {
    return hasExactKeys(value, ['kind', 'value']) && isString(value.value);
  }
  if (value.kind === 'derived_similarity') {
    return (
      hasExactKeys(value, ['kind', 'value']) &&
      typeof value.value === 'number' &&
      Number.isFinite(value.value) &&
      value.value >= -1 &&
      value.value <= 1
    );
  }
  return (
    hasExactKeys(value, ['kind']) &&
    ['unorganized', 'archived', 'recently_starred', 'precise_context'].includes(String(value.kind))
  );
}

function isSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasExactKeys(value, [
      'candidateCount',
      'discoveryVersion',
      'fingerprint',
      'items',
      'libraryCount',
      'revision',
      'taskId',
    ]) &&
    isString(value.taskId) &&
    isNonNegativeInteger(value.revision) &&
    isString(value.discoveryVersion) &&
    isNonNegativeInteger(value.libraryCount) &&
    isNonNegativeInteger(value.candidateCount) &&
    isString(value.fingerprint) &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        hasExactKeys(item, ['contentFingerprint', 'included', 'reasons', 'repositoryId']) &&
        isString(item.repositoryId) &&
        isString(item.contentFingerprint) &&
        typeof item.included === 'boolean' &&
        Array.isArray(item.reasons) &&
        item.reasons.every(isCandidateReason),
    ) &&
    value.candidateCount ===
      value.items.filter((item) => isRecord(item) && item.included === true).length
  );
}

function isManifest(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const connection = value.connection;
  const truncation = value.truncation;
  const monetaryCost = value.monetaryCost;
  return (
    hasExactKeys(value, [
      'candidateCount',
      'connection',
      'estimatedTokenCeiling',
      'fields',
      'fingerprint',
      'maxInitialCalls',
      'maxRetryCalls',
      'maxTotalCalls',
      'monetaryCost',
      'pageCount',
      'pages',
      'snapshotRevision',
      'taskId',
      'truncation',
    ]) &&
    isString(value.taskId) &&
    isNonNegativeInteger(value.snapshotRevision) &&
    isNonNegativeInteger(value.candidateCount) &&
    isNonNegativeInteger(value.pageCount) &&
    isNonNegativeInteger(value.maxInitialCalls) &&
    isNonNegativeInteger(value.maxRetryCalls) &&
    isNonNegativeInteger(value.maxTotalCalls) &&
    value.maxTotalCalls === (value.maxInitialCalls as number) + (value.maxRetryCalls as number) &&
    isNonNegativeInteger(value.estimatedTokenCeiling) &&
    Array.isArray(value.fields) &&
    value.fields.every((field) => typeof field === 'string' && FIELDS.has(field)) &&
    isRecord(truncation) &&
    hasExactKeys(truncation, ['descriptionCodePoints', 'noteCodePoints']) &&
    isNonNegativeInteger(truncation.descriptionCodePoints) &&
    isNonNegativeInteger(truncation.noteCodePoints) &&
    isRecord(connection) &&
    hasExactKeys(connection, ['adapter', 'id', 'model']) &&
    isString(connection.id) &&
    isString(connection.adapter) &&
    isString(connection.model) &&
    isRecord(monetaryCost) &&
    hasExactKeys(monetaryCost, ['kind']) &&
    monetaryCost.kind === 'unknown' &&
    Array.isArray(value.pages) &&
    value.pages.length === value.pageCount &&
    value.pages.every(
      (page) =>
        isRecord(page) &&
        hasExactKeys(page, ['index', 'key', 'repositoryIds']) &&
        isString(page.key) &&
        Number.isInteger(page.index) &&
        Array.isArray(page.repositoryIds) &&
        page.repositoryIds.length >= 1 &&
        page.repositoryIds.length <= 50 &&
        page.repositoryIds.every(isString),
    ) &&
    isString(value.fingerprint)
  );
}

function isMessage(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'checkpointRevision',
      'checkpointType',
      'createdAt',
      'id',
      'role',
      'text',
    ]) &&
    isString(value.id) &&
    ['user', 'assistant', 'checkpoint'].includes(String(value.role)) &&
    isString(value.text) &&
    (value.checkpointType === null ||
      [
        'goal',
        'discovery',
        'generation_approval',
        'generation',
        'plan',
        'execution',
        'ended',
      ].includes(String(value.checkpointType))) &&
    (value.checkpointRevision === null || isNonNegativeInteger(value.checkpointRevision)) &&
    isString(value.createdAt)
  );
}

function isGenerationRunView(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasExactKeys(value, [
      'approvalTaskRevision',
      'callsUsed',
      'estimatedTokenCeiling',
      'maxAttemptsPerPage',
      'maxTotalCalls',
      'pages',
      'tokensUsed',
    ]) &&
    isNonNegativeInteger(value.approvalTaskRevision) &&
    isNonNegativeInteger(value.callsUsed) &&
    isNonNegativeInteger(value.maxTotalCalls) &&
    isNonNegativeInteger(value.tokensUsed) &&
    isNonNegativeInteger(value.estimatedTokenCeiling) &&
    isNonNegativeInteger(value.maxAttemptsPerPage) &&
    Array.isArray(value.pages) &&
    value.pages.every(
      (page) =>
        isRecord(page) &&
        hasExactKeys(page, ['attemptCount', 'errorCode', 'index', 'key', 'status']) &&
        isString(page.key) &&
        Number.isInteger(page.index) &&
        PAGE_STATUSES.has(String(page.status)) &&
        isNonNegativeInteger(page.attemptCount) &&
        (page.errorCode === null || isString(page.errorCode)),
    )
  );
}

function isPlanSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'actionCount',
      'conflictCount',
      'createdAt',
      'fingerprint',
      'preconditionFingerprint',
      'revision',
      'uncertaintyCount',
    ]) &&
    isNonNegativeInteger(value.revision) &&
    isNonNegativeInteger(value.actionCount) &&
    isNonNegativeInteger(value.conflictCount) &&
    isNonNegativeInteger(value.uncertaintyCount) &&
    isString(value.preconditionFingerprint) &&
    isString(value.fingerprint) &&
    isString(value.createdAt)
  );
}

export function isOrganizationTask(value: unknown): value is OrganizationTaskView {
  if (!isRecord(value)) return false;
  const approval = value.generationApproval;
  const taskKeys = [
    'attentionCode',
    'contextRepositoryIds',
    'createdAt',
    'endedAt',
    'generationApproval',
    'generationRun',
    'goal',
    'id',
    'manifest',
    'messages',
    'origin',
    'plans',
    'revision',
    'snapshot',
    'status',
    'suggestedGoal',
    'updatedAt',
  ];
  const execution = value.execution;
  const validExecution =
    execution === undefined ||
    execution === null ||
    (isRecord(execution) &&
      hasExactKeys(execution, [
        'dismissed',
        'operationId',
        'operationStatus',
        'pending',
        'retryableFailed',
        'running',
        'succeeded',
        'terminalFailed',
        'total',
      ]) &&
      isString(execution.operationId) &&
      ['pending', 'running', 'needs_attention', 'completed'].includes(
        String(execution.operationStatus),
      ) &&
      [
        execution.succeeded,
        execution.retryableFailed,
        execution.terminalFailed,
        execution.dismissed,
        execution.pending,
        execution.running,
        execution.total,
      ].every(isNonNegativeInteger) &&
      sumValidatedIntegers([
        execution.succeeded,
        execution.retryableFailed,
        execution.terminalFailed,
        execution.dismissed,
        execution.pending,
        execution.running,
      ]) === execution.total);
  return (
    (hasExactKeys(value, taskKeys) || hasExactKeys(value, [...taskKeys, 'execution'])) &&
    validExecution &&
    isString(value.id) &&
    ['direct_goal', 'opportunity'].includes(String(value.origin)) &&
    TASK_STATUSES.has(String(value.status)) &&
    isString(value.goal) &&
    (value.suggestedGoal === null || isString(value.suggestedGoal)) &&
    Array.isArray(value.contextRepositoryIds) &&
    value.contextRepositoryIds.every(isString) &&
    isNonNegativeInteger(value.revision) &&
    (value.snapshot === null || isSnapshot(value.snapshot)) &&
    (value.manifest === null || isManifest(value.manifest)) &&
    (approval === null ||
      (isRecord(approval) &&
        hasExactKeys(approval, ['approvedAt', 'manifestFingerprint', 'revision']) &&
        isNonNegativeInteger(approval.revision) &&
        isString(approval.manifestFingerprint) &&
        isString(approval.approvedAt))) &&
    Array.isArray(value.messages) &&
    value.messages.every(isMessage) &&
    (value.generationRun === null || isGenerationRunView(value.generationRun)) &&
    (value.attentionCode === null || isString(value.attentionCode)) &&
    Array.isArray(value.plans) &&
    value.plans.every(isPlanSummary) &&
    (value.endedAt === null || isString(value.endedAt)) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

const REVIEW_RISKS = new Set(['existing_addition', 'new_classification', 'removal']);
const REVIEW_VALIDITIES = new Set([
  'valid',
  'repository_unauthorized',
  'target_changed',
  'precondition_changed',
  'near_match',
]);

function isPlanTarget(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.kind === 'existing') {
    return (
      hasExactKeys(value, ['id', 'kind', 'name']) &&
      isString(value.id) &&
      (value.name === null || typeof value.name === 'string')
    );
  }
  return value.kind === 'new' && hasExactKeys(value, ['kind', 'name']) && isString(value.name);
}

function isMatch(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['id', 'name']) &&
    isString(value.id) &&
    isString(value.name)
  );
}

function isReviewAction(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'action',
      'eligible',
      'evidencePages',
      'excluded',
      'id',
      'relationType',
      'repoId',
      'repositoryName',
      'risk',
      'target',
    ]) &&
    isString(value.id) &&
    isString(value.repoId) &&
    ['tag', 'collection'].includes(String(value.relationType)) &&
    ['add', 'remove'].includes(String(value.action)) &&
    ['low', 'medium', 'high'].includes(String(value.risk)) &&
    isPlanTarget(value.target) &&
    Array.isArray(value.evidencePages) &&
    value.evidencePages.every(isPositiveInteger) &&
    (value.repositoryName === null || isString(value.repositoryName)) &&
    typeof value.excluded === 'boolean' &&
    typeof value.eligible === 'boolean'
  );
}

function isReviewGroup(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'actions',
      'approved',
      'equivalentTarget',
      'fingerprint',
      'key',
      'nearMatches',
      'normalizedName',
      'relationType',
      'representativeRepositoryIds',
      'risk',
      'sourceGroupKey',
      'target',
      'validity',
    ]) &&
    isString(value.key) &&
    isString(value.sourceGroupKey) &&
    REVIEW_RISKS.has(String(value.risk)) &&
    ['tag', 'collection'].includes(String(value.relationType)) &&
    isPlanTarget(value.target) &&
    typeof value.normalizedName === 'string' &&
    Array.isArray(value.representativeRepositoryIds) &&
    value.representativeRepositoryIds.every(isString) &&
    (value.equivalentTarget === null || isMatch(value.equivalentTarget)) &&
    Array.isArray(value.nearMatches) &&
    value.nearMatches.every(isMatch) &&
    isString(value.fingerprint) &&
    typeof value.approved === 'boolean' &&
    REVIEW_VALIDITIES.has(String(value.validity)) &&
    Array.isArray(value.actions) &&
    value.actions.every(isReviewAction)
  );
}

function isReviewCounts(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['additions', 'newClassifications', 'noOps', 'removals']) &&
    isNonNegativeInteger(value.newClassifications) &&
    isNonNegativeInteger(value.additions) &&
    isNonNegativeInteger(value.removals) &&
    isNonNegativeInteger(value.noOps)
  );
}

function isReviewConflict(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['evidencePages', 'kind', 'names', 'relationType', 'repoIds']) &&
    value.kind === 'near_duplicate_names' &&
    ['tag', 'collection'].includes(String(value.relationType)) &&
    Array.isArray(value.names) &&
    value.names.every((name) => typeof name === 'string') &&
    Array.isArray(value.repoIds) &&
    value.repoIds.every(isString) &&
    Array.isArray(value.evidencePages) &&
    value.evidencePages.every(isNonNegativeInteger)
  );
}

function isUncertaintyDetail(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'unknown_repository') {
    return hasExactKeys(value, ['kind', 'repoId']) && isString(value.repoId);
  }
  if (value.kind === 'invalid_classification_name') {
    return hasExactKeys(value, ['kind', 'name']) && typeof value.name === 'string';
  }
  if (value.kind === 'unknown_target') {
    return (
      hasExactKeys(value, ['kind', 'relationType', 'targetId']) &&
      ['tag', 'collection'].includes(String(value.relationType)) &&
      isString(value.targetId)
    );
  }
  return (
    value.kind === 'conflicting_actions' &&
    hasExactKeys(value, ['kind', 'relationType', 'repoId', 'targetId']) &&
    ['tag', 'collection'].includes(String(value.relationType)) &&
    isString(value.repoId) &&
    isString(value.targetId)
  );
}

function isReviewUncertainty(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['detail', 'pageIndexes']) &&
    isUncertaintyDetail(value.detail) &&
    Array.isArray(value.pageIndexes) &&
    value.pageIndexes.every(isNonNegativeInteger)
  );
}

export function isOrganizationPlanReview(value: unknown): value is OrganizationPlanReview {
  if (
    !(
      isRecord(value) &&
      hasExactKeys(value, [
        'approvedGroupFingerprints',
        'confirmable',
        'conflicts',
        'counts',
        'groups',
        'planFingerprint',
        'planRevision',
        'taskId',
        'uncertainties',
        'version',
      ]) &&
      value.version === 1 &&
      isString(value.taskId) &&
      isPositiveInteger(value.planRevision) &&
      isString(value.planFingerprint) &&
      Array.isArray(value.groups) &&
      value.groups.every(isReviewGroup) &&
      Array.isArray(value.conflicts) &&
      value.conflicts.every(isReviewConflict) &&
      Array.isArray(value.uncertainties) &&
      value.uncertainties.every(isReviewUncertainty) &&
      isReviewCounts(value.counts) &&
      typeof value.confirmable === 'boolean' &&
      Array.isArray(value.approvedGroupFingerprints) &&
      value.approvedGroupFingerprints.every(isString)
    )
  )
    return false;

  const review = value as unknown as OrganizationPlanReview;
  const eligible = review.groups.flatMap((group) =>
    group.actions.filter((action) => action.eligible),
  );
  const approvedFingerprints = review.groups
    .filter((group) => group.approved)
    .map((group) => group.fingerprint)
    .toSorted();
  const expectedNoOps =
    review.groups.reduce((total, group) => total + group.actions.length, 0) -
    eligible.length +
    review.conflicts.reduce((total, conflict) => total + conflict.repoIds.length, 0) +
    review.uncertainties.length;
  const expectedNewClassifications = review.groups.filter(
    (group) =>
      group.risk === 'new_classification' &&
      group.approved &&
      group.equivalentTarget === null &&
      group.actions.some((action) => action.eligible),
  ).length;
  return (
    JSON.stringify(review.approvedGroupFingerprints) === JSON.stringify(approvedFingerprints) &&
    new Set(approvedFingerprints).size === approvedFingerprints.length &&
    review.counts.newClassifications === expectedNewClassifications &&
    review.counts.additions === eligible.filter((action) => action.action === 'add').length &&
    review.counts.removals === eligible.filter((action) => action.action === 'remove').length &&
    review.counts.noOps === expectedNoOps
  );
}

export function readOrganizationReviewResponse(value: unknown): OrganizationPlanReview {
  const review = isRecord(value) ? value.review : null;
  if (!isOrganizationPlanReview(review)) {
    throw new Error('manage-organization-tasks returned an invalid response');
  }
  return review;
}

export function isOrganizationOpportunity(value: unknown): value is OrganizationOpportunityView {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['createdAt', 'id', 'kind', 'repositoryCount', 'status']) &&
    isString(value.id) &&
    ['initial_order', 'new_stars'].includes(String(value.kind)) &&
    Number.isInteger(value.repositoryCount) &&
    (value.repositoryCount as number) > 0 &&
    ['available', 'accepted', 'ignored'].includes(String(value.status)) &&
    isString(value.createdAt)
  );
}

export function readOrganizationTaskResponse(value: unknown): OrganizationTaskView {
  const task = isRecord(value) ? value.task : null;
  if (!isOrganizationTask(task)) {
    throw new Error('manage-organization-tasks returned an invalid response');
  }
  return task;
}

function isRunResult(value: unknown): value is OrganizationGenerationRunResult {
  if (!isRecord(value) || !RUN_OUTCOMES.has(String(value.outcome))) return false;
  const allowed = new Set(['attentionCode', 'outcome', 'planRevision', 'status']);
  return (
    Object.keys(value).every((key) => allowed.has(key)) &&
    (value.attentionCode === undefined || isString(value.attentionCode)) &&
    (value.planRevision === undefined || isNonNegativeInteger(value.planRevision)) &&
    (value.status === undefined || isString(value.status))
  );
}

export function readOrganizationRunResponse(value: unknown): {
  task: OrganizationTaskView;
  run: OrganizationGenerationRunResult;
} {
  const record = isRecord(value) ? value : null;
  const task = record?.task;
  const run = record?.run;
  if (!isOrganizationTask(task) || !isRunResult(run)) {
    throw new Error('manage-organization-tasks returned an invalid response');
  }
  return { task, run };
}

async function invoke(client: SupabaseClient, body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.functions.invoke<unknown>('manage-organization-tasks', {
    body,
  });
  if (error) {
    const context =
      typeof error === 'object' && error !== null && 'context' in error
        ? (error as { context?: unknown }).context
        : null;
    if (context instanceof Response) {
      const payload = (await context
        .clone()
        .json()
        .catch(() => null)) as { error?: unknown } | null;
      if (typeof payload?.error === 'string') throw new Error(payload.error);
    }
    throw error instanceof Error ? error : new Error('organization_task_failed');
  }
  return data;
}

export async function createOrganizationTask(
  client: SupabaseClient,
  input: { goal: string; contextRepositoryIds?: string[] },
): Promise<OrganizationTaskView> {
  return readOrganizationTaskResponse(
    await invoke(client, {
      action: 'create',
      goal: input.goal,
      contextRepositoryIds: input.contextRepositoryIds ?? [],
    }),
  );
}

export async function listOrganizationTasks(
  client: SupabaseClient,
): Promise<OrganizationTaskView[]> {
  const value = await invoke(client, { action: 'list' });
  const tasks = isRecord(value) ? value.tasks : null;
  if (!Array.isArray(tasks) || !tasks.every(isOrganizationTask)) {
    throw new Error('manage-organization-tasks returned an invalid response');
  }
  return tasks;
}

export async function getOrganizationTask(
  client: SupabaseClient,
  taskId: string,
): Promise<OrganizationTaskView> {
  return readOrganizationTaskResponse(await invoke(client, { action: 'read', taskId }));
}

async function revisionMutation(
  client: SupabaseClient,
  body: Record<string, unknown>,
): Promise<OrganizationTaskView> {
  return readOrganizationTaskResponse(await invoke(client, body));
}

export const updateOrganizationTaskGoal = (
  client: SupabaseClient,
  input: { taskId: string; expectedRevision: number; goal: string; message?: string },
) => revisionMutation(client, { action: 'update-goal', ...input });

export const discoverOrganizationTaskCandidates = (
  client: SupabaseClient,
  input: {
    taskId: string;
    expectedRevision: number;
    goalEmbedding?: { model: string; vector: readonly number[] } | null;
  },
) => revisionMutation(client, { action: 'discover', ...input });

export const excludeOrganizationTaskCandidate = (
  client: SupabaseClient,
  input: {
    taskId: string;
    expectedRevision: number;
    repositoryId: string;
    excluded: boolean;
  },
) => revisionMutation(client, { action: 'exclude', ...input });

export const approveOrganizationTaskGeneration = (
  client: SupabaseClient,
  input: { taskId: string; expectedRevision: number },
) => revisionMutation(client, { action: 'approve-generation', ...input });

export const endOrganizationTask = (
  client: SupabaseClient,
  input: { taskId: string; expectedRevision: number },
) => revisionMutation(client, { action: 'end', ...input });

export const startOrganizationGeneration = (
  client: SupabaseClient,
  input: { taskId: string; expectedRevision: number },
) => revisionMutation(client, { action: 'start-generation', ...input });

export const pauseOrganizationGeneration = (
  client: SupabaseClient,
  input: { taskId: string; expectedRevision: number },
) => revisionMutation(client, { action: 'pause-generation', ...input });

export const resumeOrganizationGeneration = (
  client: SupabaseClient,
  input: { taskId: string; expectedRevision: number },
) => revisionMutation(client, { action: 'resume-generation', ...input });

export const retryOrganizationGeneration = (
  client: SupabaseClient,
  input: { taskId: string; expectedRevision: number },
) => revisionMutation(client, { action: 'retry-generation', ...input });

export async function runOrganizationGenerationPage(
  client: SupabaseClient,
  input: { taskId: string },
): Promise<{ task: OrganizationTaskView; run: OrganizationGenerationRunResult }> {
  return readOrganizationRunResponse(
    await invoke(client, { action: 'run-generation-page', taskId: input.taskId }),
  );
}

export async function getOrganizationPlanReview(
  client: SupabaseClient,
  input: { taskId: string; planRevision: number },
): Promise<OrganizationPlanReview> {
  return readOrganizationReviewResponse(await invoke(client, { action: 'read-review', ...input }));
}

export async function excludeOrganizationPlanAction(
  client: SupabaseClient,
  input: {
    taskId: string;
    expectedRevision: number;
    planRevision: number;
    actionId: string;
    excluded: boolean;
  },
): Promise<OrganizationPlanReview> {
  return readOrganizationReviewResponse(
    await invoke(client, { action: 'exclude-plan-action', ...input }),
  );
}

export async function reviewOrganizationPlanGroup(
  client: SupabaseClient,
  input: {
    taskId: string;
    expectedRevision: number;
    planRevision: number;
    groupKey: string;
    groupFingerprint: string;
    approved: boolean;
  },
): Promise<OrganizationPlanReview> {
  return readOrganizationReviewResponse(
    await invoke(client, { action: 'review-plan-group', ...input }),
  );
}

export async function confirmOrganizationPlan(
  client: SupabaseClient,
  input: {
    taskId: string;
    expectedRevision: number;
    planRevision: number;
    planFingerprint: string;
    groupFingerprints: string[];
    counts: OrganizationPlanReview['counts'];
  },
): Promise<{ task: OrganizationTaskView; operationId: string }> {
  const value = await invoke(client, { action: 'confirm-plan', ...input });
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['operationId', 'task']) ||
    !isString(value.operationId) ||
    !isOrganizationTask(value.task)
  ) {
    throw new Error('manage-organization-tasks returned an invalid response');
  }
  return { task: value.task, operationId: value.operationId };
}

export async function listOrganizationOpportunities(
  client: SupabaseClient,
): Promise<OrganizationOpportunityView[]> {
  const value = await invoke(client, { action: 'list-opportunities' });
  const opportunities = isRecord(value) ? value.opportunities : null;
  if (!Array.isArray(opportunities) || !opportunities.every(isOrganizationOpportunity)) {
    throw new Error('manage-organization-tasks returned an invalid response');
  }
  return opportunities;
}

export async function acceptOrganizationOpportunity(
  client: SupabaseClient,
  input: { opportunityId: string; goal: string },
): Promise<OrganizationTaskView> {
  return readOrganizationTaskResponse(
    await invoke(client, { action: 'accept-opportunity', ...input }),
  );
}

export async function ignoreOrganizationOpportunity(
  client: SupabaseClient,
  opportunityId: string,
): Promise<boolean> {
  const value = await invoke(client, { action: 'ignore-opportunity', opportunityId });
  if (!isRecord(value) || !hasExactKeys(value, ['ignored']) || value.ignored !== true) {
    throw new Error('manage-organization-tasks returned an invalid response');
  }
  return true;
}
