import type { RepoReadmeOutcome, SupabaseClient } from '@asterism/db';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { repoKeys } from './keys';
import { loadRepoReadme, README_STALE_TIME } from './use-repo-readme';

describe('README query caching', () => {
  it('keeps provider credentials and ETags out of the stable query key', () => {
    expect(repoKeys.readme('user-1', 'OpenAI', 'Codex')).toEqual([
      'repos',
      'readme',
      'user-1',
      'openai',
      'codex',
    ]);
    expect(repoKeys.readme('user-1', 'OpenAI', 'Codex')).not.toContain('github-token');
    expect(README_STALE_TIME).toBe(5 * 60_000);
  });

  it('passes only in-memory cached success data into an ETag-aware refresh', async () => {
    const key = repoKeys.readme('user-1', 'openai', 'codex');
    const cached = {
      status: 'success',
      html: '<h1>Cached</h1>',
      etag: '"readme-v1"',
    } satisfies RepoReadmeOutcome;
    const queryClient = new QueryClient();
    queryClient.setQueryData(key, cached);
    const invoke = vi.fn().mockResolvedValue({ data: cached, error: null });
    const client = { functions: { invoke } } as unknown as SupabaseClient;

    await loadRepoReadme({
      client,
      queryClient,
      queryKey: key,
      owner: 'openai',
      name: 'codex',
      providerToken: 'github-token',
    });

    expect(invoke).toHaveBeenCalledWith('read-repo-readme', {
      body: {
        owner: 'openai',
        name: 'codex',
        providerToken: 'github-token',
        etag: '"readme-v1"',
      },
    });
  });

  it('deduplicates concurrent requests with the stable TanStack Query key', async () => {
    const key = repoKeys.readme('user-1', 'openai', 'codex');
    const success = { status: 'success', html: '<h1>Hello</h1>', etag: null } as const;
    const invoke = vi.fn().mockResolvedValue({ data: success, error: null });
    const client = { functions: { invoke } } as unknown as SupabaseClient;
    const queryClient = new QueryClient();
    const queryFn = () =>
      loadRepoReadme({
        client,
        queryClient,
        queryKey: key,
        owner: 'openai',
        name: 'codex',
      });

    await Promise.all([
      queryClient.fetchQuery({ queryKey: key, queryFn }),
      queryClient.fetchQuery({ queryKey: key, queryFn }),
    ]);

    expect(invoke).toHaveBeenCalledOnce();
  });

  it('does not write README HTML or provider credentials to durable browser storage', async () => {
    const key = repoKeys.readme('user-1', 'openai', 'codex');
    const success = { status: 'success', html: '<h1>Hello</h1>', etag: null } as const;
    const invoke = vi.fn().mockResolvedValue({ data: success, error: null });
    const client = { functions: { invoke } } as unknown as SupabaseClient;
    const queryClient = new QueryClient();
    const durableWrite = vi.fn();
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { setItem: durableWrite },
    });

    try {
      await loadRepoReadme({
        client,
        queryClient,
        queryKey: key,
        owner: 'openai',
        name: 'codex',
        providerToken: 'github-token',
      });
    } finally {
      if (previousStorage) {
        Object.defineProperty(globalThis, 'localStorage', previousStorage);
      } else {
        Reflect.deleteProperty(globalThis, 'localStorage');
      }
    }

    expect(durableWrite).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(key)).toBeUndefined();
  });
});
