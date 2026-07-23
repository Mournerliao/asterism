import { confirmAiOrganizationDraft, type SupabaseClient } from '@asterism/db';
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
import { refreshAiOrganizationConfirmationState } from './use-ai-organization';

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

describe('AI organization confirmation recovery', () => {
  it('commits only the confirmation transaction and leaves execution to the bulk-operation banner', async () => {
    const invoke = vi.fn().mockResolvedValueOnce({
      data: { status: 'confirmed', operationId: 'operation-1' },
      error: null,
    });
    const client = { functions: { invoke } } as unknown as SupabaseClient;

    await expect(
      confirmAiOrganizationDraft(client, {
        draftId: 'draft-1',
        expectedRevision: 4,
        suggestions,
      }),
    ).resolves.toEqual({ status: 'confirmed', operationId: 'operation-1' });
    // 确认事务只调用一次 manage-ai-organization，绝不内联触发 bulk-organize 执行
    expect(invoke.mock.calls.map(([name]) => name)).toEqual(['manage-ai-organization']);
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
