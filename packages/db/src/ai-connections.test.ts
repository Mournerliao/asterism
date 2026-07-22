import { describe, expect, it, vi } from 'vitest';
import {
  createAiConnection,
  deleteAiConnection,
  discoverAiConnectionModels,
  getAiSettings,
  isAiConnection,
  isAiSettings,
  listAiConnections,
  testAiConnection,
  updateAiConnection,
  updateAiSettings,
} from './ai-connections';
import type { SupabaseClient } from './client';

function clientReturning(data: unknown, error: unknown = null) {
  const invoke = vi.fn().mockResolvedValue({ data, error });
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

function clientWithSettingsRow(row: unknown, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from } as unknown as SupabaseClient, from, select, eq, maybeSingle };
}

const connection = {
  id: 'conn-1',
  adapter: 'openai',
  name: 'My OpenAI',
  baseUrl: null,
  status: 'valid',
  credentialHint: '••••abcd',
  generationCapability: { models: ['gpt-4o'] },
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
};

const settings = {
  generationConnectionId: 'conn-1',
  generationModel: 'gpt-4o',
  includeNotesInAi: true,
  locale: 'en',
  theme: 'dark',
};

describe('isAiConnection', () => {
  it('accepts the function safe projection', () => {
    expect(isAiConnection(connection)).toBe(true);
    expect(
      isAiConnection({ ...connection, adapter: 'openai-compatible', baseUrl: 'https://x' }),
    ).toBe(true);
  });

  it.each([
    ['unknown adapter', { ...connection, adapter: 'mystery' }],
    ['unknown status', { ...connection, status: 'pending' }],
    ['numeric name', { ...connection, name: 42 }],
    ['non-string base url', { ...connection, baseUrl: 12 }],
    ['missing timestamps', { ...connection, createdAt: undefined }],
  ])('rejects %s', (_label, value) => {
    expect(isAiConnection(value)).toBe(false);
  });

  it.each([
    ['ciphertext', { ...connection, credential_ciphertext: 'AAAA' }],
    ['nonce', { ...connection, credential_nonce: 'BBBB' }],
    ['version', { ...connection, credential_version: 1 }],
    ['raw credential', { ...connection, credential: { apiKey: 'sk-live' } }],
    ['bare api key', { ...connection, apiKey: 'sk-live' }],
  ])('rejects a projection that leaks %s', (_label, value) => {
    expect(isAiConnection(value)).toBe(false);
  });
});

describe('isAiSettings', () => {
  it('accepts fully populated and empty-default shapes', () => {
    expect(isAiSettings(settings)).toBe(true);
    expect(
      isAiSettings({
        generationConnectionId: null,
        generationModel: null,
        includeNotesInAi: false,
        locale: null,
        theme: null,
      }),
    ).toBe(true);
  });

  it.each([
    ['unknown locale', { ...settings, locale: 'fr' }],
    ['unknown theme', { ...settings, theme: 'midnight' }],
    ['non-boolean note flag', { ...settings, includeNotesInAi: 'yes' }],
  ])('rejects %s', (_label, value) => {
    expect(isAiSettings(value)).toBe(false);
  });
});

describe('listAiConnections', () => {
  it('requests the list action and preserves the typed projections', async () => {
    const { client, invoke } = clientReturning({ connections: [connection] });

    await expect(listAiConnections(client)).resolves.toEqual([connection]);
    expect(invoke).toHaveBeenCalledWith('manage-ai-connections', { body: { action: 'list' } });
  });

  it('accepts an empty library', async () => {
    const { client } = clientReturning({ connections: [] });

    await expect(listAiConnections(client)).resolves.toEqual([]);
  });

  it('rejects a malformed projection at the trust boundary', async () => {
    const { client } = clientReturning({ connections: [{ ...connection, status: 'mystery' }] });

    await expect(listAiConnections(client)).rejects.toThrow('invalid response');
  });
});

describe('createAiConnection', () => {
  it('forwards the create payload and returns the safe projection', async () => {
    const { client, invoke } = clientReturning({ connection });
    const input = {
      adapter: 'openai' as const,
      name: 'My OpenAI',
      credential: { apiKey: 'sk-secret' },
    };

    await expect(createAiConnection(client, input)).resolves.toEqual(connection);
    expect(invoke).toHaveBeenCalledWith('manage-ai-connections', {
      body: { action: 'create', ...input },
    });
  });

  it('propagates a function error instead of returning a value', async () => {
    const { client } = clientReturning(null, new Error('missing_api_key'));

    await expect(
      createAiConnection(client, {
        adapter: 'openai',
        name: 'My OpenAI',
        credential: { apiKey: '' },
      }),
    ).rejects.toThrow('missing_api_key');
  });
});

