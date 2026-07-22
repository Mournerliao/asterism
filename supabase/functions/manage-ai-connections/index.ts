import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { DnsResolver, HostAllowlist } from '../../../packages/core/src/ai/ssrf.ts';
import type { Database } from '../../../packages/db/src/database.types.ts';
import { buildKeyRing, type KeyRing, parseKeyMaterial } from './crypto.ts';
import { createManageAiConnectionsHandler } from './handler.ts';
import type { ProviderCallConfig } from './provider-call.ts';
import { createAiConnectionService } from './service.ts';

function parseAllowlist(raw: string | undefined): HostAllowlist {
  const value = (raw ?? '').trim();
  if (value === '*') return { mode: 'all' };
  return {
    mode: 'list',
    domains: value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
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

  let ring: KeyRing;
  try {
    ring = await getKeyRing();
  } catch {
    return configurationError();
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const providerConfig: ProviderCallConfig = {
    fetch,
    resolve: resolveDns,
    allowlist: parseAllowlist(Deno.env.get('AI_CUSTOM_ENDPOINT_ALLOWLIST')),
  };
  const service = createAiConnectionService({ admin, ring, providerConfig });
  const handler = createManageAiConnectionsHandler({
    authenticate: async (jwt) => {
      const { data, error } = await admin.auth.getUser(jwt);
      return error ? null : (data.user?.id ?? null);
    },
    ...service,
  });
  return handler(request);
});
