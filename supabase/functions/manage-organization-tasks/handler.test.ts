import { describe, expect, it, vi } from 'vitest';
import {
  createManageOrganizationTasksHandler,
  type OrganizationTaskHttpDependencies,
} from './handler';

const task = {
  id: 'task-1',
  origin: 'direct_goal' as const,
  status: 'clarifying' as const,
  goal: 'Organize my agent tools',
  suggestedGoal: null,
  contextRepositoryIds: [],
  revision: 1,
  snapshot: null,
  manifest: null,
  generationApproval: null,
  messages: [],
  endedAt: null,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
};

function dependencies(
  overrides: Partial<OrganizationTaskHttpDependencies> = {},
): OrganizationTaskHttpDependencies {
  return {
    authenticate: vi.fn().mockResolvedValue('user-1'),
    createTask: vi.fn().mockResolvedValue(task),
    listTasks: vi.fn().mockResolvedValue([task]),
    getTask: vi.fn().mockResolvedValue(task),
    updateGoal: vi.fn().mockResolvedValue({ ...task, revision: 2 }),
    discover: vi.fn().mockResolvedValue({
      ...task,
      status: 'awaiting_generation_approval',
      revision: 2,
    }),
    excludeCandidate: vi.fn().mockResolvedValue({ ...task, revision: 2 }),
    approveGeneration: vi.fn().mockResolvedValue({
      ...task,
      status: 'generation_approved',
      revision: 2,
    }),
    endTask: vi.fn().mockResolvedValue({ ...task, status: 'ended', revision: 2 }),
    listOpportunities: vi.fn().mockResolvedValue([]),
    acceptOpportunity: vi.fn().mockResolvedValue(task),
    ignoreOpportunity: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function request(body: unknown, authorized = true): Request {
  return new Request('https://example.test/manage-organization-tasks', {
    method: 'POST',
    headers: {
      ...(authorized ? { Authorization: 'Bearer jwt' } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('Organization Task trusted HTTP lifecycle', () => {
  it('creates a direct-goal task without a repository preselection', async () => {
    const deps = dependencies();
    const response = await createManageOrganizationTasksHandler(deps)(
      request({ action: 'create', goal: 'Organize my agent tools' }),
    );

    expect(response.status).toBe(200);
    expect(deps.createTask).toHaveBeenCalledWith('user-1', {
      goal: 'Organize my agent tools',
      contextRepositoryIds: [],
    });
    await expect(response.json()).resolves.toEqual({ task });
  });

  it('routes every revisioned checkpoint through authenticated ownership scope', async () => {
    const deps = dependencies();
    const handler = createManageOrganizationTasksHandler(deps);

    expect(
      (
        await handler(
          request({
            action: 'update-goal',
            taskId: 'task-1',
            expectedRevision: 2,
            goal: 'Clarified goal',
            message: 'Keep archived repositories out',
          }),
        )
      ).status,
    ).toBe(200);
    expect(deps.updateGoal).toHaveBeenCalledWith('user-1', {
      taskId: 'task-1',
      expectedRevision: 2,
      goal: 'Clarified goal',
      message: 'Keep archived repositories out',
    });

    await handler(request({ action: 'discover', taskId: 'task-1', expectedRevision: 3 }));
    expect(deps.discover).toHaveBeenCalledWith('user-1', {
      taskId: 'task-1',
      expectedRevision: 3,
      goalEmbedding: null,
    });

    await handler(
      request({
        action: 'exclude',
        taskId: 'task-1',
        expectedRevision: 4,
        repositoryId: 'repo-1',
        excluded: true,
      }),
    );
    expect(deps.excludeCandidate).toHaveBeenCalledWith('user-1', {
      taskId: 'task-1',
      expectedRevision: 4,
      repositoryId: 'repo-1',
      excluded: true,
    });

    await handler(request({ action: 'approve-generation', taskId: 'task-1', expectedRevision: 5 }));
    expect(deps.approveGeneration).toHaveBeenCalledWith('user-1', {
      taskId: 'task-1',
      expectedRevision: 5,
    });

    await handler(request({ action: 'end', taskId: 'task-1', expectedRevision: 6 }));
    expect(deps.endTask).toHaveBeenCalledWith('user-1', {
      taskId: 'task-1',
      expectedRevision: 6,
    });
  });

  it('accepts or ignores a no-cost opportunity explicitly', async () => {
    const deps = dependencies();
    const handler = createManageOrganizationTasksHandler(deps);

    await handler(
      request({
        action: 'accept-opportunity',
        opportunityId: 'opportunity-1',
        goal: 'Organize my new Stars',
      }),
    );
    expect(deps.acceptOpportunity).toHaveBeenCalledWith(
      'user-1',
      'opportunity-1',
      'Organize my new Stars',
    );
    await handler(request({ action: 'ignore-opportunity', opportunityId: 'opportunity-1' }));
    expect(deps.ignoreOpportunity).toHaveBeenCalledWith('user-1', 'opportunity-1');
  });

  it('returns stable authentication, validation, ownership and CAS errors', async () => {
    const handler = createManageOrganizationTasksHandler(dependencies());
    expect((await handler(request({ action: 'list' }, false))).status).toBe(401);
    expect((await handler(request({ action: 'create', goal: '' }))).status).toBe(400);

    const conflict = createManageOrganizationTasksHandler(
      dependencies({
        discover: vi.fn().mockRejectedValue(new Error('organization_task_conflict')),
      }),
    );
    const conflictResponse = await conflict(
      request({ action: 'discover', taskId: 'task-1', expectedRevision: 1 }),
    );
    expect(conflictResponse.status).toBe(409);
    await expect(conflictResponse.json()).resolves.toEqual({
      error: 'organization_task_conflict',
    });

    const missing = createManageOrganizationTasksHandler(
      dependencies({
        getTask: vi.fn().mockRejectedValue(new Error('organization_task_not_found')),
      }),
    );
    expect((await missing(request({ action: 'read', taskId: 'task-missing' }))).status).toBe(404);
  });
});
