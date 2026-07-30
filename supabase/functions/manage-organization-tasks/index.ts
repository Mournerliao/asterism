import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { GenerationAdapterId } from '../../../packages/core/src/ai/generation-registry.ts';
import type {
  OrganizationPageResult,
  OrganizationPlanDocument,
} from '../../../packages/core/src/ai/organization-plan.ts';
import type {
  OrganizationCandidateReason,
  OrganizationCandidateSnapshot,
  OrganizationGenerationManifest,
  OrganizationGenerationRunPage,
  OrganizationGenerationRunView,
  OrganizationOpportunityView,
  OrganizationPlanSummary,
  OrganizationTaskMessage,
  OrganizationTaskStatus,
  OrganizationTaskView,
} from '../../../packages/core/src/ai/organization-task.ts';
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
  callOrganizationGeneration,
  type ProviderCallConfig,
} from '../manage-ai-connections/provider-call.ts';
import { createManageOrganizationTasksHandler } from './handler.ts';
import { loadAllPages } from './pagination.ts';
import {
  createOrganizationTaskService,
  type GenerationClaimOutcome,
  type OrganizationTaskServiceDependencies,
} from './service.ts';

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

  let generationRun: OrganizationGenerationRunView | null = null;
  if (approval) {
    const approvalId = String(approval.id);
    const [pageRunRows, callRows] = await Promise.all([
      loadAllPages<Record<string, unknown>>(async (from, to) => {
        const result = await admin
          .from('organization_generation_page_runs')
          .select('page_key, page_index, status, attempt_count, error_code')
          .eq('approval_id', approvalId)
          .eq('user_id', userId)
          .order('page_index')
          .range(from, to);
        return result as unknown as { data: Record<string, unknown>[] | null; error: unknown };
      }, 'organization_task_read_failed'),
      loadAllPages<Record<string, unknown>>(async (from, to) => {
        const result = await admin
          .from('organization_generation_calls')
          .select('usage')
          .eq('approval_id', approvalId)
          .eq('user_id', userId)
          .order('started_at')
          .order('id')
          .range(from, to);
        return result as unknown as { data: Record<string, unknown>[] | null; error: unknown };
      }, 'organization_task_read_failed'),
    ]);
    if (pageRunRows.length > 0) {
      const pages: OrganizationGenerationRunPage[] = pageRunRows.map((pageRow) => ({
        key: String(pageRow.page_key),
        index: Number(pageRow.page_index),
        status: pageRow.status as OrganizationGenerationRunPage['status'],
        attemptCount: Number(pageRow.attempt_count),
        errorCode: typeof pageRow.error_code === 'string' ? pageRow.error_code : null,
      }));
      const tokensUsed = callRows.reduce((total, callRow) => {
        const usage = callRow.usage as Record<string, unknown> | null;
        const value = usage && typeof usage.totalTokens === 'number' ? usage.totalTokens : 0;
        return total + value;
      }, 0);
      const maxInitialCalls = Number(approval.max_initial_calls);
      const maxRetryCalls = Number(approval.max_retry_calls);
      generationRun = {
        approvalTaskRevision: Number(approval.task_revision),
        pages,
        callsUsed: callRows.length,
        maxTotalCalls: Number(approval.max_total_calls),
        tokensUsed,
        estimatedTokenCeiling: Number(approval.estimated_token_ceiling),
        maxAttemptsPerPage: 1 + Math.floor(maxRetryCalls / Math.max(maxInitialCalls, 1)),
      };
    }
  }

  const planRows = await loadAllPages<Record<string, unknown>>(async (from, to) => {
    const result = await admin
      .from('organization_plans')
      .select(
        'revision, action_count, conflict_count, uncertainty_count, precondition_fingerprint, fingerprint, created_at',
      )
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('revision', { ascending: false })
      .range(from, to);
    return result as unknown as { data: Record<string, unknown>[] | null; error: unknown };
  }, 'organization_task_read_failed');
  const plans: OrganizationPlanSummary[] = planRows.map((planRow) => ({
    revision: Number(planRow.revision),
    actionCount: Number(planRow.action_count),
    conflictCount: Number(planRow.conflict_count),
    uncertaintyCount: Number(planRow.uncertainty_count),
    preconditionFingerprint: String(planRow.precondition_fingerprint),
    fingerprint: String(planRow.fingerprint),
    createdAt: String(planRow.created_at),
  }));

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
    generationRun,
    attentionCode: typeof row.attention_code === 'string' ? row.attention_code : null,
    plans,
    messages,
    endedAt: typeof row.ended_at === 'string' ? row.ended_at : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function loadTagCollectionCatalog(
  admin: AdminClient,
  userId: string,
): Promise<{
  tags: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
}> {
  const [tags, collections] = await Promise.all([
    loadAllPages<{ id: string; name: string }>(async (from, to) => {
      const result = await admin
        .from('tags')
        .select('id, name')
        .eq('user_id', userId)
        .order('id')
        .range(from, to);
      return result as unknown as {
        data: Array<{ id: string; name: string }> | null;
        error: unknown;
      };
    }, 'organization_task_read_failed'),
    loadAllPages<{ id: string; name: string }>(async (from, to) => {
      const result = await admin
        .from('collections')
        .select('id, name')
        .eq('user_id', userId)
        .order('id')
        .range(from, to);
      return result as unknown as {
        data: Array<{ id: string; name: string }> | null;
        error: unknown;
      };
    }, 'organization_task_read_failed'),
  ]);
  return { tags, collections };
}

