import { describe, expect, it, vi } from 'vitest';
import {
  type ConnectionView,
  createManageAiConnectionsHandler,
  type ManageAiConnectionsDependencies,
  type SettingsView,
} from './handler';

const connection: ConnectionView = {
  id: 'conn-1',
  adapter: 'openai',
  name: 'My OpenAI',
  baseUrl: null,
  status: 'untested',
  credentialHint: '••••1234',
  generationCapability: null,
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
};

const settings: SettingsView = {
  generationConnectionId: null,
  generationModel: null,
  includeNotesInAi: false,
  locale: 'en',
  theme: 'system',
};

function dependencies(
  overrides: Partial<ManageAiConnectionsDependencies> = {},
): ManageAiConnectionsDependencies {
  return {
    authenticate: vi.fn().mockResolvedValue('user-1'),
    listConnections: vi.fn().mockResolvedValue([connection]),
    createConnection: vi.fn().mockResolvedValue(connection),
    updateConnection: vi.fn().mockResolvedValue(connection),
    deleteConnection: vi.fn().mockResolvedValue(true),
    testConnection: vi.fn().mockResolvedValue({ ...connection, status: 'valid' }),
    discoverModels: vi.fn().mockResolvedValue(['gpt-4o-mini']),
    getSettings: vi.fn().mockResolvedValue(settings),
    updateSettings: vi.fn().mockResolvedValue(settings),
    ...overrides,
  };
}