describe('updateAiConnection', () => {
  it('forwards the connection id alongside the changed fields', async () => {
    const { client, invoke } = clientReturning({ connection });

    await expect(
      updateAiConnection(client, 'conn-1', { name: 'Renamed', enabled: false }),
    ).resolves.toEqual(connection);
    expect(invoke).toHaveBeenCalledWith('manage-ai-connections', {
      body: { action: 'update', connectionId: 'conn-1', name: 'Renamed', enabled: false },
    });
  });
});

describe('discoverAiConnectionModels', () => {
  it('returns the typed model list', async () => {
    const { client, invoke } = clientReturning({ models: ['gpt-4o', 'o3'] });

    await expect(discoverAiConnectionModels(client, 'conn-1')).resolves.toEqual(['gpt-4o', 'o3']);
    expect(invoke).toHaveBeenCalledWith('manage-ai-connections', {
      body: { action: 'discover-models', connectionId: 'conn-1' },
    });
  });

  it('rejects malformed model discovery responses', async () => {
    const { client } = clientReturning({ models: ['gpt-4o', 42] });
    await expect(discoverAiConnectionModels(client, 'conn-1')).rejects.toThrow('invalid response');
  });
});

describe('testAiConnection', () => {
  it('probes the connection against a chosen model', async () => {
    const { client, invoke } = clientReturning({ connection });

    await expect(testAiConnection(client, 'conn-1', 'gpt-4o')).resolves.toEqual(connection);
    expect(invoke).toHaveBeenCalledWith('manage-ai-connections', {
      body: { action: 'test', connectionId: 'conn-1', model: 'gpt-4o' },
    });
  });
});

describe('deleteAiConnection', () => {
  it('resolves when the function confirms deletion', async () => {
    const { client, invoke } = clientReturning({ deleted: true });

    await expect(deleteAiConnection(client, 'conn-1')).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith('manage-ai-connections', {
      body: { action: 'delete', connectionId: 'conn-1' },
    });
  });

  it('rejects when deletion is not confirmed', async () => {
    const { client } = clientReturning({ deleted: false });

    await expect(deleteAiConnection(client, 'conn-1')).rejects.toThrow('invalid response');
  });
});

describe('updateAiSettings', () => {
  it('forwards the settings changes and returns the resolved settings', async () => {
    const { client, invoke } = clientReturning({ settings });

    await expect(
      updateAiSettings(client, { generationConnectionId: 'conn-1', generationModel: 'gpt-4o' }),
    ).resolves.toEqual(settings);
    expect(invoke).toHaveBeenCalledWith('manage-ai-connections', {
      body: {
        action: 'update-settings',
        generationConnectionId: 'conn-1',
        generationModel: 'gpt-4o',
      },
    });
  });

  it('rejects a malformed settings payload', async () => {
    const { client } = clientReturning({ settings: { ...settings, theme: 'midnight' } });

    await expect(updateAiSettings(client, { includeNotesInAi: true })).rejects.toThrow(
      'invalid response',
    );
  });
});

describe('getAiSettings', () => {
  it('reads the owner-scoped row and maps it to camelCase', async () => {
    const { client, from, select, eq } = clientWithSettingsRow({
      generation_connection_id: 'conn-1',
      generation_model: 'gpt-4o',
      include_notes_in_ai: true,
      locale: 'en',
      theme: 'dark',
    });

    await expect(getAiSettings(client, 'user-1')).resolves.toEqual(settings);
    expect(from).toHaveBeenCalledWith('user_settings');
    expect(select).toHaveBeenCalledWith(
      'generation_connection_id, generation_model, include_notes_in_ai, locale, theme',
    );
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns defaults when the caller has no settings row yet', async () => {
    const { client } = clientWithSettingsRow(null);

    await expect(getAiSettings(client, 'user-1')).resolves.toEqual({
      generationConnectionId: null,
      generationModel: null,
      includeNotesInAi: false,
      locale: null,
      theme: null,
    });
  });

  it('propagates a query error', async () => {
    const { client } = clientWithSettingsRow(null, new Error('permission denied'));

    await expect(getAiSettings(client, 'user-1')).rejects.toThrow('permission denied');
  });
});
