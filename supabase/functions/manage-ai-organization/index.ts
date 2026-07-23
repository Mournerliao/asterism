import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { GenerationAdapterId } from '../../../packages/core/src/ai/generation-registry.ts';
import type { DnsResolver, HostAllowlist } from '../../../packages/core/src/ai/ssrf.ts';
import type { Database, Json } from '../../../packages/db/src/database.types.ts';
import {
  buildCredentialAad,
  buildKeyRing,
  decryptCredential,
  type KeyRing,
  parseKeyMaterial,
} from '../manage-ai-connections/crypto.ts';
import {
  generateOrganizationDraft,
  type ProviderCallConfig,
} from '../manage-ai-connections/provider-call.ts';
import { type AiOrganizationDraftView, createManageAiOrganizationHandler } from './handler.ts';
import { createAiOrganizationService, type OrganizationContext } from './service.ts';

type AdminClient = ReturnType<typeof createClient<Database>>;

function parseAllowlist(raw: string | undefined): HostAllowlist {
  const value = (raw ?? '').trim();
  return value === '*'
    ? { mode: 'all' }
    : {
        mode: 'list',
        domains: value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      };
}

let cachedRing: Promise<KeyRing> | null = null;
function getKeyRing(): Promise<KeyRing> {
  if (!cachedRing) {
    const { spec, activeVersion } = parseKeyMaterial(
      Deno.env.get('AI_CREDENTIAL_ENCRYPTION_KEYS'),
      Deno.env.get('AI_CREDENTIAL_ACTIVE_VERSION'),
    );
    cachedRing = buildKeyRing(spec, activeVersion);
  }
  return cachedRing;
}

const resolveDns: DnsResolver = async (hostname) => {
  const lookups = await Promise.allSettled([
    Deno.resolveDns(hostname, 'A'),
    Deno.resolveDns(hostname, 'AAAA'),
  ]);
  return lookups.flatMap((lookup) => (lookup.status === 'fulfilled' ? lookup.value : []));
};

