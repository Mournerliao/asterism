const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type AiOrganizationReviewChange =
  | { kind: 'relation'; suggestionId: string; selected: boolean }
  | { kind: 'classification'; suggestionId: string; approved: boolean };

export interface AiOrganizationReviewSuggestions {
  version: 2;
  relationChanges: Array<{
    id: string;
    repoId: string;
    relationType: 'tag' | 'collection';
    action: 'add' | 'remove';
    targetId: string;
    selected: boolean;
  }>;
  newClassifications: Array<{
    id: string;
    relationType: 'tag' | 'collection';
    name: string;
    repoIds: string[];
    approved: boolean;
  }>;
}

export interface AiOrganizationDraftView {
  id: string;
  sourceRepoIds: string[];
  suggestions: AiOrganizationReviewSuggestions;
  generationConnectionId: string;
  generationAdapter: string;
  generationModel: string;
  reviewState: 'review';
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiOrganizationDependencies {
  authenticate: (jwt: string) => Promise<string | null>;
  generateDraft: (userId: string, repoIds: string[]) => Promise<AiOrganizationDraftView>;
  getDraft: (userId: string) => Promise<AiOrganizationDraftView | null>;
  updateReview: (
    userId: string,
    expectedRevision: number,
    change: AiOrganizationReviewChange,
  ) => Promise<{ status: 'updated'; draft: AiOrganizationDraftView } | { status: 'conflict' }>;
  discardDraft: (userId: string) => Promise<boolean>;
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

function readReviewChange(value: unknown): AiOrganizationReviewChange | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const change = value as Record<string, unknown>;
  if (
    change.kind === 'relation' &&
    isId(change.suggestionId) &&
    typeof change.selected === 'boolean' &&
    Object.keys(change).length === 3
  ) {
    return {
      kind: 'relation',
      suggestionId: change.suggestionId,
      selected: change.selected,
    };
  }
  if (
    change.kind === 'classification' &&
    isId(change.suggestionId) &&
    typeof change.approved === 'boolean' &&
    Object.keys(change).length === 3
  ) {
    return {
      kind: 'classification',
      suggestionId: change.suggestionId,
      approved: change.approved,
    };
  }
  return null;
}

export function createManageAiOrganizationHandler(dependencies: AiOrganizationDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json({ error: 'authentication_required' }, 401);
    const userId = await dependencies.authenticate(jwt).catch(() => null);
    if (!userId) return json({ error: 'authentication_required' }, 401);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return json({ error: 'invalid_request' }, 400);

    try {
      if (body.action === 'read') {
        return json({ draft: await dependencies.getDraft(userId) });
      }
      if (body.action === 'discard') {
        return json({ discarded: await dependencies.discardDraft(userId) });
      }
      if (body.action === 'update-review') {
        const change = readReviewChange(body.change);
        if (
          !Number.isInteger(body.expectedRevision) ||
          (body.expectedRevision as number) < 1 ||
          !change
        ) {
          return json({ error: 'invalid_request' }, 400);
        }
        return json(
          await dependencies.updateReview(userId, body.expectedRevision as number, change),
        );
      }
      if (body.action === 'generate') {
        if (!Array.isArray(body.repoIds) || !body.repoIds.every(isId)) {
          return json({ error: 'invalid_request' }, 400);
        }
        const repoIds = body.repoIds as string[];
        if (
          repoIds.length === 0 ||
          repoIds.length > 50 ||
          new Set(repoIds).size !== repoIds.length
        ) {
          return json({ error: 'invalid_repository_scope' }, 400);
        }
        return json({ draft: await dependencies.generateDraft(userId, repoIds) });
      }
      return json({ error: 'invalid_request' }, 400);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'ai_organization_failed';
      const status =
        code.startsWith('invalid_') ||
        code.endsWith('_not_owned') ||
        code.startsWith('generation_connection_')
          ? 400
          : code.startsWith('provider_')
            ? 502
            : 500;
      return json({ error: code }, status);
    }
  };
}
