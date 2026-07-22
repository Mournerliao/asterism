/**
 * Typed Generation Provider Registry (ADR 0018). Pure and runtime-agnostic: it
 * only builds request descriptors and interprets already-parsed responses, so it
 * runs unchanged in the web bundle and inside the trusted Edge Function. It never
 * performs I/O and never touches platform APIs. Keep this file self-contained (no
 * cross-file imports) so Deno can import it directly by path.
 */

export type GenerationAdapterId =
  | 'openai'
  | 'google'
  | 'anthropic'
  | 'openrouter'
  | 'openai-compatible';

export const GENERATION_ADAPTER_IDS: readonly GenerationAdapterId[] = [
  'openai',
  'google',
  'anthropic',
  'openrouter',
  'openai-compatible',
];

/**
 * The first-batch adapters all authenticate with a single API key. The per-adapter
 * validator slot keeps room for compound credentials (Azure / Vertex / Bedrock)
 * without forcing them through one `apiKey + baseUrl` shape.
 */
export interface GenerationCredential {
  apiKey: string;
}

export interface ProviderRequest {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

export interface RawProviderResponse {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface CredentialValidation {
  ok: boolean;
  credential?: GenerationCredential;
  error?: string;
}

export interface BaseUrlValidation {
  ok: boolean;
  baseUrl?: string | null;
  error?: string;
}

export interface ProbeOutcome {
  ok: boolean;
  reason?: string;
}

export interface GenerationTarget {
  adapter: GenerationAdapterId;
  baseUrl: string | null;
  credential: GenerationCredential;
  model: string;
}

export interface ModelDiscoveryTarget {
  adapter: GenerationAdapterId;
  baseUrl: string | null;
  credential: GenerationCredential;
}

export type OrganizationRelationType = 'tag' | 'collection';
export type OrganizationAction = 'add' | 'remove';

export interface OrganizationSuggestion {
  repoId: string;
  relationType: OrganizationRelationType;
  action: OrganizationAction;
  target: string;
}

export interface OrganizationDraft {
  suggestions: OrganizationSuggestion[];
  newCategories?: string[];
}

export interface OrganizationClassificationCandidate {
  id: string;
  name: string;
}

export interface OrganizationRepositoryInput {
  id: string;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  existingTagIds: string[];
  existingCollectionIds: string[];
  note?: string;
}

export interface OrganizationGenerationInput {
  repositories: OrganizationRepositoryInput[];
  tags: OrganizationClassificationCandidate[];
  collections: OrganizationClassificationCandidate[];
}

export interface OrganizationGenerationTarget extends GenerationTarget {
  input: OrganizationGenerationInput;
}

export interface OrganizationRelationChange {
  repoId: string;
  relationType: OrganizationRelationType;
  action: OrganizationAction;
  targetId: string;
}

export interface OrganizationNewClassification {
  relationType: OrganizationRelationType;
  name: string;
  repoIds: string[];
}

export interface ValidatedOrganizationDraft {
  version: 1;
  relationChanges: OrganizationRelationChange[];
  newClassifications: OrganizationNewClassification[];
}

export type OrganizationGenerationOutcome =
  | { ok: true; draft: ValidatedOrganizationDraft }
  | { ok: false; reason: string };

export class GenerationRegistryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'GenerationRegistryError';
    this.code = code;
  }
}

const BUILTIN_ENDPOINTS: Record<
  Exclude<GenerationAdapterId, 'openai-compatible'>,
  { baseUrl: string; host: string }
> = {
  openai: { baseUrl: 'https://api.openai.com/v1', host: 'api.openai.com' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', host: 'openrouter.ai' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', host: 'api.anthropic.com' },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    host: 'generativelanguage.googleapis.com',
  },
};

/** Fixed hostnames for built-in providers; treated as a natural allowlist (ADR 0024). */
export const BUILTIN_GENERATION_HOSTS: readonly string[] = Object.values(BUILTIN_ENDPOINTS).map(
  (entry) => entry.host,
);

const PROBE_SYSTEM_PROMPT =
  'You are Asterism, a GitHub Star organizer. Reply with strict minified JSON only. No prose, no markdown, no code fences.';
const PROBE_USER_PROMPT =
  'Confirm connectivity by returning exactly this JSON: ' +
  '{"suggestions":[{"repoId":"probe","relationType":"tag","action":"add","target":"example"}]}';
