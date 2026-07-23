import { describe, expect, it, vi } from 'vitest';
import {
  type AiOrganizationDependencies,
  type AiOrganizationDraftView,
  createManageAiOrganizationHandler,
} from './handler';

const draft: AiOrganizationDraftView = {
  id: 'draft-1',
  sourceRepoIds: ['repo-1'],
  suggestions: { version: 2, relationChanges: [], newClassifications: [] },
  generationConnectionId: 'connection-1',
  generationAdapter: 'openai',
  generationModel: 'gpt-4o-mini',
  reviewState: 'review',
  revision: 1,
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
};

function deps(overrides: Partial<AiOrganizationDependencies> = {}): AiOrganizationDependencies {
  return {
    authenticate: vi.fn().mockResolvedValue('user-1'),
    generateDraft: vi.fn().mockResolvedValue(draft),
    getDraft: vi.fn().mockResolvedValue(draft),
    updateReview: vi.fn().mockResolvedValue({ status: 'updated', draft }),
    confirmDraft: vi.fn().mockResolvedValue({
      status: 'confirmed',
      operationId: 'operation-1',
    }),
    discardDraft: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function request(body: unknown, authorized = true): Request {
  return new Request('https://example.test/manage-ai-organization', {
    method: 'POST',
    headers: authorized
      ? { Authorization: 'Bearer jwt', 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('manage-ai-organization trusted HTTP interface', () => {
  it('routes generate, read and discard through the authenticated user scope', async () => {
    const dependencies = deps();
    const handler = createManageAiOrganizationHandler(dependencies);
    expect((await handler(request({ action: 'generate', repoIds: ['repo-1'] }))).status).toBe(200);
    expect(dependencies.generateDraft).toHaveBeenCalledWith('user-1', ['repo-1']);
    expect((await handler(request({ action: 'read' }))).status).toBe(200);
    expect(dependencies.getDraft).toHaveBeenCalledWith('user-1');
    expect((await handler(request({ action: 'discard' }))).status).toBe(200);
    expect(dependencies.discardDraft).toHaveBeenCalledWith('user-1');
  });

  it('persists one review choice with the expected revision and returns conflicts distinctly', async () => {
    const dependencies = deps();
    const handler = createManageAiOrganizationHandler(dependencies);
    const response = await handler(
      request({
        action: 'update-review',
        expectedRevision: 3,
        change: { kind: 'relation', suggestionId: 'relation-1', selected: false },
      }),
    );
    expect(response.status).toBe(200);
    expect(dependencies.updateReview).toHaveBeenCalledWith('user-1', 3, {
      kind: 'relation',
      suggestionId: 'relation-1',
      selected: false,
    });

    const conflict = deps({
      updateReview: vi.fn().mockResolvedValue({ status: 'conflict' }),
    });
    const conflictResponse = await createManageAiOrganizationHandler(conflict)(
      request({
        action: 'update-review',
        expectedRevision: 2,
        change: {
          kind: 'classification',
          suggestionId: 'classification-1',
          approved: true,
        },
      }),
    );
    expect(conflictResponse.status).toBe(200);
    await expect(conflictResponse.json()).resolves.toEqual({ status: 'conflict' });
  });

  it('confirms the exact reviewed draft through the authenticated user scope', async () => {
    const dependencies = deps();
    const response = await createManageAiOrganizationHandler(dependencies)(
      request({
        action: 'confirm',
        draftId: 'draft-1',
        expectedRevision: 4,
        suggestions: {
          version: 2,
          relationChanges: [
            {
              id: 'relation-1',
              repoId: 'repo-1',
              relationType: 'tag',
              action: 'add',
              targetId: 'tag-1',
              selected: true,
            },
          ],
          newClassifications: [],
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(dependencies.confirmDraft).toHaveBeenCalledWith('user-1', {
      draftId: 'draft-1',
      expectedRevision: 4,
      suggestions: {
        version: 2,
        relationChanges: [
          {
            id: 'relation-1',
            repoId: 'repo-1',
            relationType: 'tag',
            action: 'add',
            targetId: 'tag-1',
            selected: true,
          },
        ],
        newClassifications: [],
      },
    });
    await expect(response.json()).resolves.toEqual({
      status: 'confirmed',
      operationId: 'operation-1',
    });
  });

  it('rejects malformed confirmation payloads before the transaction boundary', async () => {
    const dependencies = deps();
    const handler = createManageAiOrganizationHandler(dependencies);

    expect(
      (
        await handler(
          request({
            action: 'confirm',
            draftId: 'draft-1',
            expectedRevision: 0,
            suggestions: draft.suggestions,
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          request({
            action: 'confirm',
            draftId: 'draft-1',
            expectedRevision: 1,
            suggestions: {
              version: 2,
              relationChanges: [
                {
                  id: 'relation-1',
                  repoId: 'repo-1',
                  relationType: 'tag',
                  action: 'add',
                  targetId: 'tag-1',
                  selected: 'yes',
                },
              ],
              newClassifications: [],
            },
          }),
        )
      ).status,
    ).toBe(400);
    expect(dependencies.confirmDraft).not.toHaveBeenCalled();
  });

  it.each([
    ['draft_confirmation_conflict', 409],
    ['draft_repository_invalid', 400],
    ['draft_target_invalid', 400],
    ['draft_confirmation_failed', 500],
  ] as const)('maps confirmation outcome %s to a stable HTTP status', async (code, status) => {
    const dependencies = deps({
      confirmDraft: vi.fn().mockRejectedValue(new Error(code)),
    });
    const response = await createManageAiOrganizationHandler(dependencies)(
      request({
        action: 'confirm',
        draftId: 'draft-1',
        expectedRevision: 4,
        suggestions: draft.suggestions,
      }),
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: code });
  });

  it('rejects malformed review changes before the service boundary', async () => {
    const dependencies = deps();
    const handler = createManageAiOrganizationHandler(dependencies);
    expect(
      (
        await handler(
          request({
            action: 'update-review',
            expectedRevision: 0,
            change: { kind: 'relation', suggestionId: 'relation-1', selected: false },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          request({
            action: 'update-review',
            expectedRevision: 1,
            change: { kind: 'classification', suggestionId: '', approved: true },
          }),
        )
      ).status,
    ).toBe(400);
    expect(dependencies.updateReview).not.toHaveBeenCalled();
  });

  it('rejects authentication failures and independently enforces the 1–50 unique scope', async () => {
    const dependencies = deps();
    const handler = createManageAiOrganizationHandler(dependencies);
    expect((await handler(request({ action: 'read' }, false))).status).toBe(401);
    expect((await handler(request({ action: 'generate', repoIds: [] }))).status).toBe(400);
    expect(
      (
        await handler(
          request({ action: 'generate', repoIds: Array.from({ length: 51 }, (_, i) => `r-${i}`) }),
        )
      ).status,
    ).toBe(400);
    expect((await handler(request({ action: 'generate', repoIds: ['r-1', 'r-1'] }))).status).toBe(
      400,
    );
    expect(dependencies.generateDraft).not.toHaveBeenCalled();
  });
});
