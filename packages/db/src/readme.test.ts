import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from './client';
import { invokeRepoReadme } from './readme';

function clientReturning(data: unknown) {
  const invoke = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

const outcomes = [
  'not_found',
  'not_in_library',
  'rate_limited',
  'reconnect_required',
  'retryable_error',
] as const;

describe('invokeRepoReadme', () => {
  it('requests a readable repository route and preserves the successful typed outcome', async () => {
    const { client, invoke } = clientReturning({
      status: 'success',
      html: '<h1>Hello</h1>',
      etag: '"readme-v1"',
    });

    await expect(
      invokeRepoReadme(client, { owner: 'openai', name: 'codex', providerToken: 'github-token' }),
    ).resolves.toEqual({ status: 'success', html: '<h1>Hello</h1>', etag: '"readme-v1"' });
    expect(invoke).toHaveBeenCalledWith('read-repo-readme', {
      body: { owner: 'openai', name: 'codex', providerToken: 'github-token' },
    });
  });

  it('omits an unavailable provider token so public README fallback remains possible', async () => {
    const { client, invoke } = clientReturning({ status: 'not_found' });

    await invokeRepoReadme(client, { owner: 'openai', name: 'codex' });

    expect(invoke).toHaveBeenCalledWith('read-repo-readme', {
      body: { owner: 'openai', name: 'codex' },
    });
  });

  it.each(outcomes)('preserves the %s typed outcome', async (status) => {
    const { client } = clientReturning({ status });

    await expect(invokeRepoReadme(client, { owner: 'openai', name: 'codex' })).resolves.toEqual({
      status,
    });
  });

  it('propagates a cached ETag and reuses cached HTML after a not-modified response', async () => {
    const { client, invoke } = clientReturning({ status: 'not_modified', etag: '"readme-v1"' });
    const cached = { status: 'success' as const, html: '<h1>Cached</h1>', etag: '"readme-v1"' };

    await expect(
      invokeRepoReadme(client, { owner: 'openai', name: 'codex', etag: cached.etag }, cached),
    ).resolves.toEqual(cached);
    expect(invoke).toHaveBeenCalledWith('read-repo-readme', {
      body: { owner: 'openai', name: 'codex', etag: '"readme-v1"' },
    });
  });

  it('rejects not-modified responses when matching cached HTML is unavailable', async () => {
    const { client } = clientReturning({ status: 'not_modified', etag: '"readme-v1"' });

    await expect(
      invokeRepoReadme(client, { owner: 'openai', name: 'codex', etag: '"readme-v1"' }),
    ).rejects.toThrow('matching cached README');
  });

  it('rejects malformed function outcomes instead of rendering untrusted data', async () => {
    const { client } = clientReturning({ status: 'success', html: 42 });

    await expect(invokeRepoReadme(client, { owner: 'openai', name: 'codex' })).rejects.toThrow(
      'invalid response',
    );
  });
});
