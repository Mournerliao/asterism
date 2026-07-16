import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ReadmeOutcome =
  | { status: 'success'; html: string; etag: string | null }
  | { status: 'not_found' }
  | { status: 'not_in_library' }
  | { status: 'rate_limited' }
  | { status: 'reconnect_required' }
  | { status: 'retryable_error' };

function json(body: ReadmeOutcome | { error: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRepoSegment(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= 100 && /^[\w.-]+$/.test(value)
  );
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server is missing Supabase service configuration' }, 500);
  }

  const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    return json({ error: 'Missing Authorization bearer token' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  let body: { owner?: unknown; name?: unknown; providerToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!isRepoSegment(body.owner) || !isRepoSegment(body.name)) {
    return json({ error: 'Invalid repository route' }, 400);
  }

  const fullName = `${body.owner}/${body.name}`;
  const { data: membership, error: membershipError } = await admin
    .from('user_stars')
    .select('repo_id, repos!inner(full_name)')
    .eq('user_id', userData.user.id)
    .ilike('repos.full_name', fullName)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return json({ status: 'retryable_error' }, 500);
  }
  if (!membership) {
    return json({ status: 'not_in_library' });
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.html+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'asterism-read-repo-readme',
  };
  if (typeof body.providerToken === 'string' && body.providerToken) {
    headers.Authorization = `Bearer ${body.providerToken}`;
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(body.owner)}/${encodeURIComponent(body.name)}/readme`,
      { headers },
    );
  } catch {
    return json({ status: 'retryable_error' }, 502);
  }

  if (response.ok) {
    return json({
      status: 'success',
      html: await response.text(),
      etag: response.headers.get('etag'),
    });
  }
  if (response.status === 404) {
    return json({ status: 'not_found' });
  }
  if (response.status === 401) {
    return json({ status: 'reconnect_required' });
  }
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    return json({ status: 'rate_limited' });
  }
  return json({ status: 'retryable_error' }, 502);
});
