import type { Repo } from '@asterism/core';
import type { SupabaseClient } from '../client';
import type { Tables } from '../database.types';

export interface StarredRepoRecord {
  repo: Repo;
  starredAt: string | null;
}

interface StarredJoinRow {
  starred_at: string | null;
  repos: Tables<'repos'> | null;
}

/** 把 `repos` 表行（snake_case）映射为领域 `Repo`（camelCase）。 */
export function mapRepoRow(row: Tables<'repos'>): Repo {
  return {
    githubId: row.github_id,
    fullName: row.full_name,
    name: row.name,
    owner: row.owner,
    description: row.description,
    language: row.language,
    topics: row.topics,
    stargazers: row.stargazers,
    forks: row.forks,
    homepage: row.homepage,
    pushedAt: row.pushed_at,
    repoCreatedAt: row.repo_created_at,
    archived: row.archived,
    isFork: row.is_fork,
    syncedAt: row.synced_at,
  };
}

/**
 * 读取当前用户 star 的全部仓库（user_stars ⋈ repos），按 starredAt 倒序。
 * 读取走 RLS：repos 全局可读、user_stars 按 user_id 隔离。
 */
export async function listStarredRepos(
  client: SupabaseClient,
  userId: string,
): Promise<StarredRepoRecord[]> {
  const { data, error } = await client
    .from('user_stars')
    .select('starred_at, repos(*)')
    .eq('user_id', userId)
    .order('starred_at', { ascending: false, nullsFirst: false })
    .returns<StarredJoinRow[]>();

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const records: StarredRepoRecord[] = [];
  for (const row of rows) {
    if (row.repos) {
      records.push({ repo: mapRepoRow(row.repos), starredAt: row.starred_at });
    }
  }
  return records;
}

/** 该用户已有的最新 starredAt（增量同步的界）；无记录返回 null。 */
export async function getLatestStarredAt(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('user_stars')
    .select('starred_at')
    .eq('user_id', userId)
    .order('starred_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data?.starred_at ?? null;
}