const ORGANIZATION_SYSTEM_PROMPT =
  'You organize GitHub Stars. Return strict JSON only, with exactly relationChanges and newClassifications. ' +
  'Existing targets must use supplied stable ids. Never invent repository or target ids. ' +
  'relationChanges entries use repoId, relationType (tag|collection), action (add|remove), targetId. ' +
  'newClassifications entries use relationType, name, repoIds and only represent additions. No prose or markdown.';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Structural guard for an organization draft; reused by the capability probe and slice B. */
export function isOrganizationDraft(value: unknown): value is OrganizationDraft {
  const root = asRecord(value);
  if (!root) return false;
  const suggestions = asArray(root.suggestions);
  if (!suggestions) return false;
  const suggestionsValid = suggestions.every((entry) => {
    const item = asRecord(entry);
    if (!item) return false;
    return (
      typeof item.repoId === 'string' &&
      (item.relationType === 'tag' || item.relationType === 'collection') &&
      (item.action === 'add' || item.action === 'remove') &&
      typeof item.target === 'string'
    );
  });
  if (!suggestionsValid) return false;
  if (root.newCategories !== undefined) {
    const categories = asArray(root.newCategories);
    if (!categories?.every((entry) => typeof entry === 'string')) return false;
  }
  return true;
}

/** Extract the first JSON object from model output, tolerating code fences and surrounding prose. */
export function extractJsonObject(text: string): unknown {
  const withoutFences = text.replace(/```(?:json)?/gi, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(withoutFences.slice(start, end + 1));
  } catch {
    return null;
  }
}

interface AdapterSpec {
  isCustom: boolean;
  supportsJsonMode: boolean;
  validateCredential(input: unknown): CredentialValidation;
  buildProbe(base: string, credential: GenerationCredential, model: string): ProviderRequest;
  buildModels(base: string, credential: GenerationCredential): ProviderRequest;
  extractText(body: unknown): string | null;
  parseModels(body: unknown): string[];
}

function validateApiKeyCredential(input: unknown): CredentialValidation {
  const record = asRecord(input);
  const apiKey = record ? asString(record.apiKey) : null;
  if (apiKey === null || apiKey.trim().length === 0) {
    return { ok: false, error: 'missing_api_key' };
  }
  return { ok: true, credential: { apiKey: apiKey.trim() } };
}

function openAiFamilyExtractText(body: unknown): string | null {
  const choices = asArray(asRecord(body)?.choices);
  const message = asRecord(asRecord(choices?.[0])?.message);
  return asString(message?.content);
}

function openAiFamilyParseModels(body: unknown): string[] {
  const data = asArray(asRecord(body)?.data);
  if (!data) return [];
  return data
    .map((entry) => asString(asRecord(entry)?.id))
    .filter((id): id is string => id !== null);
}

function buildOpenAiFamilySpec(supportsJsonMode: boolean, isCustom: boolean): AdapterSpec {
  return {
    isCustom,
    supportsJsonMode,
    validateCredential: validateApiKeyCredential,
    buildProbe(base, credential, model) {
      const payload: Record<string, unknown> = {
        model,
        temperature: 0,
        max_tokens: 256,
        messages: [
          { role: 'system', content: PROBE_SYSTEM_PROMPT },
          { role: 'user', content: PROBE_USER_PROMPT },
        ],
      };
      if (supportsJsonMode) payload.response_format = { type: 'json_object' };
      return {
        url: `${base}/chat/completions`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${credential.apiKey}`,
        },
        body: JSON.stringify(payload),
      };
    },
    buildModels(base, credential) {
      return {
        url: `${base}/models`,
        method: 'GET',
        headers: { authorization: `Bearer ${credential.apiKey}` },
      };
    },
    extractText: openAiFamilyExtractText,
    parseModels: openAiFamilyParseModels,
  };
}

