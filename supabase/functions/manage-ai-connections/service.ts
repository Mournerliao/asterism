import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  isCustomGenerationAdapter,
  validateGenerationBaseUrl,
  validateGenerationCredential,
} from '../../../packages/core/src/ai/generation-registry.ts';
import {
  type GenerationConnectionStatus,
  readTestedModel,
  resolveActiveGenerationModel,
} from '../../../packages/core/src/ai/generation-selection.ts';
import { SsrfError } from '../../../packages/core/src/ai/ssrf.ts';
import type { Database, Json } from '../../../packages/db/src/database.types.ts';
import {
  buildCredentialAad,
  decryptCredential,
  encryptCredential,
  type KeyRing,
} from './crypto.ts';
import type {
  AiAdapterId,
  ConnectionView,
  CreateConnectionInput,
  DiscoverModelsInput,
  ManageAiConnectionsDependencies,
  SettingsView,
  TestConnectionInput,
  UpdateConnectionInput,
  UpdateSettingsInput,
} from './handler.ts';
import {
  assertCustomEndpointAllowed,
  discoverConnectionModels,
  type ProviderCallConfig,
  probeConnection,
} from './provider-call.ts';

export type AiConnectionsAdminClient = ReturnType<typeof createClient<Database>>;

const SAFE_COLUMNS =
  'id, adapter, name, base_url, status, credential_hint, generation_capability, created_at, updated_at';
const SETTINGS_COLUMNS =
  'generation_connection_id, generation_model, include_notes_in_ai, locale, theme';

