import { describe, expect, it, vi } from 'vitest';
import {
  AI_NOTE_CODE_POINT_LIMIT,
  type AiOrganizationServiceDependencies,
  createAiOrganizationService,
  type OrganizationContext,
} from './service';

const repoId = '11111111-1111-4111-8111-111111111111';
const context: OrganizationContext = {
  settings: {
    generationConnectionId: 'connection-1',
    generationModel: 'model-1',
    includeNotesInAi: true,
  },
  connection: {
    id: 'connection-1',
    adapter: 'openai',
    baseUrl: null,
    status: 'valid',
    capability: { ok: true, model: 'model-1', testedAt: '2026-07-23T00:00:00Z' },
  },
  repositories: [
    { id: repoId, fullName: 'owner/repo', description: 'desc', language: 'TS', topics: ['ai'] },
  ],
  tags: [{ id: 'tag-1', name: 'Tools' }],
  collections: [],
  repoTags: [{ repoId, tagId: 'tag-1' }],
  collectionRepos: [],
  notes: [{ repoId, body: `${'😀'.repeat(AI_NOTE_CODE_POINT_LIMIT)}tail` }],
};

function dependencies(
  overrides: Partial<AiOrganizationServiceDependencies> = {},
): AiOrganizationServiceDependencies {
  return {
    loadContext: vi.fn().mockResolvedValue(context),
    readCredential: vi.fn().mockResolvedValue('secret-key'),
    callProvider: vi.fn().mockResolvedValue({
      version: 1,
      relationChanges: [],
      newClassifications: [],
    }),
    replaceDraft: vi.fn().mockResolvedValue({
      id: 'draft-1',
      sourceRepoIds: [repoId],
      suggestions: { version: 1, relationChanges: [], newClassifications: [] },
      generationConnectionId: 'connection-1',
      generationAdapter: 'openai',
      generationModel: 'model-1',
      reviewState: 'review',
      revision: 1,
      createdAt: 'now',
      updatedAt: 'now',
    }),
    getDraft: vi.fn().mockResolvedValue(null),
    discardDraft: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe('AI organization authoritative service', () => {
  it('uses persisted metadata and truncates opted-in notes by Unicode code point', async () => {
    const deps = dependencies();
    await createAiOrganizationService(deps).generateDraft('user-1', [repoId]);
    const target = vi.mocked(deps.callProvider).mock.calls[0]?.[0];
    expect(target?.input.repositories[0]).toMatchObject({
      id: repoId,
      fullName: 'owner/repo',
      existingTagIds: ['tag-1'],
    });
    expect(Array.from(target?.input.repositories[0]?.note ?? '')).toHaveLength(
      AI_NOTE_CODE_POINT_LIMIT,
    );
    expect(deps.replaceDraft).toHaveBeenCalledAfter(vi.mocked(deps.callProvider));
  });

  it('excludes note bodies when the persisted preference is disabled', async () => {
    const deps = dependencies({
      loadContext: vi.fn().mockResolvedValue({
        ...context,
        settings: { ...context.settings, includeNotesInAi: false },
      }),
    });
    await createAiOrganizationService(deps).generateDraft('user-1', [repoId]);
    expect(
      vi.mocked(deps.callProvider).mock.calls[0]?.[0].input.repositories[0],
    ).not.toHaveProperty('note');
  });

  it('rejects foreign repositories and an inexact tested model before provider access', async () => {
    const foreign = dependencies({
      loadContext: vi.fn().mockResolvedValue({ ...context, repositories: [] }),
    });
    await expect(
      createAiOrganizationService(foreign).generateDraft('user-1', [repoId]),
    ).rejects.toThrow('repository_not_owned');
    expect(foreign.callProvider).not.toHaveBeenCalled();

    const stale = dependencies({
      loadContext: vi.fn().mockResolvedValue({
        ...context,
        connection: {
          id: 'connection-1',
          adapter: 'openai',
          baseUrl: null,
          status: 'valid',
          capability: { ok: true, model: 'old-model' },
        },
      }),
    });
    await expect(
      createAiOrganizationService(stale).generateDraft('user-1', [repoId]),
    ).rejects.toThrow('generation_connection_not_valid');
    expect(stale.callProvider).not.toHaveBeenCalled();
  });

  it('preserves the previous draft whenever the provider fails', async () => {
    const deps = dependencies({
      callProvider: vi.fn().mockRejectedValue(new Error('provider_timeout')),
    });
    await expect(
      createAiOrganizationService(deps).generateDraft('user-1', [repoId]),
    ).rejects.toThrow('provider_timeout');
    expect(deps.replaceDraft).not.toHaveBeenCalled();
  });
});