function mapDraft(row: Record<string, unknown>): AiOrganizationDraftView {
  return {
    id: String(row.id),
    sourceRepoIds: row.source_repo_ids as string[],
    suggestions: row.suggestions as AiOrganizationDraftView['suggestions'],
    generationConnectionId: String(row.generation_connection_id),
    generationAdapter: String(row.generation_adapter),
    generationModel: String(row.generation_model),
    reviewState: 'review',
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function createDataDependencies(
  admin: AdminClient,
  ring: KeyRing,
  providerConfig: ProviderCallConfig,
) {
  return {
    async loadContext(userId: string, repoIds: string[]): Promise<OrganizationContext> {
      const [settings, stars, tags, collections, repoTags, collectionRepos] = await Promise.all([
        admin
          .from('user_settings')
          .select('generation_connection_id, generation_model, include_notes_in_ai')
          .eq('user_id', userId)
          .maybeSingle(),
        admin
          .from('user_stars')
          .select('repo_id, repos!inner(id, full_name, description, language, topics)')
          .eq('user_id', userId)
          .in('repo_id', repoIds),
        admin.from('tags').select('id, name').eq('user_id', userId),
        admin.from('collections').select('id, name').eq('user_id', userId),
        admin
          .from('repo_tags')
          .select('repo_id, tag_id')
          .eq('user_id', userId)
          .in('repo_id', repoIds),
        admin
          .from('collection_repos')
          .select('repo_id, collection_id')
          .eq('user_id', userId)
          .in('repo_id', repoIds),
      ]);
      for (const result of [settings, stars, tags, collections, repoTags, collectionRepos]) {
        if (result.error) throw new Error('organization_context_read_failed');
      }
      const settingsRow = settings.data as Record<string, unknown> | null;
      const connectionId =
        typeof settingsRow?.generation_connection_id === 'string'
          ? settingsRow.generation_connection_id
          : null;
      const includeNotes = Boolean(settingsRow?.include_notes_in_ai);
      const [connection, notes] = await Promise.all([
        connectionId
          ? admin
              .from('ai_provider_connections')
              .select('id, adapter, base_url, status, generation_capability')
              .eq('id', connectionId)
              .eq('user_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        includeNotes
          ? admin.from('notes').select('repo_id, body').eq('user_id', userId).in('repo_id', repoIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (connection.error || notes.error) throw new Error('organization_context_read_failed');
      const connectionRow = connection.data as Record<string, unknown> | null;
      return {
        settings: {
          generationConnectionId: connectionId,
          generationModel:
            typeof settingsRow?.generation_model === 'string' ? settingsRow.generation_model : null,
          includeNotesInAi: includeNotes,
        },
        connection: connectionRow
          ? {
              id: String(connectionRow.id),
              adapter: connectionRow.adapter as GenerationAdapterId,
              baseUrl: typeof connectionRow.base_url === 'string' ? connectionRow.base_url : null,
              status: connectionRow.status as 'untested' | 'valid' | 'invalid' | 'disabled',
              capability: connectionRow.generation_capability,
            }
          : null,
        repositories: ((stars.data ?? []) as unknown as Array<Record<string, unknown>>).map(
          (star) => {
            const repo = star.repos as Record<string, unknown>;
            return {
              id: String(repo.id),
              fullName: String(repo.full_name),
              description: typeof repo.description === 'string' ? repo.description : null,
              language: typeof repo.language === 'string' ? repo.language : null,
              topics: Array.isArray(repo.topics) ? repo.topics.map(String) : [],
            };
          },
        ),
        tags: ((tags.data ?? []) as Array<{ id: string; name: string }>).map((tag) => ({ ...tag })),
        collections: ((collections.data ?? []) as Array<{ id: string; name: string }>).map(
          (collection) => ({ ...collection }),
        ),
        repoTags: ((repoTags.data ?? []) as Array<{ repo_id: string; tag_id: string }>).map(
          (link) => ({ repoId: link.repo_id, tagId: link.tag_id }),
        ),
        collectionRepos: (
          (collectionRepos.data ?? []) as Array<{ repo_id: string; collection_id: string }>
        ).map((link) => ({ repoId: link.repo_id, collectionId: link.collection_id })),
        notes: ((notes.data ?? []) as Array<{ repo_id: string; body: string }>).map((note) => ({
          repoId: note.repo_id,
          body: note.body,
        })),
      };
    },

    async readCredential(userId: string, connectionId: string): Promise<string | null> {
      const { data, error } = await admin
        .from('ai_provider_connections')
        .select('credential_ciphertext, credential_nonce, credential_version')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error('generation_connection_read_failed');
      if (!data) return null;
      const version = data.credential_version;
      return decryptCredential(
        ring,
        {
          ciphertext: data.credential_ciphertext,
          nonce: data.credential_nonce,
          version,
        },
        buildCredentialAad(version, userId, connectionId),
      );
    },

    callProvider: (target: Parameters<typeof generateOrganizationDraft>[1]) =>
      generateOrganizationDraft(providerConfig, target),

    async replaceDraft(input: {
      userId: string;
      repoIds: string[];
      connectionId: string;
      adapter: string;
      model: string;
      suggestions: AiOrganizationDraftView['suggestions'];
    }): Promise<AiOrganizationDraftView> {
      const { data, error } = await admin.rpc('replace_ai_organization_draft', {
        p_user_id: input.userId,
        p_source_repo_ids: input.repoIds,
        p_suggestion_version: input.suggestions.version,
        p_suggestions: input.suggestions as unknown as Json,
        p_generation_connection_id: input.connectionId,
        p_generation_adapter: input.adapter,
        p_generation_model: input.model,
      });
      if (error || !data) throw new Error('draft_write_failed');
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('draft_write_failed');
      return mapDraft(row as unknown as Record<string, unknown>);
    },

    async getDraft(userId: string): Promise<AiOrganizationDraftView | null> {
      const { data, error } = await admin
        .from('ai_organization_drafts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error('draft_read_failed');
      return data ? mapDraft(data as unknown as Record<string, unknown>) : null;
    },

    async updateDraftReview(input: {
      userId: string;
      expectedRevision: number;
      suggestions: AiOrganizationDraftView['suggestions'];
    }): Promise<AiOrganizationDraftView | null> {
      const { data, error } = await admin.rpc('update_ai_organization_draft_review', {
        p_user_id: input.userId,
        p_expected_revision: input.expectedRevision,
        p_suggestions: input.suggestions as unknown as Json,
      });
      if (error) throw new Error('draft_review_write_failed');
      const row = Array.isArray(data) ? data[0] : data;
      return row ? mapDraft(row as unknown as Record<string, unknown>) : null;
    },

    async confirmDraftTransaction(input: {
      userId: string;
      draftId: string;
      expectedRevision: number;
      suggestions: AiOrganizationDraftView['suggestions'];
    }): Promise<string> {
      const { data, error } = await admin.rpc('confirm_ai_organization_draft', {
        p_user_id: input.userId,
        p_draft_id: input.draftId,
        p_expected_revision: input.expectedRevision,
        p_suggestions: input.suggestions as unknown as Json,
      });
      if (error || typeof data !== 'string') {
        const message = error?.message ?? 'draft_confirmation_failed';
        for (const code of [
          'draft_confirmation_conflict',
          'draft_repository_invalid',
          'draft_target_invalid',
          'draft_confirmation_invalid',
        ]) {
          if (message.includes(code)) throw new Error(code);
        }
        throw new Error('draft_confirmation_failed');
      }
      return data;
    },

    async discardDraft(userId: string): Promise<boolean> {
      const { data, error } = await admin
        .from('ai_organization_drafts')
        .delete()
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();
      if (error) throw new Error('draft_discard_failed');
      return Boolean(data);
    },
  };
}

function configurationError(): Response {
  return new Response(JSON.stringify({ error: 'server_configuration_missing' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return configurationError();
  const ring = await getKeyRing().catch(() => null);
  if (!ring) return configurationError();
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createAiOrganizationService(
    createDataDependencies(admin, ring, {
      fetch,
      resolve: resolveDns,
      allowlist: parseAllowlist(Deno.env.get('AI_CUSTOM_ENDPOINT_ALLOWLIST')),
    }),
  );
  return createManageAiOrganizationHandler({
    authenticate: async (jwt) => {
      const { data, error } = await admin.auth.getUser(jwt);
      return error ? null : (data.user?.id ?? null);
    },
    ...service,
  })(request);
});
