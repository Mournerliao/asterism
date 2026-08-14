import type { BulkOperation, BulkOperationRequest } from '@asterism/db';
import { describe, expect, it, vi } from 'vitest';
import {
  runCollectionDialOperation,
  summarizeCollectionDialCounts,
} from './collection-dial-operation';

function operation(
  status: BulkOperation['items'][number]['status'],
  operationStatus: BulkOperation['status'],
): BulkOperation {
  return {
    id: 'operation-1',
    source: 'manual',
    interaction: 'collection_dial',
    clientRequestId: '11111111-1111-4111-8111-111111111111',
    undoOfOperationId: null,
    undoExpiresAt: null,
    undoEligibleCount: 0,
    undoSkippedCount: 0,
    undoConflictCount: 0,
    undoExpired: false,
    sourceRepoIds: ['repo-1'],
    status: operationStatus,
    completedAt: operationStatus === 'completed' ? '2026-08-13T00:00:00.000Z' : null,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    items: [
      {
        id: 'item-1',
        repoId: 'repo-1',
        relationType: 'collection',
        targetId: 'collection-1',
        action: 'add',
        status,
        attemptCount: status === 'pending' ? 0 : 1,
        lastErrorCode: status.includes('failed') ? 'TEMPORARY' : null,
        lastErrorMessage: status.includes('failed') ? 'Try again' : null,
        effectiveChanged: status === 'succeeded',
        effectiveMutationId: status === 'succeeded' ? 'mutation-1' : null,
        effectiveRelationVersion: status === 'succeeded' ? 1 : null,
      },
    ],
  };
}

describe('Collection Dial persistent operation', () => {
  it('keeps frozen membership counts when transport returns no operation', () => {
    expect(
      summarizeCollectionDialCounts({ alreadyMemberCount: 1, missingCount: 2, items: [] }),
    ).toEqual({
      addedCount: 0,
      alreadyMemberCount: 1,
      retryableCount: 2,
      terminalCount: 0,
    });
  });

  it('creates and executes a collection_dial operation before waiting for authoritative convergence', async () => {
    const pending = operation('pending', 'pending');
    const succeeded = operation('succeeded', 'completed');
    const invoke = vi
      .fn<(request: BulkOperationRequest) => Promise<BulkOperation>>()
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(succeeded);
    const converge = vi.fn().mockResolvedValue(true);

    await expect(
      runCollectionDialOperation({
        repoIds: ['repo-1'],
        itemRepoIds: ['repo-1'],
        targetId: 'collection-1',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        invoke,
        converge,
      }),
    ).resolves.toMatchObject({ kind: 'success', operation: succeeded });
    expect(invoke).toHaveBeenNthCalledWith(1, {
      action: 'create',
      source: 'manual',
      interaction: 'collection_dial',
      clientRequestId: '11111111-1111-4111-8111-111111111111',
      repoIds: ['repo-1'],
      itemRepoIds: ['repo-1'],
      changes: [{ relationType: 'collection', targetId: 'collection-1', action: 'add' }],
    });
    expect(converge).toHaveBeenCalledWith(['repo-1'], 'collection-1');
  });

  it('does not report success until the collection query contains the relation', async () => {
    const succeeded = operation('succeeded', 'completed');
    const invoke = vi.fn().mockResolvedValue(succeeded);

    await expect(
      runCollectionDialOperation({
        repoIds: ['repo-1'],
        itemRepoIds: ['repo-1'],
        targetId: 'collection-1',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        existingOperation: succeeded,
        invoke,
        converge: vi.fn().mockResolvedValue(false),
      }),
    ).resolves.toMatchObject({ kind: 'retryable_failure', reason: 'convergence' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('retains retryable and terminal operation outcomes for recovery', async () => {
    const retryable = operation('retryable_failed', 'needs_attention');
    const terminal = operation('terminal_failed', 'needs_attention');

    await expect(
      runCollectionDialOperation({
        repoIds: ['repo-1'],
        itemRepoIds: ['repo-1'],
        targetId: 'collection-1',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        existingOperation: retryable,
        invoke: vi.fn().mockResolvedValueOnce(retryable).mockResolvedValueOnce(retryable),
        converge: vi.fn(),
      }),
    ).resolves.toMatchObject({ kind: 'retryable_failure', operation: retryable });

    await expect(
      runCollectionDialOperation({
        repoIds: ['repo-1'],
        itemRepoIds: ['repo-1'],
        targetId: 'collection-1',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        existingOperation: terminal,
        invoke: vi.fn(),
        converge: vi.fn(),
      }),
    ).resolves.toMatchObject({ kind: 'terminal_failure', operation: terminal });
  });

  it('keeps the complete frozen multi-repository scope in one persistent operation', async () => {
    const firstItem = operation('succeeded', 'completed').items[0];
    if (!firstItem) throw new Error('Expected the operation fixture to contain an item');
    const completed: BulkOperation = {
      ...operation('succeeded', 'completed'),
      sourceRepoIds: ['repo-1', 'repo-2'],
      items: [
        firstItem,
        {
          ...firstItem,
          id: 'item-2',
          repoId: 'repo-2',
          effectiveMutationId: 'mutation-2',
        },
      ],
    };
    const invoke = vi.fn().mockResolvedValue(completed);
    const converge = vi.fn().mockResolvedValue(true);

    await expect(
      runCollectionDialOperation({
        repoIds: ['repo-1', 'repo-2'],
        itemRepoIds: ['repo-1', 'repo-2'],
        targetId: 'collection-1',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        invoke,
        converge,
      }),
    ).resolves.toMatchObject({ kind: 'success', operation: completed });
    expect(invoke).toHaveBeenCalledWith({
      action: 'create',
      source: 'manual',
      interaction: 'collection_dial',
      clientRequestId: '11111111-1111-4111-8111-111111111111',
      repoIds: ['repo-1', 'repo-2'],
      itemRepoIds: ['repo-1', 'repo-2'],
      changes: [{ relationType: 'collection', targetId: 'collection-1', action: 'add' }],
    });
    expect(converge).toHaveBeenCalledWith(['repo-1', 'repo-2'], 'collection-1');
  });
});
