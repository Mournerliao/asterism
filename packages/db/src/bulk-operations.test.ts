import { describe, expect, it, vi } from 'vitest';
import { invokeBulkOperation } from './bulk-operations';
import type { SupabaseClient } from './client';

function clientReturning(data: unknown) {
  const invoke = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

const operation = {
  id: 'operation-1',
  source: 'manual',
  sourceRepoIds: ['repo-1'],
  status: 'pending',
  completedAt: null,
  createdAt: '2026-07-19T00:00:00.000Z',
  updatedAt: '2026-07-19T00:00:00.000Z',
  items: [
    {
      id: 'item-1',
      repoId: 'repo-1',
      relationType: 'tag',
      targetId: 'tag-1',
      action: 'add',
      status: 'pending',
      attemptCount: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  ],
};

describe('invokeBulkOperation', () => {
  it('creates an operation from the confirmed repository snapshot and changes', async () => {
    const { client, invoke } = clientReturning({ operation });
    const input = {
      action: 'create' as const,
      source: 'manual' as const,
      repoIds: ['repo-1'],
      changes: [{ relationType: 'tag' as const, targetId: 'tag-1', action: 'add' as const }],
    };

    await expect(invokeBulkOperation(client, input)).resolves.toEqual(operation);
    expect(invoke).toHaveBeenCalledWith('bulk-organize', { body: input });
  });

  it.each([
    'get',
    'execute',
    'retry',
    'complete',
  ] as const)('preserves a typed operation returned by %s', async (action) => {
    const { client } = clientReturning({ operation });

    await expect(
      invokeBulkOperation(client, { action, operationId: 'operation-1' }),
    ).resolves.toEqual(operation);
  });

  it('rejects malformed outcomes at the trust boundary', async () => {
    const { client } = clientReturning({ operation: { ...operation, status: 'mystery' } });

    await expect(
      invokeBulkOperation(client, { action: 'get', operationId: 'operation-1' }),
    ).rejects.toThrow('invalid response');
  });
});
