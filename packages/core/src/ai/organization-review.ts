import type { OrganizationAction, OrganizationRelationType } from './generation-registry';

export type AiOrganizationReviewChange =
  | { kind: 'relation'; suggestionId: string; selected: boolean }
  | { kind: 'classification'; suggestionId: string; approved: boolean };

export interface AiOrganizationReviewSuggestions {
  version: 2;
  relationChanges: Array<{
    id: string;
    repoId: string;
    relationType: OrganizationRelationType;
    action: OrganizationAction;
    targetId: string;
    selected: boolean;
  }>;
  newClassifications: Array<{
    id: string;
    relationType: OrganizationRelationType;
    name: string;
    repoIds: string[];
    approved: boolean;
  }>;
}

export interface AiOrganizationDraft {
  id: string;
  sourceRepoIds: string[];
  suggestions: AiOrganizationReviewSuggestions;
  generationConnectionId: string;
  generationAdapter: string;
  generationModel: string;
  reviewState: 'review';
  revision: number;
  createdAt: string;
  updatedAt: string;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).toSorted();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

export function isAiOrganizationReviewSuggestions(
  value: unknown,
): value is AiOrganizationReviewSuggestions {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['newClassifications', 'relationChanges', 'version']) ||
    value.version !== 2 ||
    !Array.isArray(value.relationChanges) ||
    !Array.isArray(value.newClassifications)
  ) {
    return false;
  }
  return (
    value.relationChanges.every(
      (entry) =>
        isRecord(entry) &&
        hasExactKeys(entry, ['action', 'id', 'relationType', 'repoId', 'selected', 'targetId']) &&
        isId(entry.id) &&
        isId(entry.repoId) &&
        (entry.relationType === 'tag' || entry.relationType === 'collection') &&
        (entry.action === 'add' || entry.action === 'remove') &&
        isId(entry.targetId) &&
        typeof entry.selected === 'boolean',
    ) &&
    value.newClassifications.every(
      (entry) =>
        isRecord(entry) &&
        hasExactKeys(entry, ['approved', 'id', 'name', 'relationType', 'repoIds']) &&
        isId(entry.id) &&
        (entry.relationType === 'tag' || entry.relationType === 'collection') &&
        typeof entry.name === 'string' &&
        Array.isArray(entry.repoIds) &&
        entry.repoIds.length > 0 &&
        entry.repoIds.every(isId) &&
        new Set(entry.repoIds).size === entry.repoIds.length &&
        typeof entry.approved === 'boolean',
    )
  );
}
