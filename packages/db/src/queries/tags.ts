import type { Tag } from '@asterism/core';
import type { SupabaseClient } from '../client';

export interface TagWithCount extends Tag {
  /** 关联的仓库数量（经 repo_tags 聚合）。 */
  repoCount: number;
}

interface TagCountRow {
  id: string;
  name: string;
  color: string | null;
  repo_tags: { count: number }[];
}

/** 读取当前用户的全部标签，并带上各自的仓库数量，按名称升序。 */
export async function listTags(client: SupabaseClient, userId: string): Promise<TagWithCount[]> {
  const { data, error } = await client
    .from('tags')
    .select('id, name, color, repo_tags(count)')
    .eq('user_id', userId)
    .order('name', { ascending: true })
    .returns<TagCountRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    repoCount: row.repo_tags[0]?.count ?? 0,
  }));
}

/** 新建标签；唯一约束 (user_id, name) 由调用方处理重名错误。 */
export async function createTag(
  client: SupabaseClient,
  input: { userId: string; name: string; color: string | null },
): Promise<TagWithCount> {
  const { data, error } = await client
    .from('tags')
    .insert({ user_id: input.userId, name: input.name, color: input.color })
    .select('id, name, color')
    .single();

  if (error) {
    throw error;
  }

  return { id: data.id, name: data.name, color: data.color, repoCount: 0 };
}

/** 更新标签的名称 / 颜色。 */
export async function updateTag(
  client: SupabaseClient,
  id: string,
  patch: { name?: string; color?: string | null },
): Promise<void> {
  const { error } = await client.from('tags').update(patch).eq('id', id);
  if (error) {
    throw error;
  }
}

/** 删除标签；repo_tags 关联行经 ON DELETE CASCADE 一并清除。 */
export async function deleteTag(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('tags').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
