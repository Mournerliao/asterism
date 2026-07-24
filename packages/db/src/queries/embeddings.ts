import {
  type DesiredRepoEmbedding,
  type RepoEmbeddingBackfillItem,
  selectReposToEmbed,
} from '@asterism/core';
import type { SupabaseClient } from '../client';

const POSTGREST_PAGE_SIZE = 1_000;

/** 一条完整的仓库语义向量（含向量本身）。 */
export interface RepoEmbeddingRecord {
  repoId: string;
  embedding: number[];
  embeddingModel: string;
  contentHash: string;
}

/** 仓库语义向量的元数据（不含向量，供探测过期）。 */
export interface RepoEmbeddingMeta {
  repoId: string;
  embeddingModel: string;
  contentHash: string;
}

/** 语义近邻检索的一条结果：仓库 + 与查询向量的距离（越小越近）。 */
export interface RepoEmbeddingNeighbor {
  repoId: string;
  distance: number;
}

/** owner 直写一条向量所需的输入。 */
export interface UpsertRepoEmbeddingInput {
  userId: string;
  repoId: string;
  embedding: number[];
  embeddingModel: string;
  contentHash: string;
}

/** number[] → pgvector 文本字面量（PostgREST 对 vector 列的输入格式）。 */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/** pgvector 往返值（PostgREST 对 vector 列返回 '[..]' 文本字面量）→ number[]。 */
function parseVectorLiteral(value: string): number[] {
  const trimmed = value.trim();
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed;
  if (inner.trim().length === 0) {
    return [];
  }
  return inner.split(',').map((part) => Number.parseFloat(part));
}

/**
 * owner 向量 upsert：按唯一约束 (user_id, repo_id) 写入本人一条向量行。
 * 走普通 RLS（with check user_id = auth.uid()），无需受信写入路径——derived 数据、
 * 只可能影响自己的搜索，无跨用户投毒面（ADR 0026 §4）。
 */
export async function upsertRepoEmbedding(
  client: SupabaseClient,
  input: UpsertRepoEmbeddingInput,
): Promise<void> {
  const { error } = await client.from('user_repo_embeddings').upsert(
    {
      user_id: input.userId,
      repo_id: input.repoId,
      embedding: toVectorLiteral(input.embedding),
      embedding_model: input.embeddingModel,
      content_hash: input.contentHash,
    },
    { onConflict: 'user_id,repo_id' },
  );

  if (error) {
    throw error;
  }
}

/**
 * 读取当前用户的全部向量（含向量本身），供本地距离检索 / 换设备复用。
 * 读取走 RLS 并显式按 user_id 收窄。
 */
export async function listRepoEmbeddings(
  client: SupabaseClient,
  userId: string,
): Promise<RepoEmbeddingRecord[]> {
  const rows: Array<{
    repo_id: string;
    embedding: string;
    embedding_model: string;
    content_hash: string;
  }> = [];
  for (let offset = 0; ; offset += POSTGREST_PAGE_SIZE) {
    const { data, error } = await client
      .from('user_repo_embeddings')
      .select('repo_id, embedding, embedding_model, content_hash')
      .eq('user_id', userId)
      .order('repo_id', { ascending: true })
      .range(offset, offset + POSTGREST_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < POSTGREST_PAGE_SIZE) {
      break;
    }
  }

  return rows.map((row) => ({
    repoId: row.repo_id,
    embedding: parseVectorLiteral(row.embedding),
    embeddingModel: row.embedding_model,
    contentHash: row.content_hash,
  }));
}

/**
 * 读取当前用户全部向量的元数据（不拉向量本身，轻量）：探测过期的输入。
 * 读取走 RLS 并显式按 user_id 收窄。
 */
export async function listRepoEmbeddingMeta(
  client: SupabaseClient,
  userId: string,
): Promise<RepoEmbeddingMeta[]> {
  const rows: Array<{
    repo_id: string;
    embedding_model: string;
    content_hash: string;
  }> = [];
  for (let offset = 0; ; offset += POSTGREST_PAGE_SIZE) {
    const { data, error } = await client
      .from('user_repo_embeddings')
      .select('repo_id, embedding_model, content_hash')
      .eq('user_id', userId)
      .order('repo_id', { ascending: true })
      .range(offset, offset + POSTGREST_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < POSTGREST_PAGE_SIZE) {
      break;
    }
  }

  return rows.map((row) => ({
    repoId: row.repo_id,
    embeddingModel: row.embedding_model,
    contentHash: row.content_hash,
  }));
}

/**
 * 「求缺失 / 过期集合」查询：读取本人已存向量元数据，套用 core 的纯函数
 * `selectReposToEmbed` 得到待嵌集合（无行 / 模型失配 / 内容失配）。
 * 期望集合 `desired` 由调用方从已加载的 star 仓库派生（repoId + 当前 content_hash）。
 */
export async function listReposToEmbed(
  client: SupabaseClient,
  input: { userId: string; model: string; desired: readonly DesiredRepoEmbedding[] },
): Promise<RepoEmbeddingBackfillItem[]> {
  const stored = await listRepoEmbeddingMeta(client, input.userId);
  return selectReposToEmbed({ model: input.model, desired: input.desired, stored });
}

/**
 * 语义近邻检索：将本地嵌好的查询向量上送给 security invoker RPC，在本人向量上
 * 按 pgvector 余弦距离（`<=>`）取最近 `matchCount` 条。函数体按 auth.uid() 收窄且 RLS 亦生效，
 * 因此无跨用户泄露面（ADR 0026 §7）；原文/笔记永不离开设备，仅向量上送。
 */
export async function searchRepoEmbeddings(
  client: SupabaseClient,
  input: { queryEmbedding: number[]; matchCount?: number },
): Promise<RepoEmbeddingNeighbor[]> {
  const { data, error } = await client.rpc('search_user_repo_embeddings', {
    query_embedding: toVectorLiteral(input.queryEmbedding),
    ...(input.matchCount != null ? { match_count: input.matchCount } : {}),
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({ repoId: row.repo_id, distance: row.distance }));
}
