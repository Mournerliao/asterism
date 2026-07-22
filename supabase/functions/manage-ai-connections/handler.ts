/**
 * Trusted HTTP interface for BYOK generation connections. Mirrors bulk-organize:
 * this handler is pure and dependency-injected — it authenticates the caller,
 * validates request shape, and routes to ownership-scoped operations. Credential
 * ciphertext, nonces, and plaintext never appear here; the injected dependencies
 * own encryption and only ever return the safe projection. Deep validation
 * (adapter credential/base-url rules, SSRF) lives in the injected deps so this
 * file stays free of cross-module value imports and easy to unit test.
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type AiAdapterId = 'openai' | 'google' | 'anthropic' | 'openrouter' | 'openai-compatible';
export type ConnectionStatus = 'untested' | 'valid' | 'invalid' | 'disabled';
export type LocalePreference = 'en' | 'zh-CN';
export type ThemePreference = 'system' | 'light' | 'dark';

const ADAPTER_IDS: readonly AiAdapterId[] = [
  'openai',
  'google',
  'anthropic',
  'openrouter',
  'openai-compatible',
];

export interface ConnectionView {
  id: string;
  adapter: AiAdapterId;
  name: string;
  baseUrl: string | null;
  status: ConnectionStatus;
  credentialHint: string | null;
  generationCapability: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsView {
  generationConnectionId: string | null;
  generationModel: string | null;
  includeNotesInAi: boolean;
  locale: LocalePreference | null;
  theme: ThemePreference | null;
}

export interface CreateConnectionInput {
  adapter: AiAdapterId;
  name: string;
  baseUrl: string | null;
  credential: { apiKey: string };
}

export interface UpdateConnectionInput {
  name?: string;
  baseUrl?: string | null;
  credential?: { apiKey: string };
  enabled?: boolean;
}

export interface TestConnectionInput {
  connectionId: string;
  model: string;
}

export interface DiscoverModelsInput {
  connectionId: string;
}

export interface UpdateSettingsInput {
  generationConnectionId?: string | null;
  generationModel?: string | null;
  includeNotesInAi?: boolean;
  locale?: LocalePreference | null;
  theme?: ThemePreference | null;
}

export interface ManageAiConnectionsDependencies {
  authenticate(jwt: string): Promise<string | null>;
  listConnections(userId: string): Promise<ConnectionView[]>;
  createConnection(userId: string, input: CreateConnectionInput): Promise<ConnectionView>;
  updateConnection(
    userId: string,
    connectionId: string,
    input: UpdateConnectionInput,
  ): Promise<ConnectionView | null>;
  deleteConnection(userId: string, connectionId: string): Promise<boolean>;
  testConnection(userId: string, input: TestConnectionInput): Promise<ConnectionView | null>;
  discoverModels(userId: string, input: DiscoverModelsInput): Promise<string[] | null>;
  getSettings(userId: string): Promise<SettingsView>;
  updateSettings(userId: string, input: UpdateSettingsInput): Promise<SettingsView>;
}

const CLIENT_ERROR_CODES = new Set([
  'unknown_adapter',
  'missing_api_key',
  'base_url_required',
  'base_url_not_https',
  'base_url_not_allowed',
  'invalid_base_url',
  'connection_not_valid',
  'endpoint_not_allowed',
  'model_not_verified',
]);
const CONFLICT_CODES = new Set(['duplicate_builtin_connection']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isNonEmptyString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function isAdapter(value: unknown): value is AiAdapterId {
  return typeof value === 'string' && (ADAPTER_IDS as readonly string[]).includes(value);
}

function readCredential(value: unknown): { apiKey: string } | null {
  const record = asRecord(value);
  if (!record || !isNonEmptyString(record.apiKey, 8192)) {
    return null;
  }
  return { apiKey: record.apiKey };
}

function readOptionalBaseUrl(value: unknown): { ok: true; baseUrl: string | null } | { ok: false } {
  if (value === undefined || value === null) {
    return { ok: true, baseUrl: null };
  }
  if (typeof value === 'string' && value.length <= 2048 && value.trim().length > 0) {
    return { ok: true, baseUrl: value.trim() };
  }
  return { ok: false };
}

function normalizeCreateInput(value: Record<string, unknown>): CreateConnectionInput | null {
  if (!isAdapter(value.adapter) || !isNonEmptyString(value.name, 120)) {
    return null;
  }
  const credential = readCredential(value.credential);
  if (!credential) {
    return null;
  }
  const baseUrl = readOptionalBaseUrl(value.baseUrl);
  if (!baseUrl.ok) {
    return null;
  }
  return { adapter: value.adapter, name: value.name.trim(), baseUrl: baseUrl.baseUrl, credential };
}

function normalizeUpdateInput(
  value: Record<string, unknown>,
): { connectionId: string; input: UpdateConnectionInput } | null {
  if (!isNonEmptyString(value.connectionId, 128)) {
    return null;
  }
  const input: UpdateConnectionInput = {};
  if (value.name !== undefined) {
    if (!isNonEmptyString(value.name, 120)) {
      return null;
    }
    input.name = value.name.trim();
  }
  if (value.baseUrl !== undefined) {
    const baseUrl = readOptionalBaseUrl(value.baseUrl);
    if (!baseUrl.ok) {
      return null;
    }
    input.baseUrl = baseUrl.baseUrl;
  }
  if (value.credential !== undefined) {
    const credential = readCredential(value.credential);
    if (!credential) {
      return null;
    }
    input.credential = credential;
  }
  if (value.enabled !== undefined) {
    if (typeof value.enabled !== 'boolean') {
      return null;
    }
    input.enabled = value.enabled;
  }
  if (Object.keys(input).length === 0) {
    return null;
  }
  return { connectionId: value.connectionId.trim(), input };
}

function normalizeTestInput(value: Record<string, unknown>): TestConnectionInput | null {
  if (!isNonEmptyString(value.connectionId, 128) || !isNonEmptyString(value.model, 200)) {
    return null;
  }
  return { connectionId: value.connectionId.trim(), model: value.model.trim() };
}

function normalizeDiscoverModelsInput(value: Record<string, unknown>): DiscoverModelsInput | null {
  if (!isNonEmptyString(value.connectionId, 128)) return null;
  return { connectionId: value.connectionId.trim() };
}

function normalizeSettingsInput(value: Record<string, unknown>): UpdateSettingsInput | null {
  const input: UpdateSettingsInput = {};
  if (value.generationConnectionId !== undefined) {
    if (
      value.generationConnectionId !== null &&
      !isNonEmptyString(value.generationConnectionId, 128)
    ) {
      return null;
    }
    input.generationConnectionId =
      value.generationConnectionId === null
        ? null
        : (value.generationConnectionId as string).trim();
  }
  if (value.generationModel !== undefined) {
    if (value.generationModel !== null && !isNonEmptyString(value.generationModel, 200)) {
      return null;
    }
    input.generationModel =
      value.generationModel === null ? null : (value.generationModel as string).trim();
  }
  if (value.includeNotesInAi !== undefined) {
    if (typeof value.includeNotesInAi !== 'boolean') {
      return null;
    }
    input.includeNotesInAi = value.includeNotesInAi;
  }
  if (value.locale !== undefined) {
    if (value.locale !== null && value.locale !== 'en' && value.locale !== 'zh-CN') {
      return null;
    }
    input.locale = value.locale as LocalePreference | null;
  }
  if (value.theme !== undefined) {
    if (
      value.theme !== null &&
      value.theme !== 'system' &&
      value.theme !== 'light' &&
      value.theme !== 'dark'
    ) {
      return null;
    }
    input.theme = value.theme as ThemePreference | null;
  }
  return Object.keys(input).length === 0 ? null : input;
}

export function createManageAiConnectionsHandler(dependencies: ManageAiConnectionsDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return json({ error: 'authentication_required' }, 401);
    }
    let userId: string | null = null;
    try {
      userId = await dependencies.authenticate(jwt);
    } catch {
      userId = null;
    }
    if (!userId) {
      return json({ error: 'authentication_required' }, 401);
    }

    const body = asRecord(await request.json().catch(() => null));
    if (!body) {
      return json({ error: 'invalid_request' }, 400);
    }

    try {
      switch (body.action) {
        case 'list':
          return json({ connections: await dependencies.listConnections(userId) });
        case 'get-settings':
          return json({ settings: await dependencies.getSettings(userId) });
        case 'create': {
          const input = normalizeCreateInput(body);
          return input
            ? json({ connection: await dependencies.createConnection(userId, input) }, 201)
            : json({ error: 'invalid_request' }, 400);
        }
        case 'update': {
          const normalized = normalizeUpdateInput(body);
          if (!normalized) {
            return json({ error: 'invalid_request' }, 400);
          }
          const connection = await dependencies.updateConnection(
            userId,
            normalized.connectionId,
            normalized.input,
          );
          return connection ? json({ connection }) : json({ error: 'connection_not_found' }, 404);
        }
        case 'delete': {
          if (!isNonEmptyString(body.connectionId, 128)) {
            return json({ error: 'invalid_request' }, 400);
          }
          const deleted = await dependencies.deleteConnection(userId, body.connectionId.trim());
          return deleted ? json({ deleted: true }) : json({ error: 'connection_not_found' }, 404);
        }
        case 'test': {
          const input = normalizeTestInput(body);
          if (!input) {
            return json({ error: 'invalid_request' }, 400);
          }
          const connection = await dependencies.testConnection(userId, input);
          return connection ? json({ connection }) : json({ error: 'connection_not_found' }, 404);
        }
        case 'discover-models': {
          const input = normalizeDiscoverModelsInput(body);
          if (!input) return json({ error: 'invalid_request' }, 400);
          const models = await dependencies.discoverModels(userId, input);
          return models ? json({ models }) : json({ error: 'connection_not_found' }, 404);
        }
        case 'update-settings': {
          const input = normalizeSettingsInput(body);
          return input
            ? json({ settings: await dependencies.updateSettings(userId, input) })
            : json({ error: 'invalid_request' }, 400);
        }
        default:
          return json({ error: 'invalid_request' }, 400);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : 'connection_operation_failed';
      const status = CONFLICT_CODES.has(code)
        ? 409
        : CLIENT_ERROR_CODES.has(code) || code.startsWith('invalid_')
          ? 400
          : 500;
      return json({ error: code }, status);
    }
  };
}
