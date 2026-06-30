import type { Collection } from '@asterism/core';
import type { SupabaseClient } from '../client';

export interface CollectionWithMeta extends Collection {
  /** 集合内仓库数量（经 collection_repos 聚合）。 */
  repoCount: number;
  updatedAt: string;
}

interface CollectionMetaRow {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  collection_repos: { count: number }[];
}

/** 读取当前用户的全部集合，附带仓库数量与更新时间，按更新时间倒序。 */
export async function listCollections(
  client: SupabaseClient,
  userId: string,
): Promise<CollectionWithMeta[]> {
  const { data, error } = await client
    .from('collections')
    .select('id, name, description, updated_at, collection_repos(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .returns<CollectionMetaRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    updatedAt: row.updated_at,
    repoCount: row.collection_repos[0]?.count ?? 0,
  }));
}

/** 新建集合；唯一约束 (user_id, name) 由调用方处理重名错误。 */
export async function createCollection(
  client: SupabaseClient,
  input: { userId: string; name: string; description: string | null },
): Promise<CollectionWithMeta> {
  const { data, error } = await client
    .from('collections')
    .insert({ user_id: input.userId, name: input.name, description: input.description })
    .select('id, name, description, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    updatedAt: data.updated_at,
    repoCount: 0,
  };
}

/** 更新集合的名称 / 描述。 */
export async function updateCollection(
  client: SupabaseClient,
  id: string,
  patch: { name?: string; description?: string | null },
): Promise<void> {
  const { error } = await client.from('collections').update(patch).eq('id', id);
  if (error) {
    throw error;
  }
}

/** 删除集合；collection_repos 关联行经 ON DELETE CASCADE 一并清除。 */
export async function deleteCollection(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('collections').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
