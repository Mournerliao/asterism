import { describe, expect, it, vi } from 'vitest';
import type { BulkOperationItem } from './handler';
import { applyRelationship, type RelationshipStore } from './relationships';

function item(overrides: Partial<BulkOperationItem> = {}): BulkOperationItem {
  return {
    id: 'item-1',
    repoId: 'repo-1',
    relationType: 'tag',
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
    relationshipExists: vi.fn().mockResolvedValue(false),
    addRelationship: vi.fn().mockResolvedValue(undefined),
    removeRelationship: vi.fn().mockResolvedValue(undefined),
    mutateCollectionRelationship: vi.fn().mockResolvedValue({
      effectiveChanged: true,
      effectiveMutationId: 'mutation-1',
      effectiveRelationVersion: 2,
    }),
    ...overrides,
  };
}

describe('idempotent tag and collection relationship writes', () => {
  it.each([
    'tag',
    'collection',
  ] as const)('adds a missing %s relationship through the same ownership-checked interface', async (relationType) => {
    const memory = store();
    const change = item({ relationType });

    await expect(applyRelationship(memory, 'user-1', change)).resolves.toEqual({
      effectiveChanged: true,
      effectiveMutationId: relationType === 'collection' ? 'mutation-1' : null,
      effectiveRelationVersion: relationType === 'collection' ? 2 : null,
    });

    expect(memory.ownsRepository).toHaveBeenCalledWith('user-1', 'repo-1');
    expect(memory.ownsTarget).toHaveBeenCalledWith('user-1', relationType, 'target-1');
    if (relationType === 'collection') {
      expect(memory.mutateCollectionRelationship).toHaveBeenCalledWith('user-1', change);
      expect(memory.addRelationship).not.toHaveBeenCalled();
    } else {
      expect(memory.addRelationship).toHaveBeenCalledWith('user-1', change);
    }
  });

  it('treats adding an existing relationship as success without writing it again', async () => {
    const memory = store({ relationshipExists: vi.fn().mockResolvedValue(true) });

    await expect(applyRelationship(memory, 'user-1', item())).resolves.toEqual({
      effectiveChanged: false,
      effectiveMutationId: null,
      effectiveRelationVersion: null,
    });
    expect(memory.addRelationship).not.toHaveBeenCalled();
  });

  it('treats removing a missing relationship as success without issuing a delete', async () => {
    const memory = store({ relationshipExists: vi.fn().mockResolvedValue(false) });

    await expect(applyRelationship(memory, 'user-1', item({ action: 'remove' }))).resolves.toEqual({
      effectiveChanged: false,
      effectiveMutationId: null,
      effectiveRelationVersion: null,
    });
    expect(memory.removeRelationship).not.toHaveBeenCalled();
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
    expect(memory.addRelationship).not.toHaveBeenCalled();
  });
});
