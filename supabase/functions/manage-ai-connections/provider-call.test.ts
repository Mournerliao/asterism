import { describe, expect, it } from 'vitest';
import type {
  GenerationTarget,
  OrganizationGenerationInput,
} from '../../../packages/core/src/ai/generation-registry';
import { type DnsResolver, SsrfError } from '../../../packages/core/src/ai/ssrf';
import {
  assertCustomEndpointAllowed,
  discoverConnectionModels,
  generateOrganizationDraft,
  type ProviderCallConfig,
  probeConnection,
} from './provider-call';

const validDraft = JSON.stringify({
  suggestions: [{ repoId: 'probe', relationType: 'tag', action: 'add', target: 'example' }],
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function fetchReturning(...responses: Response[]): { fetch: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  let index = 0;
  const fetchImpl = (async (url: RequestInfo | URL) => {
    calls.push(String(url));
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return response ?? jsonResponse({}, 500);
  }) as typeof fetch;
  return { fetch: fetchImpl, calls };
}

const resolveTo =
  (...addresses: string[]): DnsResolver =>
  async () =>
    addresses;

const noopFetch = (async () => jsonResponse({}, 200)) as typeof fetch;

function target(overrides: Partial<GenerationTarget> = {}): GenerationTarget {
  return {
    adapter: 'openai',
    baseUrl: null,
    credential: { apiKey: 'sk-test' },
    model: 'gpt-4o-mini',
    ...overrides,
  };
}

function config(overrides: Partial<ProviderCallConfig> = {}): ProviderCallConfig {
  return {
    fetch: fetchReturning(jsonResponse({ choices: [{ message: { content: validDraft } }] })).fetch,
    resolve: resolveTo('8.8.8.8'),
    allowlist: { mode: 'all' },
    ...overrides,
  };
}

describe('probeConnection', () => {
  it('reports a healthy built-in provider', async () => {
    expect(await probeConnection(config(), target())).toEqual({ ok: true, reason: null });
  });

  it('surfaces an unauthorized upstream as an invalid connection', async () => {
    const result = await probeConnection(
      config({ fetch: fetchReturning(jsonResponse({}, 401)).fetch }),
      target(),
    );
    expect(result).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('blocks a custom endpoint that resolves to a private address', async () => {
    const result = await probeConnection(
      config({ resolve: resolveTo('10.0.0.5') }),
      target({
        adapter: 'openai-compatible',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
      }),
    );
    expect(result).toEqual({ ok: false, reason: 'blocked_endpoint:forbidden_address' });
  });

  it('blocks a custom endpoint that is not on the deployer allowlist', async () => {
    const result = await probeConnection(
      config({ allowlist: { mode: 'list', domains: ['api.deepseek.com'] } }),
      target({ adapter: 'openai-compatible', baseUrl: 'https://evil.test/v1', model: 'x' }),
    );
    expect(result).toEqual({ ok: false, reason: 'blocked_endpoint:host_not_allowed' });
  });

  it('re-validates every redirect hop before following it', async () => {
    const redirect = new Response(null, {
      status: 301,
      headers: { location: 'https://api.openai.com/v1/chat/completions?redirected=1' },
    });
    const { fetch, calls } = fetchReturning(
      redirect,
      jsonResponse({ choices: [{ message: { content: validDraft } }] }),
    );
    let resolveCount = 0;
    const resolve: DnsResolver = async () => {
      resolveCount += 1;
      return ['8.8.8.8'];
    };

    const result = await probeConnection({ fetch, resolve, allowlist: { mode: 'all' } }, target());
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(resolveCount).toBe(2);
  });

  it('rejects a cross-origin redirect before forwarding provider credentials', async () => {
    const redirect = new Response(null, {
      status: 307,
      headers: { location: 'https://credential-collector.test/probe' },
    });
    const { fetch, calls } = fetchReturning(redirect, jsonResponse({}));

    expect(await probeConnection(config({ fetch }), target())).toEqual({
      ok: false,
      reason: 'blocked_endpoint:redirect_origin_not_allowed',
    });
    expect(calls).toEqual(['https://api.openai.com/v1/chat/completions']);
  });

  it('treats a transport failure as a non-throwing invalid result', async () => {
    const failingFetch = (async () => {
      throw new Error('connection reset');
    }) as typeof fetch;
    expect(await probeConnection(config({ fetch: failingFetch }), target())).toEqual({
      ok: false,
      reason: 'network_error',
    });
  });
});

describe('discoverConnectionModels', () => {
  it('returns discovered model ids through the same guarded fetch path', async () => {
    const models = await discoverConnectionModels(
      config({
        fetch: fetchReturning(jsonResponse({ data: [{ id: 'gpt-4o' }, { id: 'o3' }] })).fetch,
      }),
      {
        adapter: 'openai',
        baseUrl: null,
        credential: { apiKey: 'sk-test' },
      },
    );

    expect(models).toEqual(['gpt-4o', 'o3']);
  });

  it('falls back to an empty list when discovery is unavailable', async () => {
    await expect(
      discoverConnectionModels(config({ fetch: fetchReturning(jsonResponse({}, 404)).fetch }), {
        adapter: 'openai',
        baseUrl: null,
        credential: { apiKey: 'sk-test' },
      }),
    ).resolves.toEqual([]);
  });
});

describe('assertCustomEndpointAllowed', () => {
  it('accepts an allowlisted endpoint that resolves publicly', async () => {
    await expect(
      assertCustomEndpointAllowed(
        {
          fetch: noopFetch,
          resolve: resolveTo('8.8.8.8'),
          allowlist: { mode: 'list', domains: ['api.deepseek.com'] },
        },
        'https://api.deepseek.com/v1',
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects an endpoint that resolves to a private address', async () => {
    await expect(
      assertCustomEndpointAllowed(
        { fetch: noopFetch, resolve: resolveTo('10.0.0.1'), allowlist: { mode: 'all' } },
        'https://api.deepseek.com/v1',
      ),
    ).rejects.toBeInstanceOf(SsrfError);
  });
});

describe('generateOrganizationDraft', () => {
  const input: OrganizationGenerationInput = {
    repositories: [
      {
        id: 'repo-1',
        fullName: 'asterism/app',
        description: null,
        language: 'TypeScript',
        topics: [],
        existingTagIds: [],
        existingCollectionIds: [],
      },
    ],
    tags: [],
    collections: [],
  };

  it('returns a validated empty draft through the guarded provider seam', async () => {
    const fetch = fetchReturning(
      jsonResponse({
        choices: [{ message: { content: '{"relationChanges":[],"newClassifications":[]}' } }],
      }),
    ).fetch;
    await expect(
      generateOrganizationDraft(config({ fetch }), { ...target(), input }),
    ).resolves.toEqual({
      version: 1,
      relationChanges: [],
      newClassifications: [],
    });
  });

  it('returns stable non-sensitive errors for transport and schema failures', async () => {
    const badSchema = fetchReturning(
      jsonResponse({ choices: [{ message: { content: '{"unexpected":true}' } }] }),
    ).fetch;
    await expect(
      generateOrganizationDraft(config({ fetch: badSchema }), { ...target(), input }),
    ).rejects.toThrow('provider_schema_mismatch');
  });
});
