import { describe, expect, it } from 'vitest';
import { buildCredentialAad, buildKeyRing, decryptCredential } from './crypto';
import type { ProviderCallConfig } from './provider-call';
import { type AiConnectionsAdminClient, createAiConnectionService } from './service';

type Row = Record<string, unknown>;
type Tables = Record<'ai_provider_connections' | 'user_settings', Row[]>;

function matches(row: Row, filters: Record<string, unknown>): boolean {
  return Object.entries(filters).every(([key, value]) => row[key] === value);
}

class Query {
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row = {};
  private filters: Record<string, unknown> = {};

  constructor(
    private readonly rows: Row[],
    private readonly table: keyof Tables,
  ) {}

  select() {
    return this;
  }

  insert(payload: Row) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  upsert(payload: Row) {
    this.action = 'upsert';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(key: string, value: unknown) {
    this.filters[key] = value;
    return this;
  }

  async order() {
    return { data: this.rows.filter((row) => matches(row, this.filters)), error: null };
  }

  async maybeSingle() {
    return this.execute(false);
  }

  async single() {
    return this.execute(true);
  }

  private async execute(required: boolean) {
    if (this.action === 'insert') {
      this.rows.push({ ...this.payload });
      return { data: this.rows.at(-1) ?? null, error: null };
    }
    if (this.action === 'upsert') {
      const existing = this.rows.find((row) => row.user_id === this.payload.user_id);
      if (existing) Object.assign(existing, this.payload);
      else this.rows.push({ ...this.payload });
      return { data: existing ?? this.rows.at(-1) ?? null, error: null };
    }
    const index = this.rows.findIndex((row) => matches(row, this.filters));
    const current = index === -1 ? null : this.rows[index];
    if (this.action === 'update' && current) Object.assign(current, this.payload);
    if (this.action === 'delete' && index !== -1) this.rows.splice(index, 1);
    return {
      data: current,
      error: required && !current ? { message: `${this.table}_row_missing` } : null,
    };
  }
}

function adminFor(tables: Tables): AiConnectionsAdminClient {
  return {
    from: (table: keyof Tables) => new Query(tables[table], table),
  } as unknown as AiConnectionsAdminClient;
}

function randomKeyBase64(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}

async function setup(tables: Tables) {
  const ring = await buildKeyRing({ '1': randomKeyBase64() }, 1);
  const providerConfig: ProviderCallConfig = {
    fetch: (async () =>
      new Response(JSON.stringify({ data: [{ id: 'gpt-4o' }] }), { status: 200 })) as typeof fetch,
    resolve: async () => ['8.8.8.8'],
    allowlist: { mode: 'all' },
  };
  return {
    ring,
    service: createAiConnectionService({ admin: adminFor(tables), ring, providerConfig }),
  };
}

function emptyTables(): Tables {
  return { ai_provider_connections: [], user_settings: [] };
}

describe('AI connection service', () => {
  it('encrypts a created credential and returns only the safe projection', async () => {
    const tables = emptyTables();
    const { ring, service } = await setup(tables);

    const view = await service.createConnection('user-1', {
      adapter: 'openai',
      name: 'Personal OpenAI',
      baseUrl: null,
      credential: { apiKey: 'sk-secret' },
    });
    const stored = tables.ai_provider_connections[0];
    expect(view).not.toHaveProperty('credentialCiphertext');
    expect(stored?.credential_ciphertext).not.toBe('sk-secret');
    await expect(
      decryptCredential(
        ring,
        {
          ciphertext: String(stored?.credential_ciphertext),
          nonce: String(stored?.credential_nonce),
          version: Number(stored?.credential_version),
        },
        buildCredentialAad(1, 'user-1', String(stored?.id)),
      ),
    ).resolves.toBe('sk-secret');
  });

  it('only activates the exact model recorded by a successful capability test', async () => {
    const tables = emptyTables();
    tables.ai_provider_connections.push({
      id: 'conn-1',
      user_id: 'user-1',
      status: 'valid',
      generation_capability: { ok: true, model: 'gpt-4o' },
    });
    const { service } = await setup(tables);

    await expect(
      service.updateSettings('user-1', {
        generationConnectionId: 'conn-1',
        generationModel: 'not-tested',
      }),
    ).rejects.toThrow('model_not_verified');
    await expect(
      service.updateSettings('user-1', { generationConnectionId: 'conn-1' }),
    ).resolves.toMatchObject({
      generationConnectionId: 'conn-1',
      generationModel: 'gpt-4o',
    });
  });

  it('disables a connection without letting the client assert a valid status', async () => {
    const tables = emptyTables();
    tables.ai_provider_connections.push({
      id: 'conn-1',
      user_id: 'user-1',
      adapter: 'openai',
      name: 'OpenAI',
      base_url: null,
      status: 'valid',
      credential_hint: '••••cret',
      generation_capability: { ok: true, model: 'gpt-4o' },
      created_at: '2026-07-22T00:00:00.000Z',
      updated_at: '2026-07-22T00:00:00.000Z',
    });
    const { service } = await setup(tables);

    await expect(
      service.updateConnection('user-1', 'conn-1', { enabled: false }),
    ).resolves.toMatchObject({
      status: 'disabled',
    });
  });

  it('clears stale capability whenever the endpoint or credential changes', async () => {
    const tables = emptyTables();
    tables.ai_provider_connections.push({
      id: 'conn-1',
      user_id: 'user-1',
      adapter: 'openai',
      name: 'OpenAI',
      base_url: null,
      status: 'valid',
      credential_hint: '••••cret',
      generation_capability: { ok: true, model: 'gpt-4o' },
      created_at: '2026-07-22T00:00:00.000Z',
      updated_at: '2026-07-22T00:00:00.000Z',
    });
    const { service } = await setup(tables);

    await expect(
      service.updateConnection('user-1', 'conn-1', {
        credential: { apiKey: 'sk-replacement' },
      }),
    ).resolves.toMatchObject({ status: 'untested', generationCapability: null });
    await expect(
      service.updateConnection('user-1', 'conn-1', { enabled: true }),
    ).resolves.toMatchObject({ status: 'untested' });
  });

  it('records a probe result without implicitly enabling a disabled connection', async () => {
    const tables = emptyTables();
    const { service } = await setup(tables);
    const created = await service.createConnection('user-1', {
      adapter: 'openai',
      name: 'OpenAI',
      baseUrl: null,
      credential: { apiKey: 'sk-secret' },
    });
    await service.updateConnection('user-1', created.id, { enabled: false });

    await expect(
      service.testConnection('user-1', { connectionId: created.id, model: 'gpt-4o' }),
    ).resolves.toMatchObject({
      status: 'disabled',
      generationCapability: { ok: false, model: 'gpt-4o' },
    });
  });
});
