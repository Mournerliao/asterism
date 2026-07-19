import { BulkExecutionError } from './executor';
import type { BulkOperationItem, BulkRelationType } from './handler';

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
}

export async function applyRelationship(
  store: RelationshipStore,
  userId: string,
  item: BulkOperationItem,
): Promise<void> {
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

  const exists = await store.relationshipExists(userId, item);
  if (item.action === 'add') {
    if (!exists) await store.addRelationship(userId, item);
    return;
  }
  if (exists) await store.removeRelationship(userId, item);
}
