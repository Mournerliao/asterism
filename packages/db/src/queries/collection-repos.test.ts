import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../client';
import { mutateCollectionRelation } from './collection-repos';

function clientReturning(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe('mutateCollectionRelation', () => {
  it('routes a collection add through the authenticated trusted command', async () => {
    const { client, rpc } = clientReturning({
      effectiveChanged: true,
      effectiveMutationId: 'mutation-1',
      relationVersion: 2,
      operationId: 'operation-1',
      operationItemId: 'item-1',
    });

    await expect(
      mutateCollectionRelation(client, {
        collectionId: 'collection-1',
        repoId: 'repo-1',
        action: 'add',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toEqual({
      effectiveChanged: true,
      effectiveMutationId: 'mutation-1',
      relationVersion: 2,
      operationId: 'operation-1',
      operationItemId: 'item-1',
    });
    expect(rpc).toHaveBeenCalledWith('mutate_collection_relation', {
      p_collection_id: 'collection-1',
      p_repo_id: 'repo-1',
      p_action: 'add',
      p_client_request_id: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('accepts an idempotent no-op without a mutation receipt', async () => {
    const { client } = clientReturning({
      effectiveChanged: false,
      effectiveMutationId: null,
      relationVersion: 1,
      operationId: 'operation-1',
      operationItemId: 'item-1',
    });

    await expect(
      mutateCollectionRelation(client, {
        collectionId: 'collection-1',
        repoId: 'repo-1',
        action: 'add',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toMatchObject({ effectiveChanged: false, effectiveMutationId: null });
  });

  it('rejects malformed mutation receipts at the database boundary', async () => {
    const { client } = clientReturning({
      effectiveChanged: false,
      effectiveMutationId: 'forged-receipt',
      relationVersion: 1,
      operationId: 'operation-1',
      operationItemId: 'item-1',
    });

    await expect(
      mutateCollectionRelation(client, {
        collectionId: 'collection-1',
        repoId: 'repo-1',
        action: 'remove',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toThrow('invalid response');
  });

  it('rejects unknown mutation projection fields', async () => {
    const { client } = clientReturning({
      effectiveChanged: true,
      effectiveMutationId: 'mutation-1',
      relationVersion: 2,
      operationId: 'operation-1',
      operationItemId: 'item-1',
      userId: 'leaked-user',
    });

    await expect(
      mutateCollectionRelation(client, {
        collectionId: 'collection-1',
        repoId: 'repo-1',
        action: 'add',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toThrow('invalid response');
  });
});
