import { describe, expect, it, vi } from 'vitest';
import { BulkExecutionError } from './executor';
import type { BulkOperationItem } from './handler';
import {
  applyRelationship,
  type RelationshipStore,
  throwCollectionMutationError,
} from './relationships';

function item(overrides: Partial<BulkOperationItem> = {}): BulkOperationItem {
  return {
    id: 'item-1',
    repoId: 'repo-1',
    relationType: 'collection',
    targetId: 'target-1',
    action: 'add',
    status: 'running',
    attemptCount: 0,
    lastErrorCode: null,
    lastErrorMessage: null,
    effectiveChanged: false,
    effectiveMutationId: null,
    effectiveRelationVersion: null,
    ...overrides,
  };
}

function store(overrides: Partial<RelationshipStore> = {}): RelationshipStore {
  return {
    ownsRepository: vi.fn().mockResolvedValue(true),
    ownsTarget: vi.fn().mockResolvedValue(true),
    mutateCollectionRelationship: vi.fn().mockResolvedValue({
      effectiveChanged: true,
      effectiveMutationId: 'mutation-1',
      effectiveRelationVersion: 2,
    }),
    ...overrides,
  };
}

describe('collection relationship writes', () => {
  it('adds a missing collection relationship through the ownership-checked interface', async () => {
    const memory = store();
    const change = item();

    await expect(applyRelationship(memory, 'user-1', change)).resolves.toEqual({
      effectiveChanged: true,
      effectiveMutationId: 'mutation-1',
      effectiveRelationVersion: 2,
    });

    expect(memory.ownsRepository).toHaveBeenCalledWith('user-1', 'repo-1');
    expect(memory.ownsTarget).toHaveBeenCalledWith('user-1', 'collection', 'target-1');
    expect(memory.mutateCollectionRelationship).toHaveBeenCalledWith('user-1', change);
  });

  it('fails historical tag items without touching collections', async () => {
    const memory = store();

    await expect(
      applyRelationship(memory, 'user-1', item({ relationType: 'tag' })),
    ).rejects.toMatchObject({
      code: 'relation_type_retired',
      kind: 'terminal',
    });
    expect(memory.ownsRepository).not.toHaveBeenCalled();
    expect(memory.mutateCollectionRelationship).not.toHaveBeenCalled();
  });

  it('rejects a repository outside the authenticated user library', async () => {
    const memory = store({ ownsRepository: vi.fn().mockResolvedValue(false) });

    await expect(applyRelationship(memory, 'user-2', item())).rejects.toMatchObject({
      code: 'repository_not_owned',
      kind: 'terminal',
    });
    expect(memory.ownsTarget).not.toHaveBeenCalled();
  });

  it('rejects a target owned by another user or deleted after confirmation', async () => {
    const memory = store({ ownsTarget: vi.fn().mockResolvedValue(false) });

    await expect(applyRelationship(memory, 'user-1', item())).rejects.toMatchObject({
      code: 'target_not_owned',
      kind: 'terminal',
    });
    expect(memory.mutateCollectionRelationship).not.toHaveBeenCalled();
  });
});

describe('collection mutation error mapping', () => {
  it('keeps Undo head drift as a terminal conflict', () => {
    expect(() => throwCollectionMutationError(new Error('undo_conflict'))).toThrowError(
      BulkExecutionError,
    );
    try {
      throwCollectionMutationError({ message: 'P0001 undo_conflict' });
    } catch (error) {
      expect(error).toMatchObject({ kind: 'terminal', code: 'undo_conflict' });
    }
  });

  it('preserves the durable write error so Retry Undo can show the real cause', () => {
    try {
      throwCollectionMutationError({ message: 'operation_item_not_owned' });
    } catch (error) {
      expect(error).toMatchObject({
        kind: 'retryable',
        code: 'relationship_write_failed',
        message: 'operation_item_not_owned',
      });
    }
  });
});
