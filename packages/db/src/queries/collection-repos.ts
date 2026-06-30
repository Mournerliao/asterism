import type { SupabaseClient } from '../client';

export interface CollectionRepoLink {
  collectionId: string;
  repoId: string;
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

/** 将仓库加入集合；唯一约束 (collection_id, repo_id) 保证幂等。 */
export async function addRepoToCollection(
  client: SupabaseClient,
  input: { userId: string; collectionId: string; repoId: string },
): Promise<void> {
  const { error } = await client.from('collection_repos').insert({
    user_id: input.userId,
    collection_id: input.collectionId,
    repo_id: input.repoId,
  });
  if (error) {
    throw error;
  }
}

/** 将仓库移出集合。 */
export async function removeRepoFromCollection(
  client: SupabaseClient,
  input: { userId: string; collectionId: string; repoId: string },
): Promise<void> {
  const { error } = await client
    .from('collection_repos')
    .delete()
    .eq('user_id', input.userId)
    .eq('collection_id', input.collectionId)
    .eq('repo_id', input.repoId);
  if (error) {
    throw error;
  }
}
