import { describe, expect, it } from 'vitest';
import {
  BUILTIN_GENERATION_HOSTS,
  buildGenerationProbeRequest,
  buildModelDiscoveryRequest,
  extractJsonObject,
  type GenerationTarget,
  interpretGenerationProbeResponse,
  isCustomGenerationAdapter,
  isOrganizationDraft,
  parseModelDiscoveryResponse,
  type RawProviderResponse,
  resolveGenerationBaseUrl,
  validateGenerationBaseUrl,
  validateGenerationCredential,
} from './generation-registry';

const credential = { apiKey: 'sk-test-key' };

function target(overrides: Partial<GenerationTarget> = {}): GenerationTarget {
  return { adapter: 'openai', baseUrl: null, credential, model: 'gpt-4o-mini', ...overrides };
}

function ok(body: unknown): RawProviderResponse {
  return { ok: true, status: 200, body };
}

const validDraftText = JSON.stringify({
  suggestions: [{ repoId: 'probe', relationType: 'tag', action: 'add', target: 'example' }],
});

describe('validateGenerationCredential', () => {
  it('accepts a non-empty api key and trims it', () => {
    expect(validateGenerationCredential('openai', { apiKey: '  sk-abc  ' })).toEqual({
      ok: true,
      credential: { apiKey: 'sk-abc' },
    });
  });

  it('rejects a missing or blank api key', () => {
    expect(validateGenerationCredential('anthropic', { apiKey: '   ' }).ok).toBe(false);
    expect(validateGenerationCredential('anthropic', {}).ok).toBe(false);
  });

  it('rejects an unknown adapter', () => {
    expect(validateGenerationCredential('mystery' as never, { apiKey: 'x' }).error).toBe(
      'unknown_adapter',
    );
  });
});

describe('validateGenerationBaseUrl', () => {
  it('forbids a base url on built-in adapters', () => {
    expect(validateGenerationBaseUrl('openai', 'https://example.com').ok).toBe(false);
    expect(validateGenerationBaseUrl('openai', null)).toEqual({ ok: true, baseUrl: null });
  });

  it('requires an https base url for the custom adapter', () => {
    expect(validateGenerationBaseUrl('openai-compatible', null).error).toBe('base_url_required');
    expect(validateGenerationBaseUrl('openai-compatible', 'http://x.test').error).toBe(
      'base_url_not_https',
    );
    expect(validateGenerationBaseUrl('openai-compatible', 'not a url').error).toBe(
      'invalid_base_url',
    );
  });

  it('normalizes a valid custom https base url', () => {
    expect(validateGenerationBaseUrl('openai-compatible', 'https://api.deepseek.com/v1/')).toEqual({
      ok: true,
      baseUrl: 'https://api.deepseek.com/v1',
    });
  });

  it.each([
    'https://user:secret@api.example.com/v1',
    'https://api.example.com/v1?token=secret',
    'https://api.example.com/v1#fragment',
  ])('rejects credentials, query strings, and fragments in base urls: %s', (baseUrl) => {
    expect(validateGenerationBaseUrl('openai-compatible', baseUrl)).toEqual({
      ok: false,
      error: 'invalid_base_url',
    });
  });
});

describe('resolveGenerationBaseUrl', () => {
  it('uses the fixed endpoint for built-in adapters', () => {
    expect(resolveGenerationBaseUrl('openai', null)).toBe('https://api.openai.com/v1');
    expect(resolveGenerationBaseUrl('google', null)).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
  });

  it('uses the custom base url for openai-compatible', () => {
    expect(resolveGenerationBaseUrl('openai-compatible', 'https://api.deepseek.com/v1')).toBe(
      'https://api.deepseek.com/v1',
    );
  });
});

