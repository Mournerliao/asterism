import { describe, expect, it, vi } from 'vitest';
import {
  type AiOrganizationDependencies,
  type AiOrganizationDraftView,
  createManageAiOrganizationHandler,
} from './handler';

const draft: AiOrganizationDraftView = {
  id: 'draft-1',
  sourceRepoIds: ['repo-1'],
  suggestions: { version: 1, relationChanges: [], newClassifications: [] },
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
