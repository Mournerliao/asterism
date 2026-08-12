import type { SupabaseClient } from '../client';

export interface CollectionRepoLink {
  collectionId: string;
  repoId: string;
}

export type CollectionRelationAction = 'add' | 'remove';

export interface CollectionRelationMutation {
  effectiveChanged: boolean;
  effectiveMutationId: string | null;
  relationVersion: number;
  operationId: string;
  operationItemId: string;
}

interface CollectionRepoRow {
  collection_id: string;
  repo_id: string;
}

/** 读取当前用户全部 collection↔repo 关联（前端按 repoId / collectionId 建索引）。 */
export async function listCollectionRepos(
  client: SupabaseClient,
  userId: string,
): Promise<CollectionRepoLink[]> {
  const { data, error } = await client
    .from('collection_repos')
    .select('collection_id, repo_id')
    .eq('user_id', userId)
    .returns<CollectionRepoRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({ collectionId: row.collection_id, repoId: row.repo_id }));
}

function isCollectionRelationMutation(value: unknown): value is CollectionRelationMutation {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  const keys = Object.keys(result).sort();
  return (
    keys.length === 5 &&
    keys[0] === 'effectiveChanged' &&
    keys[1] === 'effectiveMutationId' &&
    keys[2] === 'operationId' &&
    keys[3] === 'operationItemId' &&
    keys[4] === 'relationVersion' &&
    typeof result.effectiveChanged === 'boolean' &&
    (typeof result.effectiveMutationId === 'string' || result.effectiveMutationId === null) &&
    typeof result.relationVersion === 'number' &&
    Number.isSafeInteger(result.relationVersion) &&
    result.relationVersion >= 0 &&
    typeof result.operationId === 'string' &&
    typeof result.operationItemId === 'string' &&
    (result.effectiveChanged || result.effectiveMutationId === null)
  );
}

/** 通过受信 RPC 原子地改变集合关系并返回有效变更 receipt。 */
export async function mutateCollectionRelation(
  client: SupabaseClient,
  input: {
    collectionId: string;
    repoId: string;
    action: CollectionRelationAction;
    clientRequestId: string;
  },
): Promise<CollectionRelationMutation> {
  const { data, error } = await client.rpc('mutate_collection_relation', {
    p_collection_id: input.collectionId,
    p_repo_id: input.repoId,
    p_action: input.action,
    p_client_request_id: input.clientRequestId,
  });
  if (error) {
    throw error;
  }
  if (!isCollectionRelationMutation(data)) {
    throw new Error('mutate_collection_relation returned an invalid response');
  }
  return data;
}
