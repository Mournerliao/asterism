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

    await applyRelationship(memory, 'user-1', change);

    expect(memory.ownsRepository).toHaveBeenCalledWith('user-1', 'repo-1');
    expect(memory.ownsTarget).toHaveBeenCalledWith('user-1', relationType, 'target-1');
    expect(memory.addRelationship).toHaveBeenCalledWith('user-1', change);
  });

  it('treats adding an existing relationship as success without writing it again', async () => {
    const memory = store({ relationshipExists: vi.fn().mockResolvedValue(true) });

    await expect(applyRelationship(memory, 'user-1', item())).resolves.toBeUndefined();
    expect(memory.addRelationship).not.toHaveBeenCalled();
  });

  it('treats removing a missing relationship as success without issuing a delete', async () => {
    const memory = store({ relationshipExists: vi.fn().mockResolvedValue(false) });

    await expect(
      applyRelationship(memory, 'user-1', item({ action: 'remove' })),
    ).resolves.toBeUndefined();
    expect(memory.removeRelationship).not.toHaveBeenCalled();
  });
});
