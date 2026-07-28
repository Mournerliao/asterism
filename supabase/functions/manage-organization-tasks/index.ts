import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type {
  OrganizationCandidateReason,
  OrganizationCandidateSnapshot,
  OrganizationGenerationManifest,
  OrganizationOpportunityView,
  OrganizationTaskMessage,
  OrganizationTaskStatus,
  OrganizationTaskView,
} from '../../../packages/core/src/ai/organization-task.ts';
import type { Database, Json } from '../../../packages/db/src/database.types.ts';
import { createManageOrganizationTasksHandler } from './handler.ts';
import { loadAllPages } from './pagination.ts';
import {
  createOrganizationTaskService,
  type OrganizationTaskServiceDependencies,
} from './service.ts';

type AdminClient = ReturnType<typeof createClient<Database>>;

function parseVector(value: unknown): number[] | null {
  if (typeof value !== 'string' || !value.startsWith('[') || !value.endsWith(']')) return null;
  const vector = value.slice(1, -1).split(',').map(Number);
  return vector.length === 384 && vector.every(Number.isFinite) ? vector : null;
}

function embeddingContentHash(input: {
  fullName: string;
  description: string | null;
  topics: string[];
}): string {
  const segments = [input.fullName.trim()];
  const description = input.description?.trim();
  if (description) segments.push(description);
  const topics = input.topics.map((topic) => topic.trim()).filter(Boolean);
  if (topics.length > 0) segments.push(topics.join(' '));
  const text = segments.join('\n');
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

async function loadTask(
  admin: AdminClient,
  userId: string,
  taskId: string,
): Promise<OrganizationTaskView | null> {
  const { data, error } = await admin
    .from('organization_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('organization_task_read_failed');
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const snapshotRevision =
    typeof row.current_snapshot_revision === 'number' ? row.current_snapshot_revision : null;
  const manifestFingerprint =
    typeof row.current_manifest_fingerprint === 'string' ? row.current_manifest_fingerprint : null;
  const [snapshotResult, manifestResult, messagesResult, approvalResult] = await Promise.all([
    snapshotRevision
      ? admin
          .from('organization_candidate_snapshots')
          .select('*')
          .eq('task_id', taskId)
          .eq('user_id', userId)
          .eq('revision', snapshotRevision)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    manifestFingerprint
      ? admin
          .from('organization_generation_manifests')
          .select('*')
          .eq('task_id', taskId)
          .eq('user_id', userId)
          .eq('fingerprint', manifestFingerprint)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    loadAllPages<Record<string, unknown>>(async (from, to) => {
      const result = await admin
        .from('organization_task_messages')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .order('created_at')
        .order('id')
        .range(from, to);
      return result as unknown as {
        data: Record<string, unknown>[] | null;
        error: unknown;
      };
    }, 'organization_task_read_failed'),
    admin
      .from('organization_generation_approvals')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('task_revision', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  for (const result of [snapshotResult, manifestResult, approvalResult]) {
    if (result.error) throw new Error('organization_task_read_failed');
  }

  let snapshot: OrganizationCandidateSnapshot | null = null;
  if (snapshotResult.data) {
    const snapshotRow = snapshotResult.data as Record<string, unknown>;
    const items = await loadAllPages<Record<string, unknown>>(async (from, to) => {
      const result = await admin
        .from('organization_candidate_items')
        .select('repo_id, content_fingerprint, included, reasons')
        .eq('snapshot_id', String(snapshotRow.id))
        .eq('user_id', userId)
        .order('repo_id')
        .range(from, to);
      return result as unknown as {
        data: Record<string, unknown>[] | null;
        error: unknown;
      };
    }, 'organization_task_read_failed');
    snapshot = {
      taskId,
      revision: Number(snapshotRow.revision),
      discoveryVersion: String(snapshotRow.discovery_version),
      libraryCount: Number(snapshotRow.library_count),
      candidateCount: Number(snapshotRow.candidate_count),
      fingerprint: String(snapshotRow.fingerprint),
      items: items.map((item) => ({
        repositoryId: String(item.repo_id),
        contentFingerprint: String(item.content_fingerprint),
        included: Boolean(item.included),
        reasons: item.reasons as OrganizationCandidateReason[],
      })),
    };
  }

  let manifest: OrganizationGenerationManifest | null = null;
  if (manifestResult.data) {
    const manifestRow = manifestResult.data as Record<string, unknown>;
    const pages = await loadAllPages<Record<string, unknown>>(async (from, to) => {
      const result = await admin
        .from('organization_generation_manifest_pages')
        .select('page_key, page_index, repo_ids')
        .eq('manifest_id', String(manifestRow.id))
        .eq('user_id', userId)
        .order('page_index')
        .range(from, to);
      return result as unknown as {
        data: Record<string, unknown>[] | null;
        error: unknown;
      };
    }, 'organization_task_read_failed');
    manifest = {
      taskId,
      snapshotRevision: Number(manifestRow.snapshot_revision),
      candidateCount: Number(manifestRow.candidate_count),
      pageCount: Number(manifestRow.page_count),
      maxInitialCalls: Number(manifestRow.max_initial_calls),
      maxRetryCalls: Number(manifestRow.max_retry_calls),
      maxTotalCalls: Number(manifestRow.max_total_calls),
      estimatedTokenCeiling: Number(manifestRow.estimated_token_ceiling),
      monetaryCost: { kind: 'unknown' },
      fields: manifestRow.fields as OrganizationGenerationManifest['fields'],
      truncation: {
        descriptionCodePoints: Number(manifestRow.description_code_point_limit),
        noteCodePoints: Number(manifestRow.note_code_point_limit),
      },
      connection: {
        id: String(manifestRow.connection_id),
        adapter: String(manifestRow.adapter),
        model: String(manifestRow.model),
      },
      pages: pages.map((page) => ({
        key: String(page.page_key),
        index: Number(page.page_index),
        repositoryIds: (page.repo_ids as string[]) ?? [],
      })),
      fingerprint: String(manifestRow.fingerprint),
    };
  }

  const messages: OrganizationTaskMessage[] = messagesResult.map((message) => ({
    id: String(message.id),
    role: message.role as OrganizationTaskMessage['role'],
    text: String(message.text),
    checkpointType: (message.checkpoint_type as OrganizationTaskMessage['checkpointType']) ?? null,
    checkpointRevision:
      typeof message.checkpoint_revision === 'number' ? message.checkpoint_revision : null,
    createdAt: String(message.created_at),
  }));
  const approval = approvalResult.data as Record<string, unknown> | null;
  return {
    id: String(row.id),
    origin: row.origin as OrganizationTaskView['origin'],
    status: row.status as OrganizationTaskStatus,
    goal: String(row.goal),
    suggestedGoal: typeof row.suggested_goal === 'string' ? row.suggested_goal : null,
    contextRepositoryIds: (row.context_repo_ids as string[]) ?? [],
    revision: Number(row.revision),
    snapshot,
    manifest,
    generationApproval: approval
      ? {
          revision: Number(approval.task_revision),
          manifestFingerprint: String(approval.manifest_fingerprint),
          approvedAt: String(approval.approved_at),
        }
      : null,
    messages,
    endedAt: typeof row.ended_at === 'string' ? row.ended_at : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function createDataDependencies(admin: AdminClient): OrganizationTaskServiceDependencies {
  return {
    async createTask(userId, input) {
      if (input.origin !== 'direct_goal') {
        throw new Error('organization_task_origin_invalid');
      }
      const { data: taskId, error } = await admin.rpc('create_organization_task', {
        p_user_id: userId,
        p_goal: input.goal,
        p_context_repo_ids: input.contextRepositoryIds,
      });
      if (error || typeof taskId !== 'string') {
        throw new Error('organization_task_write_failed');
      }
      return (await loadTask(admin, userId, taskId)) as OrganizationTaskView;
    },

    async listTasks(userId) {
      const rows = await loadAllPages<{ id: string }>(async (from, to) => {
        const result = await admin
          .from('organization_tasks')
          .select('id')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .order('id')
          .range(from, to);
        return result as unknown as {
          data: Array<{ id: string }> | null;
          error: unknown;
        };
      }, 'organization_task_read_failed');
      const tasks = await Promise.all(rows.map((item) => loadTask(admin, userId, item.id)));
      return tasks.filter((item): item is OrganizationTaskView => item !== null);
    },

    getTask: (userId, taskId) => loadTask(admin, userId, taskId),

    async updateGoalCas(userId, input) {
      const { data, error } = await admin.rpc('update_organization_task_goal', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
        p_goal: input.goal,
        p_message: input.message,
      });
      if (error) throw new Error('organization_task_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async loadAuthorizedLibrary(userId) {
      const [stars, tags, collections, notes, embeddings] = await Promise.all([
        loadAllPages<Record<string, unknown>>(async (from, to) => {
          const result = await admin
            .from('user_stars')
            .select(
              'repo_id, starred_at, repos!inner(id, full_name, description, language, topics, archived)',
            )
            .eq('user_id', userId)
            .order('repo_id')
            .range(from, to);
          return result as unknown as {
            data: Record<string, unknown>[] | null;
            error: unknown;
          };
        }),
        loadAllPages<{
          repo_id: string;
          tag_id: string;
          tags: { name: string };
        }>(async (from, to) => {
          const result = await admin
            .from('repo_tags')
            .select('repo_id, tag_id, tags!inner(name)')
            .eq('user_id', userId)
            .order('repo_id')
            .order('tag_id')
            .range(from, to);
          return result as unknown as {
            data: Array<{ repo_id: string; tag_id: string; tags: { name: string } }> | null;
            error: unknown;
          };
        }),
        loadAllPages<{
          repo_id: string;
          collection_id: string;
          collections: { name: string };
        }>(async (from, to) => {
          const result = await admin
            .from('collection_repos')
            .select('repo_id, collection_id, collections!inner(name)')
            .eq('user_id', userId)
            .order('repo_id')
            .order('collection_id')
            .range(from, to);
          return result as unknown as {
            data: Array<{
              repo_id: string;
              collection_id: string;
              collections: { name: string };
            }> | null;
            error: unknown;
          };
        }),
        loadAllPages<{ repo_id: string; body: string | null }>(async (from, to) => {
          const result = await admin
            .from('notes')
            .select('repo_id, body')
            .eq('user_id', userId)
            .order('repo_id')
            .range(from, to);
          return result as unknown as {
            data: Array<{ repo_id: string; body: string | null }> | null;
            error: unknown;
          };
        }),
        loadAllPages<{
          repo_id: string;
          embedding: string;
          embedding_model: string;
          content_hash: string;
        }>(async (from, to) => {
          const result = await admin
            .from('user_repo_embeddings')
            .select('repo_id, embedding, embedding_model, content_hash')
            .eq('user_id', userId)
            .order('repo_id')
            .range(from, to);
          return result as unknown as {
            data: Array<{
              repo_id: string;
              embedding: string;
              embedding_model: string;
              content_hash: string;
            }> | null;
            error: unknown;
          };
        }),
      ]);
      const tagValues = new Map<string, Array<{ id: string; name: string }>>();
      for (const link of tags) {
        tagValues.set(link.repo_id, [
          ...(tagValues.get(link.repo_id) ?? []),
          { id: link.tag_id, name: link.tags.name },
        ]);
      }
      const collectionValues = new Map<string, Array<{ id: string; name: string }>>();
      for (const link of collections) {
        collectionValues.set(link.repo_id, [
          ...(collectionValues.get(link.repo_id) ?? []),
          { id: link.collection_id, name: link.collections.name },
        ]);
      }
      const noteBodies = new Map(notes.map((note) => [note.repo_id, note.body]));
      const derived = new Map(
        embeddings.map((embedding) => [embedding.repo_id, embedding] as const),
      );
      return stars.map((star) => {
        const repo = star.repos as Record<string, unknown>;
        const id = String(repo.id);
        const description = typeof repo.description === 'string' ? repo.description : null;
        const topics = Array.isArray(repo.topics) ? repo.topics.map(String) : [];
        const embedding = derived.get(id);
        const vector = parseVector(embedding?.embedding);
        const freshContentHash = embeddingContentHash({
          fullName: String(repo.full_name),
          description,
          topics,
        });
        return {
          id,
          fullName: String(repo.full_name),
          description,
          language: typeof repo.language === 'string' ? repo.language : null,
          topics,
          archived: Boolean(repo.archived),
          starredAt: typeof star.starred_at === 'string' ? star.starred_at : null,
          tags: [...(tagValues.get(id) ?? [])].sort((left, right) =>
            left.id.localeCompare(right.id),
          ),
          collections: [...(collectionValues.get(id) ?? [])].sort((left, right) =>
            left.id.localeCompare(right.id),
          ),
          note: noteBodies.get(id) ?? null,
          derivedEmbedding:
            embedding && vector && embedding.content_hash === freshContentHash
              ? {
                  model: embedding.embedding_model,
                  contentHash: embedding.content_hash,
                  vector,
                }
              : null,
        };
      });
    },

    async beginDiscoveryCas(userId, input) {
      const { data, error } = await admin
        .from('organization_tasks')
        .update({
          status: 'discovering',
          revision: input.expectedRevision + 1,
        })
        .eq('id', input.taskId)
        .eq('user_id', userId)
        .eq('revision', input.expectedRevision)
        .in('status', ['clarifying', 'awaiting_generation_approval'])
        .select('id')
        .maybeSingle();
      if (error) throw new Error('organization_task_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async loadGenerationDisclosure(userId) {
      const settings = await admin
        .from('user_settings')
        .select('generation_connection_id, generation_model, include_notes_in_ai')
        .eq('user_id', userId)
        .maybeSingle();
      if (settings.error) throw new Error('organization_disclosure_read_failed');
      const row = settings.data as Record<string, unknown> | null;
      if (
        !row ||
        typeof row.generation_connection_id !== 'string' ||
        typeof row.generation_model !== 'string'
      ) {
        throw new Error('generation_connection_required');
      }
      const connection = await admin
        .from('ai_provider_connections')
        .select('id, adapter, status, generation_capability')
        .eq('id', row.generation_connection_id)
        .eq('user_id', userId)
        .maybeSingle();
      if (connection.error || !connection.data) {
        throw new Error('generation_connection_required');
      }
      const connectionRow = connection.data as Record<string, unknown>;
      if (connectionRow.status !== 'valid') throw new Error('generation_connection_invalid');
      return {
        connection: {
          id: String(connectionRow.id),
          adapter: String(connectionRow.adapter),
          model: row.generation_model,
        },
        includeNotes: Boolean(row.include_notes_in_ai),
      };
    },

    async persistDiscoveryCas(userId, input) {
      const { data, error } = await admin.rpc('save_organization_task_checkpoint', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
        p_snapshot: input.snapshot as unknown as Json,
        p_manifest: input.manifest as unknown as Json,
      });
      if (error) throw new Error('organization_checkpoint_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async persistExclusionCas(userId, input) {
      const { data, error } = await admin.rpc('save_organization_task_checkpoint', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
        p_snapshot: input.snapshot as unknown as Json,
        p_manifest: input.manifest as unknown as Json | null,
      });
      if (error) throw new Error('organization_checkpoint_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async persistApprovalCas(userId, input) {
      const { data, error } = await admin.rpc('approve_organization_task_generation', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
        p_manifest_fingerprint: input.manifestFingerprint,
      });
      if (error) throw new Error('organization_approval_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async persistEndCas(userId, input) {
      const { data, error } = await admin.rpc('end_organization_task', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
      });
      if (error) throw new Error('organization_task_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async listOpportunities(userId): Promise<OrganizationOpportunityView[]> {
      const rows = await loadAllPages<Record<string, unknown>>(async (from, to) => {
        const result = await admin
          .from('organization_opportunities')
          .select('id, kind, repository_count, status, created_at')
          .eq('user_id', userId)
          .eq('status', 'available')
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to);
        return result as unknown as {
          data: Record<string, unknown>[] | null;
          error: unknown;
        };
      }, 'organization_opportunity_read_failed');
      return rows.map((row) => ({
        id: String(row.id),
        kind: row.kind as OrganizationOpportunityView['kind'],
        repositoryCount: Number(row.repository_count),
        status: row.status as OrganizationOpportunityView['status'],
        createdAt: String(row.created_at),
      }));
    },

    async acceptOpportunity(userId, opportunityId, goal) {
      const { data: taskId, error } = await admin.rpc('accept_organization_opportunity_with_goal', {
        p_user_id: userId,
        p_opportunity_id: opportunityId,
        p_goal: goal,
      });
      if (error) throw new Error('organization_opportunity_write_failed');
      if (typeof taskId !== 'string') {
        throw new Error('organization_opportunity_not_found');
      }
      const task = await loadTask(admin, userId, taskId);
      if (!task) {
        throw new Error('organization_task_read_failed');
      }
      return task;
    },

    async ignoreOpportunity(userId, opportunityId) {
      const { data, error } = await admin
        .from('organization_opportunities')
        .update({ status: 'ignored' })
        .eq('id', opportunityId)
        .eq('user_id', userId)
        .eq('status', 'available')
        .select('id')
        .maybeSingle();
      if (error) throw new Error('organization_opportunity_write_failed');
      if (!data) throw new Error('organization_opportunity_not_found');
      return true;
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
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createOrganizationTaskService(createDataDependencies(admin));
  return createManageOrganizationTasksHandler({
    authenticate: async (jwt) => {
      const { data, error } = await admin.auth.getUser(jwt);
      return error ? null : (data.user?.id ?? null);
    },
    ...service,
  })(request);
});
