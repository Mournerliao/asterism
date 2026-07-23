import { describe, expect, it, vi } from 'vitest';
import {
  AiOrganizationConfirmationError,
  type AiOrganizationDraft,
  confirmAiOrganizationDraft,
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
} satisfies AiOrganizationDraft;

function clientReturning(data: unknown) {
  const invoke = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

function clientFailing(code: string) {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: {
          context: new Response(JSON.stringify({ error: code }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }),
        },
      }),
    },
  } as unknown as SupabaseClient;
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

  it('confirms the exact reviewed state and accepts only a safe operation reference', async () => {
    const confirmed = clientReturning({
      status: 'confirmed',
      operationId: 'operation-1',
    });
    await expect(
      confirmAiOrganizationDraft(confirmed.client, {
        draftId: 'draft-1',
        expectedRevision: 4,
        suggestions: draft.suggestions,
      }),
    ).resolves.toEqual({ status: 'confirmed', operationId: 'operation-1' });
    expect(confirmed.invoke).toHaveBeenCalledWith('manage-ai-organization', {
      body: {
        action: 'confirm',
        draftId: 'draft-1',
        expectedRevision: 4,
        suggestions: draft.suggestions,
      },
    });

    await expect(
      confirmAiOrganizationDraft(
        clientReturning({
          status: 'confirmed',
          operationId: 'operation-1',
          credential: 'secret',
        }).client,
        {
          draftId: 'draft-1',
          expectedRevision: 4,
          suggestions: draft.suggestions,
        },
      ),
    ).rejects.toThrow('invalid response');

    const conflict = confirmAiOrganizationDraft(clientFailing('draft_confirmation_conflict'), {
      draftId: 'draft-1',
      expectedRevision: 4,
      suggestions: draft.suggestions,
    });
    await expect(conflict).rejects.toBeInstanceOf(AiOrganizationConfirmationError);
    await expect(
      confirmAiOrganizationDraft(clientFailing('draft_confirmation_conflict'), {
        draftId: 'draft-1',
        expectedRevision: 4,
        suggestions: draft.suggestions,
      }),
    ).rejects.toThrow('draft_confirmation_conflict');
  });
});
