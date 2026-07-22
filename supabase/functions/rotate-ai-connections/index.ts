import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../../packages/db/src/database.types.ts';
import { buildKeyRing, type KeyRing, parseKeyMaterial } from '../manage-ai-connections/crypto.ts';
import { createRotateAiConnectionsHandler } from './handler.ts';
import {
  type RotatedCredential,
  type RotationStore,
  rotateCredentials,
  type StoredCredentialRow,
} from './rotate.ts';

type AdminClient = ReturnType<typeof createClient<Database>>;

// Cover every owner's rows; pages until a short page so no ciphertext is left behind.
const PAGE_SIZE = 1000;

function serverConfigurationMissing(): Response {
  return new Response(JSON.stringify({ error: 'server_configuration_missing' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Service-role access to every stored credential. Reads only the ciphertext
 * material (never the safe projection's display columns) and writes back the
 * re-encrypted bytes by primary key.
 */
function buildRotationStore(admin: AdminClient): RotationStore {
  return {
    async listCredentialRows(): Promise<StoredCredentialRow[]> {
      const rows: StoredCredentialRow[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await admin
          .from('ai_provider_connections')
          .select('id, user_id, credential_ciphertext, credential_nonce, credential_version')
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw new Error('credentials_read_failed');
        const page = (data ?? []) as unknown as Record<string, unknown>[];
        for (const row of page) {
          rows.push({
            id: String(row.id),
            userId: String(row.user_id),
            ciphertext: String(row.credential_ciphertext),
            nonce: String(row.credential_nonce),
            version: Number(row.credential_version),
          });
        }
        if (page.length < PAGE_SIZE) break;
      }
      return rows;
    },
    async saveRotatedCredential(row: RotatedCredential): Promise<void> {
      const { error } = await admin
        .from('ai_provider_connections')
        .update({
          credential_ciphertext: row.ciphertext,
          credential_nonce: row.nonce,
          credential_version: row.version,
        })
        .eq('id', row.id);
      if (error) throw new Error('credential_write_failed');
    },
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

Deno.serve(async (request: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const rotationSecret = (Deno.env.get('AI_CREDENTIAL_ROTATION_SECRET') ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey || !rotationSecret) {
    return serverConfigurationMissing();
  }

  let ring: KeyRing;
  try {
    ring = await getKeyRing();
  } catch {
    return serverConfigurationMissing();
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const store = buildRotationStore(admin);

  const handler = createRotateAiConnectionsHandler({
    expectedSecret: rotationSecret,
    rotate: () => rotateCredentials(ring, store),
  });
  return handler(request);
});
