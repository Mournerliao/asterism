import { describe, expect, it, vi } from 'vitest';
import {
  discardAiOrganizationDraft,
  generateAiOrganizationDraft,
  getAiOrganizationDraft,
  isAiOrganizationDraft,
  updateAiOrganizationDraftReview,
} from './ai-organization';
import type { SupabaseClient } from './client';

const draft = {
  id: 'draft-1',
  sourceRepoIds: ['repo-1'],
  suggestions: { version: 2, relationChanges: [], newClassifications: [] },
  generationConnectionId: 'connection-1',
  generationAdapter: 'openai',
  generationModel: 'gpt-4o-mini',
  reviewState: 'review',
  revision: 1,
  createdAt: '2026-07-23T00:00:00Z',
  updatedAt: '2026-07-23T00:00:00Z',
};

function clientReturning(data: unknown) {
  const invoke = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

describe('AI organization DB boundary', () => {
  it('guards the complete safe draft projection and rejects sensitive or malformed responses', () => {
    expect(isAiOrganizationDraft(draft)).toBe(true);
    expect(isAiOrganizationDraft({ ...draft, rawOutput: 'provider text' })).toBe(false);
    expect(
      isAiOrganizationDraft({
        ...draft,
        suggestions: { ...draft.suggestions, credential: { apiKey: 'secret' } },
      }),
    ).toBe(false);
    expect(isAiOrganizationDraft({ ...draft, reviewState: 'confirmed' })).toBe(false);
    expect(isAiOrganizationDraft({ ...draft, generationAdapter: 'mystery' })).toBe(false);
    expect(isAiOrganizationDraft({ ...draft, sourceRepoIds: [] })).toBe(false);
  });

  it('invokes generate/read/discard actions and accepts a successful empty draft', async () => {
    const generated = clientReturning({ draft });
    await expect(generateAiOrganizationDraft(generated.client, ['repo-1'])).resolves.toEqual(draft);
    expect(generated.invoke).toHaveBeenCalledWith('manage-ai-organization', {
      body: { action: 'generate', repoIds: ['repo-1'] },
    });
    await expect(
      getAiOrganizationDraft(clientReturning({ draft: null }).client),
    ).resolves.toBeNull();
    await expect(
      discardAiOrganizationDraft(clientReturning({ discarded: true }).client),
    ).resolves.toBe(true);
  });

  it('rejects malformed lifecycle responses', async () => {
    await expect(
      getAiOrganizationDraft(clientReturning({ draft: { id: 1 } }).client),
    ).rejects.toThrow('invalid response');
    await expect(
      discardAiOrganizationDraft(clientReturning({ discarded: 'yes' }).client),
    ).rejects.toThrow('invalid response');
  });

  it('persists review choices through the public boundary and exposes revision conflicts', async () => {
    const updated = clientReturning({ status: 'updated', draft: { ...draft, revision: 2 } });
    await expect(
      updateAiOrganizationDraftReview(updated.client, {
        expectedRevision: 1,
        change: { kind: 'relation', suggestionId: 'relation-1', selected: false },
      }),
    ).resolves.toEqual({ status: 'updated', draft: { ...draft, revision: 2 } });
    expect(updated.invoke).toHaveBeenCalledWith('manage-ai-organization', {
      body: {
        action: 'update-review',
        expectedRevision: 1,
        change: { kind: 'relation', suggestionId: 'relation-1', selected: false },
      },
    });

    await expect(
      updateAiOrganizationDraftReview(clientReturning({ status: 'conflict' }).client, {
        expectedRevision: 1,
        change: {
          kind: 'classification',
          suggestionId: 'classification-1',
          approved: true,
        },
      }),
    ).resolves.toEqual({ status: 'conflict' });
  });
});
