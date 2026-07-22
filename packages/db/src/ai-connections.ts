import type { SupabaseClient } from './client';

export type AiAdapterId = 'openai' | 'google' | 'anthropic' | 'openrouter' | 'openai-compatible';
export type AiConnectionStatus = 'untested' | 'valid' | 'invalid' | 'disabled';
export type LocalePreference = 'en' | 'zh-CN';
export type ThemePreference = 'system' | 'light' | 'dark';

/** Safe projection of a connection: never carries credential ciphertext, nonce, or plaintext. */
export interface AiConnection {
  id: string;
  adapter: AiAdapterId;
  name: string;
  baseUrl: string | null;
  status: AiConnectionStatus;
  credentialHint: string | null;
  generationCapability: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AiSettings {
  generationConnectionId: string | null;
  generationModel: string | null;
  includeNotesInAi: boolean;
  locale: LocalePreference | null;
  theme: ThemePreference | null;
}

export interface CreateAiConnectionInput {
  adapter: AiAdapterId;
  name: string;
  baseUrl?: string | null;
  credential: { apiKey: string };
}

export interface UpdateAiConnectionInput {
  name?: string;
  baseUrl?: string | null;
  credential?: { apiKey: string };
  enabled?: boolean;
}

export interface UpdateAiSettingsInput {
  generationConnectionId?: string | null;
  generationModel?: string | null;
  includeNotesInAi?: boolean;
  locale?: LocalePreference | null;
  theme?: ThemePreference | null;
}

const ADAPTERS = new Set<AiAdapterId>([
  'openai',
  'google',
  'anthropic',
  'openrouter',
  'openai-compatible',
]);
const STATUSES = new Set<AiConnectionStatus>(['untested', 'valid', 'invalid', 'disabled']);

const EMPTY_SETTINGS: AiSettings = {
  generationConnectionId: null,
  generationModel: null,
  includeNotesInAi: false,
  locale: null,
  theme: null,
};

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

/** Credential material that must never cross the trust boundary into the client. */
const FORBIDDEN_CONNECTION_FIELDS: readonly string[] = [
  'credential_ciphertext',
  'credentialCiphertext',
  'credential_nonce',
  'credentialNonce',
  'credential_version',
  'credentialVersion',
  'credential',
  'apiKey',
];

/** Trust-boundary guard for the function's safe connection projection. */
export function isAiConnection(value: unknown): value is AiConnection {
  if (!value || typeof value !== 'object') return false;
  const connection = value as Record<string, unknown>;
  if (FORBIDDEN_CONNECTION_FIELDS.some((field) => field in connection)) return false;
  return (
    typeof connection.id === 'string' &&
    ADAPTERS.has(connection.adapter as AiAdapterId) &&
    typeof connection.name === 'string' &&
    isStringOrNull(connection.baseUrl) &&
    STATUSES.has(connection.status as AiConnectionStatus) &&
    isStringOrNull(connection.credentialHint) &&
    typeof connection.createdAt === 'string' &&
    typeof connection.updatedAt === 'string'
  );
}

export function isAiSettings(value: unknown): value is AiSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return (
    isStringOrNull(settings.generationConnectionId) &&
    isStringOrNull(settings.generationModel) &&
    typeof settings.includeNotesInAi === 'boolean' &&
    (settings.locale === null || settings.locale === 'en' || settings.locale === 'zh-CN') &&
    (settings.theme === null ||
      settings.theme === 'system' ||
      settings.theme === 'light' ||
      settings.theme === 'dark')
  );
}

async function invoke(client: SupabaseClient, body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.functions.invoke<unknown>('manage-ai-connections', { body });
  if (error) throw error;
  return data;
}

function readConnection(data: unknown): AiConnection {
  const connection = (data as { connection?: unknown } | null)?.connection;
  if (!isAiConnection(connection)) {
    throw new Error('manage-ai-connections returned an invalid response');
  }
  return connection;
}

function readSettings(data: unknown): AiSettings {
  const settings = (data as { settings?: unknown } | null)?.settings;
  if (!isAiSettings(settings)) {
    throw new Error('manage-ai-connections returned an invalid response');
  }
  return settings;
}

export async function listAiConnections(client: SupabaseClient): Promise<AiConnection[]> {
  const data = await invoke(client, { action: 'list' });
  const connections = (data as { connections?: unknown } | null)?.connections;
  if (!Array.isArray(connections) || !connections.every(isAiConnection)) {
    throw new Error('manage-ai-connections returned an invalid response');
  }
  return connections;
}

export async function createAiConnection(
  client: SupabaseClient,
  input: CreateAiConnectionInput,
): Promise<AiConnection> {
  return readConnection(await invoke(client, { action: 'create', ...input }));
}

export async function updateAiConnection(
  client: SupabaseClient,
  connectionId: string,
  input: UpdateAiConnectionInput,
): Promise<AiConnection> {
  return readConnection(await invoke(client, { action: 'update', connectionId, ...input }));
}

export async function testAiConnection(
  client: SupabaseClient,
  connectionId: string,
  model: string,
): Promise<AiConnection> {
  return readConnection(await invoke(client, { action: 'test', connectionId, model }));
}

export async function discoverAiConnectionModels(
  client: SupabaseClient,
  connectionId: string,
): Promise<string[]> {
  const data = await invoke(client, { action: 'discover-models', connectionId });
  const models = (data as { models?: unknown } | null)?.models;
  if (!Array.isArray(models) || !models.every((model) => typeof model === 'string')) {
    throw new Error('manage-ai-connections returned an invalid response');
  }
  return models;
}

export async function deleteAiConnection(
  client: SupabaseClient,
  connectionId: string,
): Promise<void> {
  const data = await invoke(client, { action: 'delete', connectionId });
  if ((data as { deleted?: unknown } | null)?.deleted !== true) {
    throw new Error('manage-ai-connections returned an invalid response');
  }
}

export async function updateAiSettings(
  client: SupabaseClient,
  input: UpdateAiSettingsInput,
): Promise<AiSettings> {
  return readSettings(await invoke(client, { action: 'update-settings', ...input }));
}

/**
 * Read the caller's settings directly (owner RLS on `user_settings`); no row yet
 * means defaults. Writes go through {@link updateAiSettings} so the trusted
 * function can enforce the valid-connection rule and the deferred FK.
 */
export async function getAiSettings(client: SupabaseClient, userId: string): Promise<AiSettings> {
  const { data, error } = await client
    .from('user_settings')
    .select('generation_connection_id, generation_model, include_notes_in_ai, locale, theme')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ...EMPTY_SETTINGS };
  return {
    generationConnectionId: data.generation_connection_id,
    generationModel: data.generation_model,
    includeNotesInAi: data.include_notes_in_ai,
    locale: data.locale,
    theme: data.theme,
  };
}