function mapConnectionView(row: Record<string, unknown>): ConnectionView {
  return {
    id: String(row.id),
    adapter: row.adapter as AiAdapterId,
    name: String(row.name),
    baseUrl: typeof row.base_url === 'string' ? row.base_url : null,
    status: row.status as ConnectionView['status'],
    credentialHint: typeof row.credential_hint === 'string' ? row.credential_hint : null,
    generationCapability: row.generation_capability ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSettingsView(row: Record<string, unknown> | null): SettingsView {
  return {
    generationConnectionId:
      row && typeof row.generation_connection_id === 'string' ? row.generation_connection_id : null,
    generationModel: row && typeof row.generation_model === 'string' ? row.generation_model : null,
    includeNotesInAi: Boolean(row?.include_notes_in_ai),
    locale: (row?.locale as SettingsView['locale']) ?? null,
    theme: (row?.theme as SettingsView['theme']) ?? null,
  };
}

function deriveCredentialHint(apiKey: string): string {
  return `••••${apiKey.trim().slice(-4)}`;
}

async function assertEndpoint(
  providerConfig: ProviderCallConfig,
  adapter: AiAdapterId,
  baseUrl: string | null,
): Promise<void> {
  if (!isCustomGenerationAdapter(adapter) || !baseUrl) return;
  try {
    await assertCustomEndpointAllowed(providerConfig, baseUrl);
  } catch (error) {
    if (error instanceof SsrfError) throw new Error('endpoint_not_allowed');
    throw error;
  }
}

async function readConnectionCredential(
  admin: AiConnectionsAdminClient,
  ring: KeyRing,
  userId: string,
  connectionId: string,
): Promise<{
  adapter: AiAdapterId;
  baseUrl: string | null;
  apiKey: string;
  status: ConnectionView['status'];
} | null> {
  const existing = await admin
    .from('ai_provider_connections')
    .select(
      'adapter, base_url, credential_ciphertext, credential_nonce, credential_version, status',
    )
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing.error) throw new Error('connection_read_failed');
  if (!existing.data) return null;
  const row = existing.data as unknown as Record<string, unknown>;
  const version = Number(row.credential_version);
  const apiKey = await decryptCredential(
    ring,
    {
      ciphertext: String(row.credential_ciphertext),
      nonce: String(row.credential_nonce),
      version,
    },
    buildCredentialAad(version, userId, connectionId),
  );
  return {
    adapter: row.adapter as AiAdapterId,
    baseUrl: typeof row.base_url === 'string' ? row.base_url : null,
    apiKey,
    status: row.status as ConnectionView['status'],
  };
}

export function createAiConnectionService({
  admin,
  ring,
  providerConfig,
}: {
  admin: AiConnectionsAdminClient;
  ring: KeyRing;
  providerConfig: ProviderCallConfig;
}): Omit<ManageAiConnectionsDependencies, 'authenticate'> {
  const getSettings = async (userId: string): Promise<SettingsView> => {
    const { data, error } = await admin
      .from('user_settings')
      .select(SETTINGS_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error('settings_read_failed');
    return mapSettingsView((data as unknown as Record<string, unknown> | null) ?? null);
  };

  return {
    async listConnections(userId) {
      const { data, error } = await admin
        .from('ai_provider_connections')
        .select(SAFE_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw new Error('connections_read_failed');
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapConnectionView);
    },

    async createConnection(userId: string, input: CreateConnectionInput) {
      const credential = validateGenerationCredential(input.adapter, input.credential);
      if (!credential.ok || !credential.credential) {
        throw new Error(credential.error ?? 'missing_api_key');
      }
      const baseUrl = validateGenerationBaseUrl(input.adapter, input.baseUrl);
      if (!baseUrl.ok) throw new Error(baseUrl.error ?? 'invalid_base_url');
      const normalizedBaseUrl = baseUrl.baseUrl ?? null;
      await assertEndpoint(providerConfig, input.adapter, normalizedBaseUrl);

      const id = crypto.randomUUID();
      const encrypted = await encryptCredential(
        ring,
        credential.credential.apiKey,
        buildCredentialAad(ring.activeVersion, userId, id),
      );
      const { data, error } = await admin
        .from('ai_provider_connections')
        .insert({
          id,
          user_id: userId,
          adapter: input.adapter,
          name: input.name,
          base_url: normalizedBaseUrl,
          credential_ciphertext: encrypted.ciphertext,
          credential_nonce: encrypted.nonce,
          credential_version: encrypted.version,
          credential_hint: deriveCredentialHint(credential.credential.apiKey),
          status: 'untested',
        })
        .select(SAFE_COLUMNS)
        .single();
      if (error || !data) {
        if (error?.code === '23505') throw new Error('duplicate_builtin_connection');
        throw new Error('connection_write_failed');
      }
      return mapConnectionView(data as unknown as Record<string, unknown>);
    },

    async updateConnection(userId: string, connectionId: string, input: UpdateConnectionInput) {
      const existing = await admin
        .from('ai_provider_connections')
        .select('adapter, status, generation_capability')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .maybeSingle();
      if (existing.error) throw new Error('connection_read_failed');
      if (!existing.data) return null;
      const existingRow = existing.data as unknown as Record<string, unknown>;
      const adapter = existingRow.adapter as AiAdapterId;
      const patch: Database['public']['Tables']['ai_provider_connections']['Update'] = {};
      let resetStatus = false;

      if (input.name !== undefined) patch.name = input.name;
      if (input.baseUrl !== undefined) {
        const baseUrl = validateGenerationBaseUrl(adapter, input.baseUrl);
        if (!baseUrl.ok) throw new Error(baseUrl.error ?? 'invalid_base_url');
        const normalized = baseUrl.baseUrl ?? null;
        await assertEndpoint(providerConfig, adapter, normalized);
        patch.base_url = normalized;
        resetStatus = true;
      }
      if (input.credential !== undefined) {
        const credential = validateGenerationCredential(adapter, input.credential);
        if (!credential.ok || !credential.credential) {
          throw new Error(credential.error ?? 'missing_api_key');
        }
        const encrypted = await encryptCredential(
          ring,
          credential.credential.apiKey,
          buildCredentialAad(ring.activeVersion, userId, connectionId),
        );
        patch.credential_ciphertext = encrypted.ciphertext;
        patch.credential_nonce = encrypted.nonce;
        patch.credential_version = encrypted.version;
        patch.credential_hint = deriveCredentialHint(credential.credential.apiKey);
        resetStatus = true;
      }
      if (resetStatus) patch.generation_capability = null;
      if (input.enabled === false) {
        patch.status = 'disabled';
      } else if (resetStatus) {
        patch.status = 'untested';
      } else if (input.enabled === true) {
        patch.status = readTestedModel(existingRow.generation_capability) ? 'valid' : 'untested';
      }

      const { data, error } = await admin
        .from('ai_provider_connections')
        .update(patch)
        .eq('id', connectionId)
        .eq('user_id', userId)
        .select(SAFE_COLUMNS)
        .maybeSingle();
      if (error) throw new Error('connection_write_failed');
      return data ? mapConnectionView(data as unknown as Record<string, unknown>) : null;
    },

    async deleteConnection(userId, connectionId) {
      const cleared = await admin
        .from('user_settings')
        .update({ generation_connection_id: null, generation_model: null })
        .eq('user_id', userId)
        .eq('generation_connection_id', connectionId);
      if (cleared.error) throw new Error('connection_delete_failed');
      const { data, error } = await admin
        .from('ai_provider_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();
      if (error) throw new Error('connection_delete_failed');
      return Boolean(data);
    },

    async testConnection(userId: string, input: TestConnectionInput) {
      const connection = await readConnectionCredential(admin, ring, userId, input.connectionId);
      if (!connection) return null;
      const probe = await probeConnection(providerConfig, {
        adapter: connection.adapter,
        baseUrl: connection.baseUrl,
        credential: { apiKey: connection.apiKey },
        model: input.model,
      });
      const capability: Json = {
        testedAt: new Date().toISOString(),
        model: input.model,
        ok: probe.ok,
        reason: probe.reason,
      };
      const { data, error } = await admin
        .from('ai_provider_connections')
        .update({
          status: connection.status === 'disabled' ? 'disabled' : probe.ok ? 'valid' : 'invalid',
          generation_capability: capability,
        })
        .eq('id', input.connectionId)
        .eq('user_id', userId)
        .select(SAFE_COLUMNS)
        .maybeSingle();
      if (error) throw new Error('connection_write_failed');
      return data ? mapConnectionView(data as unknown as Record<string, unknown>) : null;
    },

    async discoverModels(userId: string, input: DiscoverModelsInput) {
      const connection = await readConnectionCredential(admin, ring, userId, input.connectionId);
      if (!connection) return null;
      return discoverConnectionModels(providerConfig, {
        adapter: connection.adapter,
        baseUrl: connection.baseUrl,
        credential: { apiKey: connection.apiKey },
      });
    },

    getSettings,

    async updateSettings(userId: string, input: UpdateSettingsInput) {
      const patch: Database['public']['Tables']['user_settings']['Insert'] = { user_id: userId };
      if (input.generationConnectionId !== undefined || input.generationModel !== undefined) {
        const current = await getSettings(userId);
        const effectiveConnectionId =
          input.generationConnectionId !== undefined
            ? input.generationConnectionId
            : current.generationConnectionId;
        if (!effectiveConnectionId) {
          if (input.generationModel) throw new Error('connection_not_valid');
          patch.generation_connection_id = null;
          patch.generation_model = null;
        } else {
          const { data, error } = await admin
            .from('ai_provider_connections')
            .select('status, generation_capability')
            .eq('id', effectiveConnectionId)
            .eq('user_id', userId)
            .maybeSingle();
          if (error) throw new Error('settings_write_failed');
          const row = data as unknown as Record<string, unknown> | null;
          const resolved = resolveActiveGenerationModel(
            {
              status: (row?.status as GenerationConnectionStatus) ?? 'invalid',
              capability: row?.generation_capability ?? null,
            },
            input.generationModel ?? null,
          );
          if (!resolved.ok) throw new Error(resolved.code);
          patch.generation_connection_id = effectiveConnectionId;
          patch.generation_model = resolved.model;
        }
      }
      if (input.includeNotesInAi !== undefined) patch.include_notes_in_ai = input.includeNotesInAi;
      if (input.locale !== undefined) patch.locale = input.locale;
      if (input.theme !== undefined) patch.theme = input.theme;

      const { data, error } = await admin
        .from('user_settings')
        .upsert(patch, { onConflict: 'user_id' })
        .select(SETTINGS_COLUMNS)
        .single();
      if (error || !data) throw new Error('settings_write_failed');
      return mapSettingsView(data as unknown as Record<string, unknown>);
    },
  };
}
