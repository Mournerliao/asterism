import type { SupabaseClient } from '../client';

export interface RepoTagLink {
  repoId: string;
  tagId: string;
}

interface RepoTagRow {
  repo_id: string;
  tag_id: string;
}

/**
 * 读取当前用户全部 repo↔tag 关联（一次拉取，前端按 repoId 建索引）。
 * 数据量等于打标签次数，远小于仓库数 × 标签数，适合整体缓存。
 */
export async function listRepoTags(client: SupabaseClient, userId: string): Promise<RepoTagLink[]> {
  const { data, error } = await client
    .from('repo_tags')
    .select('repo_id, tag_id')
    .eq('user_id', userId)
    .returns<RepoTagRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({ repoId: row.repo_id, tagId: row.tag_id }));
}

/** 给仓库打标签；唯一约束 (user_id, repo_id, tag_id) 保证幂等。 */
export async function addRepoTag(
  client: SupabaseClient,
  input: { userId: string; repoId: string; tagId: string },
): Promise<void> {
  const { error } = await client.from('repo_tags').insert({
    user_id: input.userId,
    repo_id: input.repoId,
    tag_id: input.tagId,
  });
  if (error) {
    throw error;
  }
}

/** 移除仓库上的某个标签。 */
export async function removeRepoTag(
  client: SupabaseClient,
  input: { userId: string; repoId: string; tagId: string },
): Promise<void> {
  const { error } = await client
    .from('repo_tags')
    .delete()
    .eq('user_id', input.userId)
    .eq('repo_id', input.repoId)
    .eq('tag_id', input.tagId);
  if (error) {
    throw error;
  }
}
