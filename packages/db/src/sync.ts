import type { SupabaseClient } from './client';

export interface SyncStarsResult {
  /** GitHub 拉取到并处理的 star 总数（本次同步范围内）。 */
  total: number;
  /** upsert 进 repos 的行数。 */
  upserted: number;
  /** 关联进当前用户 user_stars 的行数。 */
  starsLinked: number;
  /** 是否为增量同步（基于已有最新 starredAt）。 */
  incremental: boolean;
}

export class SyncStarsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncStarsError';
  }
}

/**
 * 触发 Edge Function `sync-stars` 完成 stars 同步（受信路径写入，见 decisions/0006）。
 * 客户端把会话里的 GitHub `provider_token` 传给函数；函数用 service role 幂等写库。
 */
export async function invokeSyncStars(
  client: SupabaseClient,
  providerToken: string,
): Promise<SyncStarsResult> {
  if (!providerToken) {
    throw new SyncStarsError('Missing GitHub provider token; please sign in again.');
  }

  const { data, error } = await client.functions.invoke<SyncStarsResult>('sync-stars', {
    body: { providerToken },
  });

  if (error) {
    throw new SyncStarsError(error.message);
  }
  if (!data) {
    throw new SyncStarsError('sync-stars returned no data');
  }
  return data;
}