const ADAPTER_SPECS: Record<GenerationAdapterId, AdapterSpec> = {
  openai: buildOpenAiFamilySpec(true, false),
  openrouter: buildOpenAiFamilySpec(true, false),
  'openai-compatible': buildOpenAiFamilySpec(false, true),
  anthropic: {
    isCustom: false,
    supportsJsonMode: false,
    validateCredential: validateApiKeyCredential,
    buildProbe(base, credential, model) {
      return {
        url: `${base}/messages`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': credential.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 256,
          system: PROBE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: PROBE_USER_PROMPT }],
        }),
      };
    },
    buildModels(base, credential) {
      return {
        url: `${base}/models`,
        method: 'GET',
        headers: { 'x-api-key': credential.apiKey, 'anthropic-version': '2023-06-01' },
      };
    },
    extractText(body) {
      const content = asArray(asRecord(body)?.content);
      if (!content) return null;
      const text = content
        .map((entry) => {
          const block = asRecord(entry);
          return block?.type === 'text' ? asString(block.text) : null;
        })
        .filter((value): value is string => value !== null)
        .join('');
      return text.length > 0 ? text : null;
    },
    parseModels(body) {
      const data = asArray(asRecord(body)?.data);
      if (!data) return [];
      return data
        .map((entry) => asString(asRecord(entry)?.id))
        .filter((id): id is string => id !== null);
    },
  },
  google: {
    isCustom: false,
    supportsJsonMode: true,
    validateCredential: validateApiKeyCredential,
    buildProbe(base, credential, model) {
      return {
        url: `${base}/models/${encodeURIComponent(model)}:generateContent`,
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': credential.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PROBE_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: PROBE_USER_PROMPT }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      };
    },
    buildModels(base, credential) {
      return {
        url: `${base}/models`,
        method: 'GET',
        headers: { 'x-goog-api-key': credential.apiKey },
      };
    },
    extractText(body) {
      const candidates = asArray(asRecord(body)?.candidates);
      const parts = asArray(asRecord(asRecord(candidates?.[0])?.content)?.parts);
      if (!parts) return null;
      const text = parts
        .map((entry) => asString(asRecord(entry)?.text))
        .filter((value): value is string => value !== null)
        .join('');
      return text.length > 0 ? text : null;
    },
    parseModels(body) {
      const models = asArray(asRecord(body)?.models);
      if (!models) return [];
      return models
        .map((entry) => asString(asRecord(entry)?.name))
        .filter((name): name is string => name !== null)
        .map((name) => (name.startsWith('models/') ? name.slice('models/'.length) : name));
    },
  },
};

/** Validate the typed credential payload for an adapter (server-side trust boundary). */
export function validateGenerationCredential(
  adapter: GenerationAdapterId,
  input: unknown,
): CredentialValidation {
  if (!GENERATION_ADAPTER_IDS.includes(adapter)) {
    return { ok: false, error: 'unknown_adapter' };
  }
  return ADAPTER_SPECS[adapter].validateCredential(input);
}

/** Validate and normalize the base URL: built-ins forbid it, custom endpoints require HTTPS. */
export function validateGenerationBaseUrl(
  adapter: GenerationAdapterId,
  baseUrl: string | null | undefined,
): BaseUrlValidation {
  const spec = ADAPTER_SPECS[adapter];
  if (!spec) return { ok: false, error: 'unknown_adapter' };
  if (!spec.isCustom) {
    if (baseUrl !== null && baseUrl !== undefined && baseUrl.trim().length > 0) {
      return { ok: false, error: 'base_url_not_allowed' };
    }
    return { ok: true, baseUrl: null };
  }
  if (baseUrl === null || baseUrl === undefined || baseUrl.trim().length === 0) {
    return { ok: false, error: 'base_url_required' };
  }
  let parsed: URL;
  try {
    parsed = new URL(baseUrl.trim());
  } catch {
    return { ok: false, error: 'invalid_base_url' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'base_url_not_https' };
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return { ok: false, error: 'invalid_base_url' };
  }
  return { ok: true, baseUrl: trimTrailingSlash(parsed.toString()) };
}

/** Resolve the effective base URL: the provider's fixed endpoint or the validated custom one. */
export function resolveGenerationBaseUrl(
  adapter: GenerationAdapterId,
  baseUrl: string | null,
): string {
  const spec = ADAPTER_SPECS[adapter];
  if (!spec) throw new GenerationRegistryError('unknown_adapter', `Unknown adapter: ${adapter}`);
  if (!spec.isCustom) {
    return BUILTIN_ENDPOINTS[adapter as Exclude<GenerationAdapterId, 'openai-compatible'>].baseUrl;
  }
  if (!baseUrl) {
    throw new GenerationRegistryError('base_url_required', 'Custom adapter requires a base URL');
  }
  return trimTrailingSlash(baseUrl);
}

