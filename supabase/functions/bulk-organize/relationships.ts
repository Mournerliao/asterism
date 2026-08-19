import { BulkExecutionError } from './executor.ts';
import type { BulkOperationItem, BulkRelationType } from './handler.ts';

export interface RelationshipStore {
  ownsRepository: (userId: string, repoId: string) => Promise<boolean>;
  ownsTarget: (
    userId: string,
    relationType: BulkRelationType,
    targetId: string,
  ) => Promise<boolean>;
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
  if (item.relationType !== 'collection') {
    throw new BulkExecutionError(
      'terminal',
      'relation_type_retired',
      'Tag memberships can no longer be applied.',
    );
  }
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
      'The collection is no longer available.',
    );
  }

  return store.mutateCollectionRelationship(userId, item);
}