describe('buildGenerationProbeRequest', () => {
  it('builds an OpenAI chat completion probe with json mode', () => {
    const request = buildGenerationProbeRequest(target());
    expect(request.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(request.method).toBe('POST');
    expect(request.headers.authorization).toBe('Bearer sk-test-key');
    const payload = JSON.parse(request.body ?? '{}');
    expect(payload.model).toBe('gpt-4o-mini');
    expect(payload.response_format).toEqual({ type: 'json_object' });
  });

  it('omits json mode for the openai-compatible adapter', () => {
    const request = buildGenerationProbeRequest(
      target({
        adapter: 'openai-compatible',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
      }),
    );
    expect(request.url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(JSON.parse(request.body ?? '{}').response_format).toBeUndefined();
  });

  it('builds an Anthropic messages probe with version headers', () => {
    const request = buildGenerationProbeRequest(
      target({ adapter: 'anthropic', model: 'claude-3-5-haiku' }),
    );
    expect(request.url).toBe('https://api.anthropic.com/v1/messages');
    expect(request.headers['x-api-key']).toBe('sk-test-key');
    expect(request.headers['anthropic-version']).toBe('2023-06-01');
  });

  it('builds a Google generateContent probe with the api key header', () => {
    const request = buildGenerationProbeRequest(
      target({ adapter: 'google', model: 'gemini-1.5-flash' }),
    );
    expect(request.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    );
    expect(request.headers['x-goog-api-key']).toBe('sk-test-key');
  });

  it('rejects an empty model id', () => {
    expect(() => buildGenerationProbeRequest(target({ model: '  ' }))).toThrow();
  });
});

describe('interpretGenerationProbeResponse', () => {
  it('accepts an OpenAI response that yields a valid draft', () => {
    const body = { choices: [{ message: { content: validDraftText } }] };
    expect(interpretGenerationProbeResponse('openai', ok(body))).toEqual({ ok: true });
  });

  it('accepts an Anthropic response with text blocks', () => {
    const body = { content: [{ type: 'text', text: validDraftText }] };
    expect(interpretGenerationProbeResponse('anthropic', ok(body)).ok).toBe(true);
  });

  it('accepts a Google response with candidate parts', () => {
    const body = { candidates: [{ content: { parts: [{ text: validDraftText }] } }] };
    expect(interpretGenerationProbeResponse('google', ok(body)).ok).toBe(true);
  });

  it('flags an unauthorized upstream', () => {
    expect(
      interpretGenerationProbeResponse('openai', { ok: false, status: 401, body: {} }),
    ).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('flags an empty completion', () => {
    const body = { choices: [{ message: { content: '' } }] };
    expect(interpretGenerationProbeResponse('openai', ok(body)).reason).toBe('empty_response');
  });

  it('flags output that is not JSON', () => {
    const body = { choices: [{ message: { content: 'hello there' } }] };
    expect(interpretGenerationProbeResponse('openai', ok(body)).reason).toBe('unparseable_output');
  });

  it('flags JSON that does not match the draft schema', () => {
    const body = { choices: [{ message: { content: '{"foo":1}' } }] };
    expect(interpretGenerationProbeResponse('openai', ok(body)).reason).toBe('schema_mismatch');
  });
});

describe('model discovery', () => {
  it('builds and parses OpenAI model listings', () => {
    const request = buildModelDiscoveryRequest({ adapter: 'openai', baseUrl: null, credential });
    expect(request.url).toBe('https://api.openai.com/v1/models');
    expect(request.method).toBe('GET');
    expect(
      parseModelDiscoveryResponse(
        'openai',
        ok({ data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }] }),
      ),
    ).toEqual(['gpt-4o', 'gpt-4o-mini']);
  });

  it('normalizes and de-duplicates discovered model ids', () => {
    expect(
      parseModelDiscoveryResponse(
        'openai',
        ok({ data: [{ id: 'gpt-4o' }, { id: ' gpt-4o ' }, { id: '' }] }),
      ),
    ).toEqual(['gpt-4o']);
  });

  it('strips the models/ prefix from Google names', () => {
    expect(
      parseModelDiscoveryResponse('google', ok({ models: [{ name: 'models/gemini-1.5-pro' }] })),
    ).toEqual(['gemini-1.5-pro']);
  });

  it('returns nothing for a failed discovery', () => {
    expect(parseModelDiscoveryResponse('openai', { ok: false, status: 500, body: {} })).toEqual([]);
  });
});

describe('extractJsonObject', () => {
  it('extracts JSON from fenced or prose-wrapped output', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJsonObject('Sure! {"a":2} done')).toEqual({ a: 2 });
  });

  it('returns null when there is no JSON object', () => {
    expect(extractJsonObject('no json here')).toBeNull();
    expect(extractJsonObject('{broken')).toBeNull();
  });
});

describe('isOrganizationDraft', () => {
  it('accepts a well-formed draft with optional new categories', () => {
    expect(isOrganizationDraft(JSON.parse(validDraftText))).toBe(true);
    expect(isOrganizationDraft({ suggestions: [], newCategories: ['ai', 'cli'] })).toBe(true);
  });

  it('rejects malformed suggestions or categories', () => {
    expect(isOrganizationDraft({ suggestions: [{ repoId: 1 }] })).toBe(false);
    expect(isOrganizationDraft({ suggestions: [], newCategories: [1] })).toBe(false);
    expect(isOrganizationDraft({})).toBe(false);
  });
});

describe('registry metadata', () => {
  it('exposes the fixed built-in hosts', () => {
    expect(BUILTIN_GENERATION_HOSTS).toContain('api.openai.com');
    expect(BUILTIN_GENERATION_HOSTS).toContain('generativelanguage.googleapis.com');
  });

  it('marks only openai-compatible as custom', () => {
    expect(isCustomGenerationAdapter('openai-compatible')).toBe(true);
    expect(isCustomGenerationAdapter('openai')).toBe(false);
  });
});