/** Build the capability-probe request for a connection target. */
export function buildGenerationProbeRequest(target: GenerationTarget): ProviderRequest {
  const spec = ADAPTER_SPECS[target.adapter];
  if (!spec)
    throw new GenerationRegistryError('unknown_adapter', `Unknown adapter: ${target.adapter}`);
  if (target.model.trim().length === 0) {
    throw new GenerationRegistryError(
      'missing_model',
      'A model id is required to probe capability',
    );
  }
  const base = resolveGenerationBaseUrl(target.adapter, target.baseUrl);
  return spec.buildProbe(base, target.credential, target.model);
}

/** Interpret a probe response: valid only when it parses to a non-empty org-draft-shaped payload. */
export function interpretGenerationProbeResponse(
  adapter: GenerationAdapterId,
  response: RawProviderResponse,
): ProbeOutcome {
  const spec = ADAPTER_SPECS[adapter];
  if (!spec) return { ok: false, reason: 'unknown_adapter' };
  if (!response.ok) {
    return { ok: false, reason: response.status === 401 ? 'unauthorized' : 'upstream_error' };
  }
  const text = spec.extractText(response.body);
  if (text === null || text.trim().length === 0) {
    return { ok: false, reason: 'empty_response' };
  }
  const parsed = extractJsonObject(text);
  if (parsed === null) {
    return { ok: false, reason: 'unparseable_output' };
  }
  if (!isOrganizationDraft(parsed)) {
    return { ok: false, reason: 'schema_mismatch' };
  }
  return { ok: true };
}

/** Build the model-discovery request; the client falls back to a manual model id on failure. */
export function buildModelDiscoveryRequest(target: ModelDiscoveryTarget): ProviderRequest {
  const spec = ADAPTER_SPECS[target.adapter];
  if (!spec)
    throw new GenerationRegistryError('unknown_adapter', `Unknown adapter: ${target.adapter}`);
  const base = resolveGenerationBaseUrl(target.adapter, target.baseUrl);
  return spec.buildModels(base, target.credential);
}

/** Parse a model-discovery response into a list of model ids. */
export function parseModelDiscoveryResponse(
  adapter: GenerationAdapterId,
  response: RawProviderResponse,
): string[] {
  const spec = ADAPTER_SPECS[adapter];
  if (!spec || !response.ok) return [];
  return [
    ...new Set(
      spec
        .parseModels(response.body)
        .map((model) => model.trim())
        .filter(Boolean),
    ),
  ];
}

/** Whether an adapter is the custom openai-compatible adapter (subject to the allowlist). */
export function isCustomGenerationAdapter(adapter: GenerationAdapterId): boolean {
  return ADAPTER_SPECS[adapter]?.isCustom ?? false;
}

