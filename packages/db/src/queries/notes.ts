import type { SupabaseClient } from '../client';

/** 读取当前用户的全部笔记。 */
export async function listNotes(
  client: SupabaseClient,
  userId: string,
): Promise<Array<{ repoId: string; body: string }>> {
  const { data, error } = await client.from('notes').select('repo_id, body').eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((row) => row.body != null && row.body.trim().length > 0)
    .map((row) => ({ repoId: row.repo_id, body: row.body as string }));
}

/** 读取某仓库的笔记正文；无记录返回空串。 */
export async function getNote(
  client: SupabaseClient,
  input: { userId: string; repoId: string },
): Promise<string> {
  const { data, error } = await client
    .from('notes')
    .select('body')
    .eq('user_id', input.userId)
    .eq('repo_id', input.repoId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data?.body ?? '';
}

/**
 * 写入笔记：正文非空则 upsert（唯一约束 user_id+repo_id），为空则删除该笔记。
 * 返回最终是否仍存在笔记，便于前端更新本地状态。
 */
export async function saveNote(
  client: SupabaseClient,
  input: { userId: string; repoId: string; body: string },
): Promise<boolean> {
  const body = input.body.trim();

  if (body.length === 0) {
    const { error } = await client
      .from('notes')
      .delete()
      .eq('user_id', input.userId)
      .eq('repo_id', input.repoId);
    if (error) {
      throw error;
    }
    return false;
  }

  const { error } = await client
    .from('notes')
    .upsert(
      { user_id: input.userId, repo_id: input.repoId, body },
      { onConflict: 'user_id,repo_id' },
    );
  if (error) {
    throw error;
  }
  return true;
}