function request(body: unknown, authorized = true) {
  return new Request('https://example.test/manage-ai-connections', {
    method: 'POST',
    headers: authorized
      ? { Authorization: 'Bearer session-jwt', 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function outcome(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('manage-ai-connections trusted HTTP interface', () => {
  it('lists connections scoped to the authenticated user', async () => {
    const deps = dependencies();
    const response = await createManageAiConnectionsHandler(deps)(request({ action: 'list' }));

    expect(response.status).toBe(200);
    expect(deps.listConnections).toHaveBeenCalledWith('user-1');
    expect(await outcome(response)).toEqual({ connections: [connection] });
  });

  it('rejects an unauthenticated request before touching any dependency', async () => {
    const deps = dependencies();
    const response = await createManageAiConnectionsHandler(deps)(
      request({ action: 'list' }, false),
    );

    expect(response.status).toBe(401);
    expect(deps.listConnections).not.toHaveBeenCalled();
  });

  it('creates a connection from a normalized, trimmed payload', async () => {
    const deps = dependencies();
    const response = await createManageAiConnectionsHandler(deps)(
      request({
        action: 'create',
        adapter: 'openai',
        name: '  My OpenAI  ',
        credential: { apiKey: '  sk-live-123  ' },
      }),
    );

    expect(response.status).toBe(201);
    expect(deps.createConnection).toHaveBeenCalledWith('user-1', {
      adapter: 'openai',
      name: 'My OpenAI',
      baseUrl: null,
      credential: { apiKey: '  sk-live-123  ' },
    });
    const body = await outcome(response);
    expect(body).toEqual({ connection });
    expect(JSON.stringify(body)).not.toContain('ciphertext');
  });

  it('rejects malformed create payloads without calling the dependency', async () => {
    const deps = dependencies();
    const handler = createManageAiConnectionsHandler(deps);

    expect(
      (
        await handler(
          request({ action: 'create', adapter: 'mystery', name: 'x', credential: { apiKey: 'k' } }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await handler(request({ action: 'create', adapter: 'openai', name: 'x', credential: {} })))
        .status,
    ).toBe(400);
    expect(
      (
        await handler(
          request({ action: 'create', adapter: 'openai', name: '', credential: { apiKey: 'k' } }),
        )
      ).status,
    ).toBe(400);
    expect(deps.createConnection).not.toHaveBeenCalled();
  });

  it('passes a partial update through and 404s an unknown connection', async () => {
    const deps = dependencies({ updateConnection: vi.fn().mockResolvedValue(null) });
    const response = await createManageAiConnectionsHandler(deps)(
      request({ action: 'update', connectionId: 'conn-9', enabled: false }),
    );

    expect(response.status).toBe(404);
    expect(deps.updateConnection).toHaveBeenCalledWith('user-1', 'conn-9', { enabled: false });
    expect(await outcome(response)).toEqual({ error: 'connection_not_found' });
  });

  it('rejects an update with no changed fields', async () => {
    const deps = dependencies();
    const response = await createManageAiConnectionsHandler(deps)(
      request({ action: 'update', connectionId: 'conn-1' }),
    );

    expect(response.status).toBe(400);
    expect(deps.updateConnection).not.toHaveBeenCalled();
  });

  it('deletes a connection and reports the result', async () => {
    const present = dependencies();
    expect(
      (
        await createManageAiConnectionsHandler(present)(
          request({ action: 'delete', connectionId: 'conn-1' }),
        )
      ).status,
    ).toBe(200);
    expect(present.deleteConnection).toHaveBeenCalledWith('user-1', 'conn-1');

    const missing = dependencies({ deleteConnection: vi.fn().mockResolvedValue(false) });
    expect(
      (
        await createManageAiConnectionsHandler(missing)(
          request({ action: 'delete', connectionId: 'ghost' }),
        )
      ).status,
    ).toBe(404);
  });

  it('tests a connection against a specific model', async () => {
    const deps = dependencies();
    const response = await createManageAiConnectionsHandler(deps)(
      request({ action: 'test', connectionId: 'conn-1', model: 'gpt-4o-mini' }),
    );

    expect(response.status).toBe(200);
    expect(deps.testConnection).toHaveBeenCalledWith('user-1', {
      connectionId: 'conn-1',
      model: 'gpt-4o-mini',
    });
    expect((await outcome(response)).connection).toMatchObject({ status: 'valid' });
  });

  it('requires a model to run a test', async () => {
    const deps = dependencies();
    const response = await createManageAiConnectionsHandler(deps)(
      request({ action: 'test', connectionId: 'conn-1' }),
    );
    expect(response.status).toBe(400);
    expect(deps.testConnection).not.toHaveBeenCalled();
  });

  it('discovers models for an owned connection', async () => {
    const deps = dependencies();
    const response = await createManageAiConnectionsHandler(deps)(
      request({ action: 'discover-models', connectionId: 'conn-1' }),
    );

    expect(response.status).toBe(200);
    expect(await outcome(response)).toEqual({ models: ['gpt-4o-mini'] });
    expect(deps.discoverModels).toHaveBeenCalledWith('user-1', { connectionId: 'conn-1' });
  });

  it('returns 404 when model discovery targets another user connection', async () => {
    const deps = dependencies({ discoverModels: vi.fn().mockResolvedValue(null) });
    const response = await createManageAiConnectionsHandler(deps)(
      request({ action: 'discover-models', connectionId: 'conn-other' }),
    );

    expect(response.status).toBe(404);
  });

  it('reads and writes user settings', async () => {
    const deps = dependencies();
    const handler = createManageAiConnectionsHandler(deps);

    expect((await handler(request({ action: 'get-settings' }))).status).toBe(200);
    expect(deps.getSettings).toHaveBeenCalledWith('user-1');

    const update = await handler(
      request({
        action: 'update-settings',
        includeNotesInAi: true,
        generationConnectionId: 'conn-1',
      }),
    );
    expect(update.status).toBe(200);
    expect(deps.updateSettings).toHaveBeenCalledWith('user-1', {
      includeNotesInAi: true,
      generationConnectionId: 'conn-1',
    });
  });

  it('rejects an invalid settings payload', async () => {
    const deps = dependencies();
    const response = await createManageAiConnectionsHandler(deps)(
      request({ action: 'update-settings', locale: 'fr' }),
    );
    expect(response.status).toBe(400);
    expect(deps.updateSettings).not.toHaveBeenCalled();
  });

  it('maps dependency error codes to client, conflict, and server statuses', async () => {
    const clientError = dependencies({
      updateSettings: vi.fn().mockRejectedValue(new Error('connection_not_valid')),
    });
    expect(
      (
        await createManageAiConnectionsHandler(clientError)(
          request({ action: 'update-settings', generationConnectionId: 'conn-1' }),
        )
      ).status,
    ).toBe(400);

    const unverifiedModel = dependencies({
      updateSettings: vi.fn().mockRejectedValue(new Error('model_not_verified')),
    });
    expect(
      (
        await createManageAiConnectionsHandler(unverifiedModel)(
          request({ action: 'update-settings', generationModel: 'gpt-4o' }),
        )
      ).status,
    ).toBe(400);

    const conflict = dependencies({
      createConnection: vi.fn().mockRejectedValue(new Error('duplicate_builtin_connection')),
    });
    expect(
      (
        await createManageAiConnectionsHandler(conflict)(
          request({ action: 'create', adapter: 'openai', name: 'x', credential: { apiKey: 'k' } }),
        )
      ).status,
    ).toBe(409);

    const serverError = dependencies({
      listConnections: vi.fn().mockRejectedValue(new Error('database_unreachable')),
    });
    expect(
      (await createManageAiConnectionsHandler(serverError)(request({ action: 'list' }))).status,
    ).toBe(500);
  });

  it('rejects an unknown action', async () => {
    const deps = dependencies();
    expect((await createManageAiConnectionsHandler(deps)(request({ action: 'nope' }))).status).toBe(
      400,
    );
  });
});
