import type { SupabaseClient } from '@asterism/db';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  aiOrganizationKeys,
  bulkOperationKeys,
  collectionKeys,
  collectionRepoKeys,
  repoTagKeys,
  tagKeys,
} from './keys';
import {
  confirmAndExecuteAiOrganizationDraft,
  refreshAiOrganizationConfirmationState,
} from './use-ai-organization';

const suggestions = {
  version: 2 as const,
  relationChanges: [
    {
      id: 'relation-1',
      repoId: 'repo-1',
      relationType: 'tag' as const,
      targetId: 'tag-1',
      action: 'add' as const,
      selected: true,
    },
  ],
  newClassifications: [],
};

function operation(status: 'pending' | 'succeeded') {
  return {
    id: 'operation-1',
    source: 'ai_draft',
    sourceRepoIds: ['repo-1'],
    status: status === 'pending' ? 'pending' : 'completed',
    completedAt: status === 'pending' ? null : '2026-07-23T00:01:00.000Z',
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
    items: [
      {
        id: 'item-1',
        repoId: 'repo-1',
        relationType: 'tag',
        targetId: 'tag-1',
        action: 'add',
        status,
        attemptCount: status === 'pending' ? 0 : 1,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    ],
  };
}

describe('AI organization confirmation recovery', () => {
  it('confirms and immediately starts the existing bounded executor', async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        data: { status: 'confirmed', operationId: 'operation-1' },
        error: null,
      })
      .mockResolvedValueOnce({ data: { operation: operation('pending') }, error: null })
      .mockResolvedValueOnce({ data: { operation: operation('succeeded') }, error: null });
    const client = { functions: { invoke } } as unknown as SupabaseClient;

    await expect(
      confirmAndExecuteAiOrganizationDraft(client, {
        draftId: 'draft-1',
        expectedRevision: 4,
        suggestions,
      }),
    ).resolves.toEqual({ status: 'confirmed', operationId: 'operation-1' });
    expect(invoke.mock.calls.map(([name]) => name)).toEqual([
      'manage-ai-organization',
      'bulk-organize',
      'bulk-organize',
    ]);
    expect(invoke).toHaveBeenLastCalledWith('bulk-organize', {
      body: { action: 'execute', operationId: 'operation-1' },
    });
  });

  it('invalidates every authoritative query after a lost confirmation response', async () => {
    const userId = 'user-1';
    const queryClient = new QueryClient();
    const keys = [
      aiOrganizationKeys.draft(userId),
      bulkOperationKeys.list(userId),
      tagKeys.list(userId),
      repoTagKeys.list(userId),
      collectionKeys.list(userId),
      collectionRepoKeys.list(userId),
    ];
    for (const key of keys) queryClient.setQueryData(key, { cached: true });

    await refreshAiOrganizationConfirmationState(queryClient, userId);

    expect(keys.every((key) => queryClient.getQueryState(key)?.isInvalidated)).toBe(true);
  });
});
