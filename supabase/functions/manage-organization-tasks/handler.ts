import type {
  OrganizationOpportunityView,
  OrganizationTaskView,
} from '../../../packages/core/src/ai/organization-task.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RevisionInput {
  taskId: string;
  expectedRevision: number;
}

export interface OrganizationTaskHttpDependencies {
  authenticate: (jwt: string) => Promise<string | null>;
  createTask: (
    userId: string,
    input: { goal: string; contextRepositoryIds: string[] },
  ) => Promise<OrganizationTaskView>;
  listTasks: (userId: string) => Promise<OrganizationTaskView[]>;
  getTask: (userId: string, taskId: string) => Promise<OrganizationTaskView>;
  updateGoal: (
    userId: string,
    input: RevisionInput & { goal: string; message: string | null },
  ) => Promise<OrganizationTaskView>;
  discover: (
    userId: string,
    input: RevisionInput & {
      goalEmbedding?: { model: string; vector: readonly number[] } | null;
    },
  ) => Promise<OrganizationTaskView>;
  excludeCandidate: (
    userId: string,
    input: RevisionInput & { repositoryId: string; excluded: boolean },
  ) => Promise<OrganizationTaskView>;
  approveGeneration: (userId: string, input: RevisionInput) => Promise<OrganizationTaskView>;
  endTask: (userId: string, input: RevisionInput) => Promise<OrganizationTaskView>;
  listOpportunities: (userId: string) => Promise<OrganizationOpportunityView[]>;
  acceptOpportunity: (
    userId: string,
    opportunityId: string,
    goal: string,
  ) => Promise<OrganizationTaskView>;
  ignoreOpportunity: (userId: string, opportunityId: string) => Promise<boolean>;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function readRevisionInput(body: Record<string, unknown>): RevisionInput | null {
  return isId(body.taskId) &&
    Number.isInteger(body.expectedRevision) &&
    (body.expectedRevision as number) >= 1
    ? { taskId: body.taskId, expectedRevision: body.expectedRevision as number }
    : null;
}

function errorStatus(code: string): number {
  if (
    code === 'organization_task_conflict' ||
    code === 'organization_candidate_authorization_changed'
  ) {
    return 409;
  }
  if (code === 'organization_task_not_found' || code === 'organization_opportunity_not_found') {
    return 404;
  }
  if (
    code.endsWith('_invalid') ||
    code.endsWith('_required') ||
    code === 'organization_task_ended' ||
    code === 'organization_task_invalid_transition'
  ) {
    return 400;
  }
  return 500;
}

export function createManageOrganizationTasksHandler(
  dependencies: OrganizationTaskHttpDependencies,
) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json({ error: 'authentication_required' }, 401);
    const userId = await dependencies.authenticate(jwt).catch(() => null);
    if (!userId) return json({ error: 'authentication_required' }, 401);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.action !== 'string') {
      return json({ error: 'invalid_request' }, 400);
    }

    try {
      if (body.action === 'list') return json({ tasks: await dependencies.listTasks(userId) });
      if (body.action === 'list-opportunities') {
        return json({ opportunities: await dependencies.listOpportunities(userId) });
      }
      if (body.action === 'read' && isId(body.taskId)) {
        return json({ task: await dependencies.getTask(userId, body.taskId) });
      }
      if (body.action === 'create' && isText(body.goal, 4_000)) {
        const contextRepositoryIds =
          Array.isArray(body.contextRepositoryIds) &&
          body.contextRepositoryIds.length <= 1_000 &&
          body.contextRepositoryIds.every(isId) &&
          new Set(body.contextRepositoryIds).size === body.contextRepositoryIds.length
            ? (body.contextRepositoryIds as string[])
            : [];
        return json({
          task: await dependencies.createTask(userId, {
            goal: body.goal.trim(),
            contextRepositoryIds,
          }),
        });
      }
      if (
        body.action === 'accept-opportunity' &&
        isId(body.opportunityId) &&
        isText(body.goal, 4_000)
      ) {
        return json({
          task: await dependencies.acceptOpportunity(userId, body.opportunityId, body.goal.trim()),
        });
      }
      if (body.action === 'ignore-opportunity' && isId(body.opportunityId)) {
        return json({
          ignored: await dependencies.ignoreOpportunity(userId, body.opportunityId),
        });
      }
      const revision = readRevisionInput(body);
      if (revision && body.action === 'update-goal' && isText(body.goal, 4_000)) {
        const message =
          body.message === undefined || body.message === null
            ? null
            : isText(body.message, 4_000)
              ? body.message.trim()
              : undefined;
        if (message === undefined) return json({ error: 'invalid_request' }, 400);
        return json({
          task: await dependencies.updateGoal(userId, {
            ...revision,
            goal: body.goal.trim(),
            message,
          }),
        });
      }
      if (revision && body.action === 'discover') {
        const goalEmbedding =
          body.goalEmbedding === undefined || body.goalEmbedding === null
            ? null
            : typeof body.goalEmbedding === 'object' &&
                typeof (body.goalEmbedding as Record<string, unknown>).model === 'string' &&
                Array.isArray((body.goalEmbedding as Record<string, unknown>).vector) &&
                ((body.goalEmbedding as Record<string, unknown>).vector as unknown[]).length ===
                  384 &&
                ((body.goalEmbedding as Record<string, unknown>).vector as unknown[]).every(
                  (value) => typeof value === 'number' && Number.isFinite(value),
                )
              ? {
                  model: (body.goalEmbedding as { model: string }).model,
                  vector: (body.goalEmbedding as { vector: number[] }).vector,
                }
              : undefined;
        if (goalEmbedding === undefined) return json({ error: 'invalid_request' }, 400);
        return json({ task: await dependencies.discover(userId, { ...revision, goalEmbedding }) });
      }
      if (
        revision &&
        body.action === 'exclude' &&
        isId(body.repositoryId) &&
        typeof body.excluded === 'boolean'
      ) {
        return json({
          task: await dependencies.excludeCandidate(userId, {
            ...revision,
            repositoryId: body.repositoryId,
            excluded: body.excluded,
          }),
        });
      }
      if (revision && body.action === 'approve-generation') {
        return json({ task: await dependencies.approveGeneration(userId, revision) });
      }
      if (revision && body.action === 'end') {
        return json({ task: await dependencies.endTask(userId, revision) });
      }
      return json({ error: 'invalid_request' }, 400);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'organization_task_failed';
      return json({ error: code }, errorStatus(code));
    }
  };
}
