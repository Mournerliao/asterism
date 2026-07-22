import type { ValidatedOrganizationDraft } from '../../../packages/core/src/ai/generation-registry.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export interface AiOrganizationDraftView {
  id: string;
  sourceRepoIds: string[];
  suggestions: ValidatedOrganizationDraft;
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
