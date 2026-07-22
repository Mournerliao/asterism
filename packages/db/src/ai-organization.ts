import type { SupabaseClient } from './client';

export type AiOrganizationRelationType = 'tag' | 'collection';
export type AiOrganizationAction = 'add' | 'remove';

export interface AiOrganizationDraft {
  id: string;
  sourceRepoIds: string[];
  suggestions: {
    version: 1;
    relationChanges: Array<{
      repoId: string;
      relationType: AiOrganizationRelationType;
      action: AiOrganizationAction;
      targetId: string;
    }>;
    newClassifications: Array<{
      relationType: AiOrganizationRelationType;
      name: string;
      repoIds: string[];
    }>;
  };
  generationConnectionId: string;
  generationAdapter: string;
  generationModel: string;
  reviewState: 'review';
  revision: number;
  createdAt: string;
  updatedAt: string;
}

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
    suggestions.version !== 1
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
      hasExactKeys(entry, ['action', 'relationType', 'repoId', 'targetId']) &&
      typeof entry.repoId === 'string' &&
      isRelationType(entry.relationType) &&
      (entry.action === 'add' || entry.action === 'remove') &&
      typeof entry.targetId === 'string',
  );
  const newValid = suggestions.newClassifications.every(
    (entry) =>
      isRecord(entry) &&
      hasExactKeys(entry, ['name', 'relationType', 'repoIds']) &&
      isRelationType(entry.relationType) &&
      typeof entry.name === 'string' &&
      Array.isArray(entry.repoIds) &&
      entry.repoIds.every((repoId) => typeof repoId === 'string'),
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
  if (error) throw error;
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