function createDataDependencies(
  admin: AdminClient,
  ring: KeyRing,
  providerConfig: ProviderCallConfig,
): OrganizationTaskServiceDependencies {
  const deps: OrganizationTaskServiceDependencies = {
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

    async startGenerationCas(userId, input) {
      const { data, error } = await admin.rpc('start_organization_generation', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
      });
      if (error) throw new Error('organization_task_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async pauseGenerationCas(userId, input) {
      const { data, error } = await admin.rpc('pause_organization_generation', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
      });
      if (error) throw new Error('organization_task_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async resumeGenerationCas(userId, input) {
      const { data, error } = await admin.rpc('resume_organization_generation', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
      });
      if (error) throw new Error('organization_task_write_failed');
      return data ? loadTask(admin, userId, input.taskId) : null;
    },

    async retryGenerationRpc(userId, input) {
      const { data, error } = await admin.rpc('retry_organization_generation', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
      });
      if (error) throw new Error('organization_task_write_failed');
      const outcome = data as unknown as { outcome?: unknown } | null;
      return { outcome: typeof outcome?.outcome === 'string' ? outcome.outcome : 'conflict' };
    },

    async flagGenerationAttention(userId, input) {
      const { data, error } = await admin.rpc('flag_organization_generation_attention', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
        p_code: input.code,
      });
      if (error) throw new Error('organization_task_write_failed');
      return Boolean(data);
    },

    async claimGenerationPage(userId, input) {
      const { data, error } = await admin.rpc('claim_organization_generation_page', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_lease_seconds: input.leaseSeconds,
      });
      if (error) throw new Error('organization_generation_claim_failed');
      return data as unknown as GenerationClaimOutcome;
    },

    async completeGenerationPage(userId, input) {
      const { data, error } = await admin.rpc('complete_organization_generation_page', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_call_id: input.callId,
        p_lease_id: input.leaseId,
        p_status: input.status,
        p_request_hash: input.requestHash,
        p_truncation: input.truncation as unknown as Json,
        p_usage: input.usage as unknown as Json,
        p_error_code: input.errorCode,
        p_result: input.result as unknown as Json,
      });
      if (error) throw new Error('organization_generation_complete_failed');
      const outcome = data as unknown as { outcome?: unknown } | null;
      return { outcome: typeof outcome?.outcome === 'string' ? outcome.outcome : 'stale' };
    },

    async loadGenerationPageContext(userId, input) {
      const [library, catalog, snapshot] = await Promise.all([
        deps.loadAuthorizedLibrary(userId),
        loadTagCollectionCatalog(admin, userId),
        admin
          .from('organization_candidate_snapshots')
          .select('id')
          .eq('task_id', input.taskId)
          .eq('user_id', userId)
          .eq('revision', input.snapshotRevision)
          .maybeSingle(),
      ]);
      if (snapshot.error || !snapshot.data) throw new Error('organization_task_read_failed');
      const snapshotId = String((snapshot.data as Record<string, unknown>).id);
      const items = await loadAllPages<{ repo_id: string; content_fingerprint: string }>(
        async (from, to) => {
          const result = await admin
            .from('organization_candidate_items')
            .select('repo_id, content_fingerprint')
            .eq('snapshot_id', snapshotId)
            .eq('user_id', userId)
            .in('repo_id', input.repoIds)
            .order('repo_id')
            .range(from, to);
          return result as unknown as {
            data: Array<{ repo_id: string; content_fingerprint: string }> | null;
            error: unknown;
          };
        },
        'organization_task_read_failed',
      );
      const contentFingerprints: Record<string, string> = {};
      for (const item of items) {
        contentFingerprints[item.repo_id] = item.content_fingerprint;
      }
      const byId = new Map(library.map((repository) => [repository.id, repository] as const));
      const repositories = input.repoIds.flatMap((id) => {
        const repository = byId.get(id);
        return repository ? [repository] : [];
      });
      return {
        repositories,
        contentFingerprints,
        tags: catalog.tags,
        collections: catalog.collections,
      };
    },

    async callGenerationPage(userId, input) {
      const { data, error } = await admin
        .from('ai_provider_connections')
        .select('base_url, credential_ciphertext, credential_nonce, credential_version')
        .eq('id', input.connectionId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) throw new Error('generation_connection_read_failed');
      const row = data as Record<string, unknown>;
      const version = Number(row.credential_version);
      const apiKey = await decryptCredential(
        ring,
        {
          ciphertext: String(row.credential_ciphertext),
          nonce: String(row.credential_nonce),
          version,
        },
        buildCredentialAad(version, userId, input.connectionId),
      );
      return callOrganizationGeneration(providerConfig, {
        adapter: input.adapter as GenerationAdapterId,
        baseUrl: typeof row.base_url === 'string' ? row.base_url : null,
        credential: { apiKey },
        model: input.model,
        input: input.input,
      });
    },

    async loadPlanMergeContext(userId, input) {
      const approvalResult = await admin
        .from('organization_generation_approvals')
        .select('id, snapshot_revision, manifest_fingerprint')
        .eq('task_id', input.taskId)
        .eq('user_id', userId)
        .order('task_revision', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (approvalResult.error || !approvalResult.data) {
        throw new Error('organization_task_read_failed');
      }
      const approval = approvalResult.data as Record<string, unknown>;
      const approvalId = String(approval.id);
      const snapshotRevision = Number(approval.snapshot_revision);
      const [snapshotResult, catalog, pageRows] = await Promise.all([
        admin
          .from('organization_candidate_snapshots')
          .select('id, fingerprint')
          .eq('task_id', input.taskId)
          .eq('user_id', userId)
          .eq('revision', snapshotRevision)
          .maybeSingle(),
        loadTagCollectionCatalog(admin, userId),
        loadAllPages<{ page_index: number; result: unknown }>(async (from, to) => {
          const result = await admin
            .from('organization_generation_page_runs')
            .select('page_index, result')
            .eq('approval_id', approvalId)
            .eq('user_id', userId)
            .eq('status', 'succeeded')
            .order('page_index')
            .range(from, to);
          return result as unknown as {
            data: Array<{ page_index: number; result: unknown }> | null;
            error: unknown;
          };
        }, 'organization_task_read_failed'),
      ]);
      if (snapshotResult.error || !snapshotResult.data) {
        throw new Error('organization_task_read_failed');
      }
      const snapshotRow = snapshotResult.data as Record<string, unknown>;
      const snapshotId = String(snapshotRow.id);
      const items = await loadAllPages<{ repo_id: string; content_fingerprint: string }>(
        async (from, to) => {
          const result = await admin
            .from('organization_candidate_items')
            .select('repo_id, content_fingerprint')
            .eq('snapshot_id', snapshotId)
            .eq('user_id', userId)
            .eq('included', true)
            .order('repo_id')
            .range(from, to);
          return result as unknown as {
            data: Array<{ repo_id: string; content_fingerprint: string }> | null;
            error: unknown;
          };
        },
        'organization_task_read_failed',
      );
      const planRows = await loadAllPages<{ revision: number }>(async (from, to) => {
        const result = await admin
          .from('organization_plans')
          .select('revision')
          .eq('task_id', input.taskId)
          .eq('user_id', userId)
          .order('revision', { ascending: false })
          .range(from, to);
        return result as unknown as { data: Array<{ revision: number }> | null; error: unknown };
      }, 'organization_task_read_failed');
      const latestRevision = planRows[0]?.revision ?? 0;
      return {
        nextPlanRevision: latestRevision + 1,
        pages: pageRows.map((page) => ({
          pageIndex: Number(page.page_index),
          result: page.result as OrganizationPageResult,
        })),
        existingTags: catalog.tags,
        existingCollections: catalog.collections,
        preconditions: {
          snapshotFingerprint: String(snapshotRow.fingerprint),
          manifestFingerprint: String(approval.manifest_fingerprint),
          candidateFingerprints: items.map((item) => ({
            repositoryId: item.repo_id,
            contentFingerprint: item.content_fingerprint,
          })),
        },
      };
    },

    async savePlan(userId, input) {
      const { data, error } = await admin.rpc('save_organization_plan', {
        p_user_id: userId,
        p_task_id: input.taskId,
        p_expected_revision: input.expectedRevision,
        p_plan: input.plan as unknown as Json,
      });
      if (error) throw new Error('organization_plan_write_failed');
      const outcome = data as unknown as { outcome?: unknown; planRevision?: unknown } | null;
      return {
        outcome: typeof outcome?.outcome === 'string' ? outcome.outcome : 'conflict',
        planRevision: typeof outcome?.planRevision === 'number' ? outcome.planRevision : undefined,
      };
    },

    async readPlan(userId, input) {
      const base = admin
        .from('organization_plans')
        .select('plan')
        .eq('task_id', input.taskId)
        .eq('user_id', userId);
      const { data, error } =
        input.revision === null
          ? await base.order('revision', { ascending: false }).limit(1).maybeSingle()
          : await base.eq('revision', input.revision).maybeSingle();
      if (error) throw new Error('organization_task_read_failed');
      if (!data) return null;
      return (data as Record<string, unknown>).plan as unknown as OrganizationPlanDocument;
    },
  };

  return deps;
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
  const service = createOrganizationTaskService(
    createDataDependencies(admin, ring, {
      fetch,
      resolve: resolveDns,
      allowlist: parseAllowlist(Deno.env.get('AI_CUSTOM_ENDPOINT_ALLOWLIST')),
    }),
  );
  return createManageOrganizationTasksHandler({
    authenticate: async (jwt) => {
      const { data, error } = await admin.auth.getUser(jwt);
      return error ? null : (data.user?.id ?? null);
    },
    ...service,
  })(request);
});
