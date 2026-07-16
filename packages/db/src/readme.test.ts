import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from './client';
import { invokeRepoReadme } from './readme';

function clientReturning(data: unknown) {
  const invoke = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

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

  it('rejects malformed function outcomes instead of rendering untrusted data', async () => {
    const { client } = clientReturning({ status: 'success', html: 42 });

    await expect(invokeRepoReadme(client, { owner: 'openai', name: 'codex' })).rejects.toThrow(
      'invalid response',
    );
  });
});
