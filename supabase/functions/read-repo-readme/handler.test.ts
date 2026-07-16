import { describe, expect, it, vi } from 'vitest';
import { createReadRepoReadmeHandler, type ReadRepoReadmeDependencies } from './handler';

function dependencies(
  overrides: Partial<ReadRepoReadmeDependencies> = {},
): ReadRepoReadmeDependencies {
  return {
    authenticate: vi.fn().mockResolvedValue('user-1'),
    checkMembership: vi.fn().mockResolvedValue('member'),
    fetchGitHub: vi.fn().mockResolvedValue(
      new Response('<h1>Hello</h1>', {
        status: 200,
        headers: { etag: '"readme-v1"' },
      }),
    ),
    ...overrides,
  };
}

function request(body: Record<string, unknown>, authorized = true) {
  return new Request('https://example.test/read-repo-readme', {
    method: 'POST',
    headers: authorized
      ? { Authorization: 'Bearer session-jwt', 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function outcome(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('read-repo-readme HTTP boundary', () => {
  it('rejects missing and invalid sessions before membership or GitHub access', async () => {
    const missing = dependencies();
    const missingResponse = await createReadRepoReadmeHandler(missing)(
      request({ owner: 'openai', name: 'codex' }, false),
    );
    expect(missingResponse.status).toBe(401);
    expect(missing.checkMembership).not.toHaveBeenCalled();
    expect(missing.fetchGitHub).not.toHaveBeenCalled();

    const invalid = dependencies({ authenticate: vi.fn().mockResolvedValue(null) });
    const invalidResponse = await createReadRepoReadmeHandler(invalid)(
      request({ owner: 'openai', name: 'codex' }),
    );
    expect(invalidResponse.status).toBe(401);
    expect(invalid.fetchGitHub).not.toHaveBeenCalled();
  });

  it('rejects repositories outside the synchronized library before GitHub access', async () => {
    const deps = dependencies({ checkMembership: vi.fn().mockResolvedValue('not_member') });

    const response = await createReadRepoReadmeHandler(deps)(
      request({ owner: 'openai', name: 'codex' }),
    );

    expect(await outcome(response)).toEqual({ status: 'not_in_library' });
    expect(deps.fetchGitHub).not.toHaveBeenCalled();
  });

  it('uses a current provider token for authenticated success without returning it', async () => {
    const deps = dependencies();

    const response = await createReadRepoReadmeHandler(deps)(
      request({ owner: 'openai', name: 'codex', providerToken: 'github-token' }),
    );

    const responseOutcome = await outcome(response);
    expect(responseOutcome).toEqual({
      status: 'success',
      html: '<h1>Hello</h1>',
      etag: '"readme-v1"',
    });
    expect(deps.fetchGitHub).toHaveBeenCalledWith(
      'https://api.github.com/repos/openai/codex/readme',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer github-token' }),
      }),
    );
    expect(JSON.stringify(responseOutcome)).not.toContain('github-token');
  });

  it('falls back to an anonymous public request when the provider token is absent', async () => {
    const deps = dependencies();

    const response = await createReadRepoReadmeHandler(deps)(
      request({ owner: 'openai', name: 'codex' }),
    );

    expect(await outcome(response)).toEqual({
      status: 'success',
      html: '<h1>Hello</h1>',
      etag: '"readme-v1"',
    });
    const [, init] = vi.mocked(deps.fetchGitHub).mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it.each([
    [404, {}, { status: 'not_found' }],
    [401, {}, { status: 'reconnect_required' }],
    [403, { 'x-ratelimit-remaining': '0' }, { status: 'rate_limited' }],
    [500, {}, { status: 'retryable_error' }],
  ])('maps GitHub status %s to its typed outcome', async (status, headers, expected) => {
    const deps = dependencies({
      fetchGitHub: vi.fn().mockResolvedValue(new Response(null, { status, headers })),
    });

    const response = await createReadRepoReadmeHandler(deps)(
      request({ owner: 'openai', name: 'codex' }),
    );

    expect(await outcome(response)).toEqual(expected);
  });

  it('propagates ETags and maps GitHub 304 without transferring HTML again', async () => {
    const deps = dependencies({
      fetchGitHub: vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 304, headers: { etag: '"readme-v1"' } })),
    });

    const response = await createReadRepoReadmeHandler(deps)(
      request({ owner: 'openai', name: 'codex', etag: '"readme-v1"' }),
    );

    expect(await outcome(response)).toEqual({ status: 'not_modified', etag: '"readme-v1"' });
    expect(deps.fetchGitHub).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'If-None-Match': '"readme-v1"' }),
      }),
    );
  });
});
