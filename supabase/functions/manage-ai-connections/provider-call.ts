/**
 * SSRF-guarded upstream calls for the trusted connection manager (ADR 0018, 0024).
 * The registry (request shapes, response interpretation) and the SSRF classifier
 * live in packages/core and are imported by path with a `.ts` extension so Deno
 * loads the same source the core vitest suite covers. This module adds only the
 * effectful layer: it re-validates every URL — including each redirect hop — with
 * an injected resolver before letting the injected fetch touch the network.
 */

import type {
  OrganizationGenerationTarget,
  ValidatedOrganizationDraft,
} from '../../../packages/core/src/ai/generation-registry.ts';
import {
  buildGenerationProbeRequest,
  buildModelDiscoveryRequest,
  buildOrganizationGenerationRequest,
  type GenerationAdapterId,
  type GenerationTarget,
  interpretGenerationProbeResponse,
  interpretOrganizationGenerationResponse,
  isCustomGenerationAdapter,
  type ProviderRequest,
  parseModelDiscoveryResponse,
  type RawProviderResponse,
} from '../../../packages/core/src/ai/generation-registry.ts';
import {
  assertUrlIsSafe,
  type DnsResolver,
  type HostAllowlist,
  SsrfError,
} from '../../../packages/core/src/ai/ssrf.ts';

const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_PROVIDER_RESPONSE_BYTES = 1_000_000;

export interface ProviderCallConfig {
  fetch: typeof fetch;
  resolve: DnsResolver;
  allowlist: HostAllowlist;
  maxRedirects?: number;
  timeoutMs?: number;
}

export interface ProbeResult {
  ok: boolean;
  reason: string | null;
}

/** Built-in providers are a natural allowlist; only custom endpoints must match the deployer list. */
function requireAllowlistFor(adapter: GenerationAdapterId): boolean {
  return isCustomGenerationAdapter(adapter);
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new Error('provider_response_too_large');
  }
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch a request, re-validating the target before every hop. The guard runs on
 * the initial URL and again on each redirect Location; standard fetch cannot pin
 * the connection to the validated IP, so redirects are followed manually and
 * bounded to keep a hostile endpoint from looping us.
 */
async function guardedFetch(
  config: ProviderCallConfig,
  request: ProviderRequest,
  requireAllowlist: boolean,
): Promise<Response> {
  const maxRedirects = config.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let currentUrl = request.url;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertUrlIsSafe(currentUrl, {
      resolve: config.resolve,
      allowlist: config.allowlist,
      requireAllowlist,
    });
    const response = await config.fetch(currentUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      const nextUrl = new URL(location, currentUrl);
      if (nextUrl.origin !== new URL(currentUrl).origin) {
        throw new SsrfError(
          'redirect_origin_not_allowed',
          'Provider redirects must remain on the original origin',
        );
      }
      currentUrl = nextUrl.toString();
      continue;
    }
    return response;
  }
  throw new SsrfError('too_many_redirects', 'Upstream exceeded the redirect limit');
}

export async function discoverConnectionModels(
  config: ProviderCallConfig,
  target: Omit<GenerationTarget, 'model'>,
): Promise<string[]> {
  const request = buildModelDiscoveryRequest(target);
  try {
    const response = await guardedFetch(config, request, requireAllowlistFor(target.adapter));
    const raw: RawProviderResponse = {
      ok: response.ok,
      status: response.status,
      body: await readBody(response),
    };
    return parseModelDiscoveryResponse(target.adapter, raw).slice(0, 200);
  } catch {
    return [];
  }
}

/**
 * Run a capability probe: build the adapter's probe request, call it through the
 * guard, and interpret the response. SSRF blocks and transport failures become a
 * non-throwing invalid result so the `test` action can record status instead of
 * surfacing a 500. Malformed input (e.g. an empty model) still throws.
 */
export async function probeConnection(
  config: ProviderCallConfig,
  target: GenerationTarget,
): Promise<ProbeResult> {
  const request = buildGenerationProbeRequest(target);
  try {
    const response = await guardedFetch(config, request, requireAllowlistFor(target.adapter));
    const raw: RawProviderResponse = {
      ok: response.ok,
      status: response.status,
      body: await readBody(response),
    };
    const outcome = interpretGenerationProbeResponse(target.adapter, raw);
    return { ok: outcome.ok, reason: outcome.ok ? null : (outcome.reason ?? 'unknown_error') };
  } catch (error) {
    if (error instanceof SsrfError) {
      return { ok: false, reason: `blocked_endpoint:${error.code}` };
    }
    return { ok: false, reason: 'network_error' };
  }
}

/**
 * Assert a custom endpoint is safe to persist. The guard is always on at save
 * time (ADR 0024), so a base URL that fails the allowlist or resolves to a
 * non-public address is rejected before any ciphertext is written.
 */
export async function assertCustomEndpointAllowed(
  config: ProviderCallConfig,
  baseUrl: string,
): Promise<void> {
  await assertUrlIsSafe(baseUrl, {
    resolve: config.resolve,
    allowlist: config.allowlist,
    requireAllowlist: true,
  });
}

/** Execute one real organization generation with the same SSRF/redirect boundary as probes. */
export async function generateOrganizationDraft(
  config: ProviderCallConfig,
  target: OrganizationGenerationTarget,
): Promise<ValidatedOrganizationDraft> {
  const request = buildOrganizationGenerationRequest(target);
  let response: Response;
  try {
    response = await guardedFetch(config, request, requireAllowlistFor(target.adapter));
  } catch (error) {
    if (error instanceof SsrfError) throw new Error(`provider_blocked:${error.code}`);
    throw new Error('provider_network_error');
  }
  const outcome = interpretOrganizationGenerationResponse(
    target.adapter,
    { ok: response.ok, status: response.status, body: await readBody(response) },
    target.input,
  );
  if (!outcome.ok) throw new Error(`provider_${outcome.reason}`);
  return outcome.draft;
}
