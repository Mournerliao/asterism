import { BulkExecutionError } from './executor.ts';
import type { BulkOperationItem, BulkRelationType } from './handler.ts';

export interface RelationshipStore {
  ownsRepository: (userId: string, repoId: string) => Promise<boolean>;
  ownsTarget: (
    userId: string,
    relationType: BulkRelationType,
    targetId: string,
  ) => Promise<boolean>;
  relationshipExists: (userId: string, item: BulkOperationItem) => Promise<boolean>;
  addRelationship: (userId: string, item: BulkOperationItem) => Promise<void>;
  removeRelationship: (userId: string, item: BulkOperationItem) => Promise<void>;
  mutateCollectionRelationship: (
    userId: string,
    item: BulkOperationItem,
  ) => Promise<RelationshipMutationResult>;
}

export interface RelationshipMutationResult {
  effectiveChanged: boolean;
  effectiveMutationId: string | null;
  effectiveRelationVersion: number | null;
}

export function throwCollectionMutationError(error: unknown): never {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'relationship_write_failed';
  if (message.includes('undo_conflict')) {
    throw new BulkExecutionError(
      'terminal',
      'undo_conflict',
      'The collection changed after this operation and was not removed.',
    );
  }
  throw new BulkExecutionError('retryable', 'relationship_write_failed', message);
}

export async function applyRelationship(
  store: RelationshipStore,
  userId: string,
  item: BulkOperationItem,
): Promise<RelationshipMutationResult> {
  if (!(await store.ownsRepository(userId, item.repoId))) {
    throw new BulkExecutionError(
      'terminal',
      'repository_not_owned',
      'The repository is no longer in your library.',
    );
  }
  if (!(await store.ownsTarget(userId, item.relationType, item.targetId))) {
    throw new BulkExecutionError(
      'terminal',
      'target_not_owned',
      'The tag or collection is no longer available.',
    );
  }

  if (item.relationType === 'collection') {
    return store.mutateCollectionRelationship(userId, item);
  }

  const exists = await store.relationshipExists(userId, item);
  if (item.action === 'add') {
    if (!exists) {
      await store.addRelationship(userId, item);
      return { effectiveChanged: true, effectiveMutationId: null, effectiveRelationVersion: null };
    }
    return { effectiveChanged: false, effectiveMutationId: null, effectiveRelationVersion: null };
  }
  if (exists) {
    await store.removeRelationship(userId, item);
    return { effectiveChanged: true, effectiveMutationId: null, effectiveRelationVersion: null };
  }
  return { effectiveChanged: false, effectiveMutationId: null, effectiveRelationVersion: null };
}