/** Build a real organization request while preserving each provider's native wire contract. */
export function buildOrganizationGenerationRequest(
  target: OrganizationGenerationTarget,
): ProviderRequest {
  if (target.model.trim().length === 0) {
    throw new GenerationRegistryError('missing_model', 'A model id is required');
  }
  const spec = ADAPTER_SPECS[target.adapter];
  if (!spec) {
    throw new GenerationRegistryError('unknown_adapter', `Unknown adapter: ${target.adapter}`);
  }
  const base = resolveGenerationBaseUrl(target.adapter, target.baseUrl);
  const prompt = JSON.stringify(target.input);
  if (target.adapter === 'anthropic') {
    return {
      url: `${base}/messages`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': target.credential.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: target.model,
        max_tokens: 4096,
        temperature: 0,
        system: ORGANIZATION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    };
  }
  if (target.adapter === 'google') {
    return {
      url: `${base}/models/${encodeURIComponent(target.model)}:generateContent`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': target.credential.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ORGANIZATION_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    };
  }
  const payload: Record<string, unknown> = {
    model: target.model,
    temperature: 0,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: ORGANIZATION_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  };
  if (spec.supportsJsonMode) payload.response_format = { type: 'json_object' };
  return {
    url: `${base}/chat/completions`,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${target.credential.apiKey}`,
    },
    body: JSON.stringify(payload),
  };
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).toSorted();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function normalizeClassificationName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

function validateOrganizationOutput(
  value: unknown,
  input: OrganizationGenerationInput,
): OrganizationGenerationOutcome {
  const root = asRecord(value);
  if (!root || !hasExactKeys(root, ['newClassifications', 'relationChanges'])) {
    return { ok: false, reason: 'schema_mismatch' };
  }
  const changes = asArray(root.relationChanges);
  const newClassifications = asArray(root.newClassifications);
  if (!changes || !newClassifications) return { ok: false, reason: 'schema_mismatch' };

  const repoIds = new Set(input.repositories.map((repo) => repo.id));
  const targets = {
    tag: new Set(input.tags.map((tag) => tag.id)),
    collection: new Set(input.collections.map((collection) => collection.id)),
  };
  const existingNames = {
    tag: new Set(
      input.tags.map((tag) => normalizeClassificationName(tag.name).toLocaleLowerCase()),
    ),
    collection: new Set(
      input.collections.map((collection) =>
        normalizeClassificationName(collection.name).toLocaleLowerCase(),
      ),
    ),
  };
  const relationKeys = new Set<string>();
  const relationChanges: OrganizationRelationChange[] = [];
  for (const entry of changes) {
    const item = asRecord(entry);
    if (!item || !hasExactKeys(item, ['action', 'relationType', 'repoId', 'targetId'])) {
      return { ok: false, reason: 'schema_mismatch' };
    }
    const repoId = asString(item.repoId);
    const targetId = asString(item.targetId);
    const relationType = item.relationType;
    const action = item.action;
    if (
      !repoId ||
      !repoIds.has(repoId) ||
      !targetId ||
      (relationType !== 'tag' && relationType !== 'collection') ||
      (action !== 'add' && action !== 'remove') ||
      !targets[relationType].has(targetId)
    ) {
      return { ok: false, reason: 'unknown_reference' };
    }
    const key = `${repoId}:${relationType}:${targetId}`;
    if (relationKeys.has(key)) return { ok: false, reason: 'contradictory_duplicate' };
    relationKeys.add(key);
    relationChanges.push({ repoId, relationType, action, targetId });
  }

  const newNames = { tag: new Set<string>(), collection: new Set<string>() };
  const normalizedNew: OrganizationNewClassification[] = [];
  for (const entry of newClassifications) {
    const item = asRecord(entry);
    if (!item || !hasExactKeys(item, ['name', 'relationType', 'repoIds'])) {
      return { ok: false, reason: 'schema_mismatch' };
    }
    const relationType = item.relationType;
    const nameValue = asString(item.name);
    const itemRepoIds = asArray(item.repoIds);
    if (
      (relationType !== 'tag' && relationType !== 'collection') ||
      !nameValue ||
      !itemRepoIds ||
      itemRepoIds.length === 0 ||
      !itemRepoIds.every((repoId) => typeof repoId === 'string' && repoIds.has(repoId))
    ) {
      return { ok: false, reason: 'unknown_reference' };
    }
    const name = normalizeClassificationName(nameValue);
    const folded = name.toLocaleLowerCase();
    if (
      name.length === 0 ||
      name.length > 100 ||
      existingNames[relationType].has(folded) ||
      newNames[relationType].has(folded)
    ) {
      return { ok: false, reason: 'duplicate_classification' };
    }
    const uniqueRepoIds = [...new Set(itemRepoIds as string[])];
    if (uniqueRepoIds.length !== itemRepoIds.length) {
      return { ok: false, reason: 'contradictory_duplicate' };
    }
    newNames[relationType].add(folded);
    normalizedNew.push({ relationType, name, repoIds: uniqueRepoIds });
  }
  return {
    ok: true,
    draft: { version: 1, relationChanges, newClassifications: normalizedNew },
  };
}

/** Parse and validate a real organization response against the authoritative request snapshot. */
export function interpretOrganizationGenerationResponse(
  adapter: GenerationAdapterId,
  response: RawProviderResponse,
  input: OrganizationGenerationInput,
): OrganizationGenerationOutcome {
  const spec = ADAPTER_SPECS[adapter];
  if (!spec) return { ok: false, reason: 'unknown_adapter' };
  if (!response.ok) return { ok: false, reason: 'upstream_error' };
  const text = spec.extractText(response.body);
  if (!text?.trim()) return { ok: false, reason: 'empty_response' };
  const parsed = extractJsonObject(text);
  if (parsed === null) return { ok: false, reason: 'unparseable_output' };
  return validateOrganizationOutput(parsed, input);
}
