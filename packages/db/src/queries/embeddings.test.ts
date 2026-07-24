import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '../client';
import {
  listRepoEmbeddingMeta,
  listRepoEmbeddings,
  listReposToEmbed,
  upsertRepoEmbedding,
} from './embeddings';

interface QueryCall {
  table: string;
  select?: string;
  upsert?: { values: Record<string, unknown>; options?: { onConflict?: string } };
  eq: Array<{ column: string; value: unknown }>;
  ranges: Array<{ from: number; to: number }>;
}

/**
 * 可链式的 Supabase query builder 桩：记录 `from/select/eq/upsert`，终止方法
 * （`upsert` 与读路径末端的 `eq`）返回真实 Promise，模拟被 await 的查询。
 * 用于断言每条读写都按 user_id 收窄（RLS 回归面的 CI-green 部分）与 vector 文本往返。
 */
function createClientMock(
  result: { data?: unknown; error: unknown } | Array<{ data?: unknown; error: unknown }>,
) {
  const calls: QueryCall[] = [];
  let readIndex = 0;

  const client = {
    from(table: string) {
      const call: QueryCall = { table, eq: [], ranges: [] };
      calls.push(call);
      const readBuilder = {
        eq(column: string, value: unknown) {
          call.eq.push({ column, value });
          return readBuilder;
        },
        order() {
          return readBuilder;
        },
        range(from: number, to: number) {
          call.ranges.push({ from, to });
          const page = Array.isArray(result)
            ? (result[readIndex] ?? { data: [], error: null })
            : result;
          readIndex += 1;
          return Promise.resolve(page);
        },
      };
      return {
        select(columns: string) {
          call.select = columns;
          return readBuilder;
        },
        upsert(values: Record<string, unknown>, options?: { onConflict?: string }) {
          call.upsert = { values, options };
          return Promise.resolve(result);
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}

function firstCall(calls: QueryCall[]): QueryCall {
  const call = calls[0];
  if (!call) {
    throw new Error('expected a query to have been issued');
  }
  return call;
}

describe('upsertRepoEmbedding', () => {
  it('scopes the write to the owner and serializes the vector to a pgvector literal', async () => {
    const { client, calls } = createClientMock({ error: null });

    await upsertRepoEmbedding(client, {
      userId: 'user-1',
      repoId: 'repo-1',
      embedding: [0.1, 0.2, 0.3],
      embeddingModel: 'multilingual-e5-small',
      contentHash: 'h1',
    });

    expect(calls).toHaveLength(1);
    const call = firstCall(calls);
    expect(call.table).toBe('user_repo_embeddings');
    expect(call.upsert?.values).toEqual({
      user_id: 'user-1',
      repo_id: 'repo-1',
      embedding: '[0.1,0.2,0.3]',
      embedding_model: 'multilingual-e5-small',
      content_hash: 'h1',
    });
    expect(call.upsert?.options).toEqual({ onConflict: 'user_id,repo_id' });
  });

  it('throws when the write is rejected', async () => {
    const { client } = createClientMock({ error: new Error('row-level security') });

    await expect(
      upsertRepoEmbedding(client, {
        userId: 'user-1',
        repoId: 'repo-1',
        embedding: [0.1],
        embeddingModel: 'multilingual-e5-small',
        contentHash: 'h1',
      }),
    ).rejects.toThrow('row-level security');
  });
});

describe('listRepoEmbeddings', () => {
  it('narrows the read to the owner and parses the vector literal back to numbers', async () => {
    const { client, calls } = createClientMock({
      data: [
        {
          repo_id: 'repo-1',
          embedding: '[0.1,0.2,0.3]',
          embedding_model: 'multilingual-e5-small',
          content_hash: 'h1',
        },
      ],
      error: null,
    });

    const records = await listRepoEmbeddings(client, 'user-1');

    const call = firstCall(calls);
    expect(call.table).toBe('user_repo_embeddings');
    expect(call.select).toContain('embedding');
    expect(call.eq).toContainEqual({ column: 'user_id', value: 'user-1' });
    expect(records).toEqual([
      {
        repoId: 'repo-1',
        embedding: [0.1, 0.2, 0.3],
        embeddingModel: 'multilingual-e5-small',
        contentHash: 'h1',
      },
    ]);
  });

  it('throws when the read is rejected', async () => {
    const { client } = createClientMock({ error: new Error('row-level security') });

    await expect(listRepoEmbeddings(client, 'user-1')).rejects.toThrow('row-level security');
  });
});

describe('listRepoEmbeddingMeta', () => {
  it('narrows the read to the owner and never pulls the vector column', async () => {
    const { client, calls } = createClientMock({
      data: [{ repo_id: 'repo-1', embedding_model: 'multilingual-e5-small', content_hash: 'h1' }],
      error: null,
    });

    const meta = await listRepoEmbeddingMeta(client, 'user-1');

    const call = firstCall(calls);
    expect(call.select).not.toContain('embedding,');
    expect(call.select).not.toContain('embedding ');
    expect(call.eq).toContainEqual({ column: 'user_id', value: 'user-1' });
    expect(meta).toEqual([
      { repoId: 'repo-1', embeddingModel: 'multilingual-e5-small', contentHash: 'h1' },
    ]);
  });

  it('paginates until every owner embedding row is loaded', async () => {
    const firstPage = Array.from({ length: 1_000 }, (_, index) => ({
      repo_id: `repo-${index}`,
      embedding_model: 'multilingual-e5-small',
      content_hash: `h${index}`,
    }));
    const { client, calls } = createClientMock([
      { data: firstPage, error: null },
      {
        data: [
          {
            repo_id: 'repo-1000',
            embedding_model: 'multilingual-e5-small',
            content_hash: 'h1000',
          },
        ],
        error: null,
      },
    ]);

    const meta = await listRepoEmbeddingMeta(client, 'user-1');

    expect(meta).toHaveLength(1_001);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.ranges[0])).toEqual([
      { from: 0, to: 999 },
      { from: 1_000, to: 1_999 },
    ]);
  });
});

describe('listReposToEmbed', () => {
  it('applies the core staleness selection against the owner-scoped stored meta', async () => {
    const { client, calls } = createClientMock({
      data: [{ repo_id: 'fresh', embedding_model: 'multilingual-e5-small', content_hash: 'h1' }],
      error: null,
    });

    const backfill = await listReposToEmbed(client, {
      userId: 'user-1',
      model: 'multilingual-e5-small',
      desired: [
        { repoId: 'fresh', contentHash: 'h1' },
        { repoId: 'new', contentHash: 'h2' },
      ],
    });

    expect(firstCall(calls).eq).toContainEqual({ column: 'user_id', value: 'user-1' });
    expect(backfill).toEqual([{ repoId: 'new', reason: 'missing' }]);
  });
});
