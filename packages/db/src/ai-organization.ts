import type {
  AiOrganizationDraft,
  AiOrganizationReviewChange,
  OrganizationAction,
  OrganizationRelationType,
} from '@asterism/core';
import type { SupabaseClient } from './client';

export type { AiOrganizationDraft, AiOrganizationReviewChange } from '@asterism/core';
export type AiOrganizationAction = OrganizationAction;
export type AiOrganizationRelationType = OrganizationRelationType;

const FORBIDDEN_FIELDS = [
  'credential',
  'apiKey',
  'credentialCiphertext',
  'credential_ciphertext',
  'credentialNonce',
  'credential_nonce',
  'rawOutput',
  'raw_output',
];
const ADAPTERS = new Set(['openai', 'google', 'anthropic', 'openrouter', 'openai-compatible']);

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).toSorted();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasForbiddenField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenField);
  if (!isRecord(value)) return false;
  return (
    FORBIDDEN_FIELDS.some((field) => field in value) || Object.values(value).some(hasForbiddenField)
  );
}

function isRelationType(value: unknown): value is AiOrganizationRelationType {
  return value === 'tag' || value === 'collection';
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

export function isAiOrganizationDraft(value: unknown): value is AiOrganizationDraft {
  if (
    !isRecord(value) ||
    hasForbiddenField(value) ||
    !hasExactKeys(value, [
      'createdAt',
      'generationAdapter',
      'generationConnectionId',
      'generationModel',
      'id',
      'reviewState',
      'revision',
      'sourceRepoIds',
      'suggestions',
      'updatedAt',
    ])
  ) {
    return false;
  }
  const suggestions = value.suggestions;
  if (
    !isRecord(suggestions) ||
    !hasExactKeys(suggestions, ['newClassifications', 'relationChanges', 'version']) ||
    suggestions.version !== 2
  ) {
    return false;
  }
  if (
    !Array.isArray(suggestions.relationChanges) ||
    !Array.isArray(suggestions.newClassifications)
  ) {
    return false;
  }
  const relationsValid = suggestions.relationChanges.every(
    (entry) =>
      isRecord(entry) &&
      hasExactKeys(entry, ['action', 'id', 'relationType', 'repoId', 'selected', 'targetId']) &&
      isId(entry.id) &&
      typeof entry.repoId === 'string' &&
      isRelationType(entry.relationType) &&
      (entry.action === 'add' || entry.action === 'remove') &&
      typeof entry.targetId === 'string' &&
      typeof entry.selected === 'boolean',
  );
  const newValid = suggestions.newClassifications.every(
    (entry) =>
      isRecord(entry) &&
      hasExactKeys(entry, ['approved', 'id', 'name', 'relationType', 'repoIds']) &&
      isId(entry.id) &&
      isRelationType(entry.relationType) &&
      typeof entry.name === 'string' &&
      Array.isArray(entry.repoIds) &&
      entry.repoIds.every((repoId) => typeof repoId === 'string') &&
      typeof entry.approved === 'boolean',
  );
  return (
    relationsValid &&
    newValid &&
    typeof value.id === 'string' &&
    Array.isArray(value.sourceRepoIds) &&
    value.sourceRepoIds.length >= 1 &&
    value.sourceRepoIds.length <= 50 &&
    new Set(value.sourceRepoIds).size === value.sourceRepoIds.length &&
    value.sourceRepoIds.every((repoId) => typeof repoId === 'string') &&
    typeof value.generationConnectionId === 'string' &&
    ADAPTERS.has(value.generationAdapter as string) &&
    typeof value.generationModel === 'string' &&
    value.reviewState === 'review' &&
    Number.isInteger(value.revision) &&
    (value.revision as number) >= 1 &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

async function invoke(client: SupabaseClient, body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.functions.invoke<unknown>('manage-ai-organization', {
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
    throw error instanceof Error ? error : new Error('ai_organization_failed');
  }
  return data;
}

function readDraft(value: unknown, nullable: false): AiOrganizationDraft;
function readDraft(value: unknown, nullable: true): AiOrganizationDraft | null;
function readDraft(value: unknown, nullable: boolean): AiOrganizationDraft | null {
  const draft = (value as { draft?: unknown } | null)?.draft;
  if (nullable && draft === null) return null;
  if (!isAiOrganizationDraft(draft)) {
    throw new Error('manage-ai-organization returned an invalid response');
  }
  return draft;
}

export async function generateAiOrganizationDraft(
  client: SupabaseClient,
  repoIds: string[],
): Promise<AiOrganizationDraft> {
  return readDraft(await invoke(client, { action: 'generate', repoIds }), false);
}

export async function getAiOrganizationDraft(
  client: SupabaseClient,
): Promise<AiOrganizationDraft | null> {
  return readDraft(await invoke(client, { action: 'read' }), true);
}

export async function discardAiOrganizationDraft(client: SupabaseClient): Promise<boolean> {
  const data = await invoke(client, { action: 'discard' });
  const discarded = (data as { discarded?: unknown } | null)?.discarded;
  if (typeof discarded !== 'boolean') {
    throw new Error('manage-ai-organization returned an invalid response');
  }
  return discarded;
}

export type AiOrganizationReviewUpdateResult =
  | { status: 'updated'; draft: AiOrganizationDraft }
  | { status: 'conflict' };

export async function updateAiOrganizationDraftReview(
  client: SupabaseClient,
  input: { expectedRevision: number; change: AiOrganizationReviewChange },
): Promise<AiOrganizationReviewUpdateResult> {
  const data = await invoke(client, {
    action: 'update-review',
    expectedRevision: input.expectedRevision,
    change: input.change,
  });
  const response = data as { status?: unknown; draft?: unknown } | null;
  if (response?.status === 'conflict' && Object.keys(response).length === 1) {
    return { status: 'conflict' };
  }
  if (response?.status === 'updated' && isAiOrganizationDraft(response.draft)) {
    return { status: 'updated', draft: response.draft };
  }
  throw new Error('manage-ai-organization returned an invalid response');
}

export interface ConfirmAiOrganizationDraftInput {
  draftId: string;
  expectedRevision: number;
  suggestions: AiOrganizationDraft['suggestions'];
}

export interface ConfirmAiOrganizationDraftResult {
  status: 'confirmed';
  operationId: string;
}

export type AiOrganizationConfirmationErrorCode =
  | 'draft_confirmation_conflict'
  | 'draft_repository_invalid'
  | 'draft_target_invalid'
  | 'draft_confirmation_invalid';

const CONFIRMATION_ERROR_CODES = new Set<AiOrganizationConfirmationErrorCode>([
  'draft_confirmation_conflict',
  'draft_repository_invalid',
  'draft_target_invalid',
  'draft_confirmation_invalid',
]);

export class AiOrganizationConfirmationError extends Error {
  constructor(readonly code: AiOrganizationConfirmationErrorCode) {
    super(code);
    this.name = 'AiOrganizationConfirmationError';
  }
}

export async function confirmAiOrganizationDraft(
  client: SupabaseClient,
  input: ConfirmAiOrganizationDraftInput,
): Promise<ConfirmAiOrganizationDraftResult> {
  let data: unknown;
  try {
    data = await invoke(client, {
      action: 'confirm',
      draftId: input.draftId,
      expectedRevision: input.expectedRevision,
      suggestions: input.suggestions,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      CONFIRMATION_ERROR_CODES.has(error.message as AiOrganizationConfirmationErrorCode)
    ) {
      throw new AiOrganizationConfirmationError(
        error.message as AiOrganizationConfirmationErrorCode,
      );
    }
    throw error;
  }
  if (
    !isRecord(data) ||
    !hasExactKeys(data, ['operationId', 'status']) ||
    data.status !== 'confirmed' ||
    !isId(data.operationId)
  ) {
    throw new Error('manage-ai-organization returned an invalid response');
  }
  return { status: 'confirmed', operationId: data.operationId };
}
