import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { OrganizationTaskDetailPage, OrganizationTasksPage } from './organization-tasks';

const db = vi.hoisted(() => ({
  listOrganizationTasks: vi.fn(),
  getOrganizationTask: vi.fn(),
  listOrganizationOpportunities: vi.fn(),
  createOrganizationTask: vi.fn(),
  approveOrganizationTaskGeneration: vi.fn(),
  getOrganizationPlanReview: vi.fn(),
  excludeOrganizationPlanAction: vi.fn(),
  reviewOrganizationPlanGroup: vi.fn(),
  confirmOrganizationPlan: vi.fn(),
  listBulkOperations: vi.fn(),
  invokeBulkOperation: vi.fn(),
  acceptOrganizationOpportunity: vi.fn(),
  ignoreOrganizationOpportunity: vi.fn(),
  listStarredRepos: vi.fn(),
}));

vi.mock('@asterism/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@asterism/db')>()),
  ...db,
}));

vi.mock('../auth/use-session', () => ({
  useSession: () => ({
    session: { user: { id: 'user-1' } },
    loading: false,
  }),
}));

const recoveredTask = {
  id: 'task-1',
  origin: 'direct_goal',
  status: 'awaiting_generation_approval',
  goal: 'Organize my agent tools',
  suggestedGoal: null,
  contextRepositoryIds: [],
  revision: 2,
  snapshot: {
    taskId: 'task-1',
    revision: 1,
    discoveryVersion: 'goal-metadata-v1',
    libraryCount: 500,
    candidateCount: 1,
    fingerprint: 'snapshot-1',
    items: [
      {
        repositoryId: 'repo-1',
        contentFingerprint: 'content-1',
        included: true,
        reasons: [{ kind: 'goal_term', value: 'agent' }, { kind: 'unorganized' }],
      },
    ],
  },
  manifest: {
    taskId: 'task-1',
    snapshotRevision: 1,
    candidateCount: 1,
    pageCount: 1,
    maxInitialCalls: 1,
    maxRetryCalls: 1,
    maxTotalCalls: 2,
    estimatedTokenCeiling: 1400,
    monetaryCost: { kind: 'unknown' },
    fields: ['full_name', 'description', 'language', 'topics', 'tags', 'collections'],
    truncation: { descriptionCodePoints: 1000, noteCodePoints: 0 },
    connection: { id: 'connection-1', adapter: 'openai', model: 'gpt-5-mini' },
    pages: [{ key: 'page-1', index: 1, repositoryIds: ['repo-1'] }],
    fingerprint: 'manifest-1',
  },
  generationApproval: null,
  messages: [],
  endedAt: null,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
} as const;

const planReadyTask = {
  ...recoveredTask,
  status: 'plan_ready',
  revision: 5,
  generationApproval: {
    revision: 3,
    manifestFingerprint: 'manifest-1',
    approvedAt: '2026-08-04T00:00:00.000Z',
  },
  generationRun: {
    approvalTaskRevision: 3,
    pages: [{ key: 'page-1', index: 1, status: 'succeeded', attemptCount: 1, errorCode: null }],
    callsUsed: 1,
    maxTotalCalls: 2,
    tokensUsed: 300,
    estimatedTokenCeiling: 1400,
    maxAttemptsPerPage: 2,
  },
  plans: [
    {
      revision: 1,
      actionCount: 3,
      conflictCount: 1,
      uncertaintyCount: 1,
      preconditionFingerprint: 'precondition-1',
      fingerprint: 'plan-1',
      createdAt: '2026-08-04T00:00:00.000Z',
    },
  ],
  execution: null,
} as const;

const review = {
  version: 1,
  taskId: 'task-1',
  planRevision: 1,
  planFingerprint: 'plan-1',
  groups: [
    {
      key: 'existing-add',
      sourceGroupKey: 'source-1',
      risk: 'existing_addition',
      relationType: 'tag',
      target: { kind: 'existing', id: 'tag-1', name: 'Agent tools' },
      normalizedName: 'Agent tools',
      representativeRepositoryIds: ['repo-1'],
      equivalentTarget: null,
      nearMatches: [],
      fingerprint: 'fingerprint-add',
      approved: true,
      validity: 'valid',
      actions: [
        {
          id: 'action-add',
          repoId: 'repo-1',
          relationType: 'tag',
          action: 'add',
          target: { kind: 'existing', id: 'tag-1', name: 'Agent tools' },
          risk: 'low',
          evidencePages: [1],
          repositoryName: 'acme/agent-kit',
          excluded: false,
          eligible: true,
        },
      ],
    },
    {
      key: 'new-classification',
      sourceGroupKey: 'source-2',
      risk: 'new_classification',
      relationType: 'collection',
      target: { kind: 'new', name: 'Read later' },
      normalizedName: 'Read later',
      representativeRepositoryIds: ['repo-1'],
      equivalentTarget: null,
      nearMatches: [],
      fingerprint: 'fingerprint-new',
      approved: false,
      validity: 'valid',
      actions: [
        {
          id: 'action-new',
          repoId: 'repo-1',
          relationType: 'collection',
          action: 'add',
          target: { kind: 'new', name: 'Read later' },
          risk: 'medium',
          evidencePages: [1],
          repositoryName: 'acme/agent-kit',
          excluded: false,
          eligible: false,
        },
      ],
    },
    {
      key: 'removal',
      sourceGroupKey: 'source-3',
      risk: 'removal',
      relationType: 'tag',
      target: { kind: 'existing', id: 'tag-2', name: 'Old' },
      normalizedName: 'Old',
      representativeRepositoryIds: ['repo-1'],
      equivalentTarget: null,
      nearMatches: [],
      fingerprint: 'fingerprint-remove',
      approved: false,
      validity: 'valid',
      actions: [
        {
          id: 'action-remove',
          repoId: 'repo-1',
          relationType: 'tag',
          action: 'remove',
          target: { kind: 'existing', id: 'tag-2', name: 'Old' },
          risk: 'high',
          evidencePages: [1],
          repositoryName: 'acme/agent-kit',
          excluded: false,
          eligible: false,
        },
      ],
    },
  ],
  conflicts: [
    {
      kind: 'near_duplicate_names',
      relationType: 'tag',
      names: ['CLI', 'cli'],
      repoIds: ['repo-1'],
      evidencePages: [1],
    },
  ],
  uncertainties: [{ detail: { kind: 'unknown_repository', repoId: 'foreign' }, pageIndexes: [1] }],
  counts: { newClassifications: 0, additions: 1, removals: 0, noOps: 4 },
  confirmable: true,
  approvedGroupFingerprints: ['fingerprint-add'],
} as const;

let container: HTMLDivElement;
let root: Root;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/organization" element={<OrganizationTasksPage />} />
            <Route path="/organization/tasks/:taskId" element={<OrganizationTaskDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  db.listOrganizationTasks.mockResolvedValue([]);
  db.listOrganizationOpportunities.mockResolvedValue([]);
  db.getOrganizationTask.mockResolvedValue(recoveredTask);
  db.createOrganizationTask.mockResolvedValue(recoveredTask);
  db.approveOrganizationTaskGeneration.mockResolvedValue({
    ...recoveredTask,
    status: 'generation_approved',
  });
  db.acceptOrganizationOpportunity.mockResolvedValue(recoveredTask);
  db.ignoreOrganizationOpportunity.mockResolvedValue(true);
  db.getOrganizationPlanReview.mockResolvedValue(review);
  db.excludeOrganizationPlanAction.mockResolvedValue(review);
  db.reviewOrganizationPlanGroup.mockResolvedValue(review);
  db.confirmOrganizationPlan.mockResolvedValue({
    task: {
      ...planReadyTask,
      status: 'executing',
      execution: {
        operationId: 'operation-1',
        operationStatus: 'pending',
        succeeded: 0,
        retryableFailed: 0,
        terminalFailed: 0,
        dismissed: 0,
        pending: 1,
        running: 0,
        total: 1,
      },
    },
    operationId: 'operation-1',
  });
  db.listBulkOperations.mockResolvedValue([]);
  db.listStarredRepos.mockResolvedValue([
    {
      repoId: 'repo-1',
      repo: { fullName: 'acme/agent-kit' },
      starredAt: '2026-07-27T00:00:00.000Z',
    },
  ]);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe('Organization Task pages', () => {
  it('creates a task from a direct goal without requiring repositories', async () => {
    await render('/organization');
    const textarea = container.querySelector('textarea');
    expect(textarea?.getAttribute('aria-label')).toBe('Organization goal');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, 'Clean up my new agent Stars');
      textarea?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const button = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Create task'),
    );
    await act(async () => button?.click());

    expect(db.createOrganizationTask).toHaveBeenCalledWith(expect.anything(), {
      goal: 'Clean up my new agent Stars',
      contextRepositoryIds: [],
    });
  });

  it('recovers a fixed disclosure on the stable task route and approves it explicitly', async () => {
    await render('/organization/tasks/task-1');
    expect(container.textContent).toContain('Organize my agent tools');
    expect(container.textContent).toContain('1 candidate');
    expect(container.textContent).toContain('OpenAI');
    expect(container.textContent).toContain('gpt-5-mini');
    expect(container.textContent).toContain('Monetary cost unknown');

    const approve = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Approve Generation'),
    );
    await act(async () => approve?.click());
    expect(db.approveOrganizationTaskGeneration).toHaveBeenCalledWith(expect.anything(), {
      taskId: 'task-1',
      expectedRevision: 2,
    });
  });

  it('localizes an Opportunity at render time and persists that goal on acceptance', async () => {
    db.listOrganizationOpportunities.mockResolvedValue([
      {
        id: 'opportunity-1',
        kind: 'new_stars',
        repositoryCount: 7,
        status: 'available',
        createdAt: '2026-07-28T00:00:00.000Z',
      },
    ]);
    await render('/organization');
    expect(container.textContent).toContain('Organize my 7 newly synced GitHub Stars');
    const accept = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Plan this goal'),
    );
    await act(async () => accept?.click());
    expect(db.acceptOrganizationOpportunity).toHaveBeenCalledWith(expect.anything(), {
      opportunityId: 'opportunity-1',
      goal: 'Organize my 7 newly synced GitHub Stars',
    });
  });

  it('reloads authoritative task state after a stale-tab approval conflict', async () => {
    db.approveOrganizationTaskGeneration.mockRejectedValueOnce(
      new Error('organization_task_conflict'),
    );
    await render('/organization/tasks/task-1');
    const approve = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Approve Generation'),
    );
    await act(async () => {
      approve?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(db.getOrganizationTask.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain('changed in another tab');
  });

  it('shows a safe failed-page diagnosis and the durable retry budget', async () => {
    db.getOrganizationTask.mockResolvedValue({
      ...recoveredTask,
      status: 'needs_attention',
      revision: 5,
      attentionCode: 'page_failed',
      generationRun: {
        approvalTaskRevision: 3,
        pages: [
          {
            key: 'page-1',
            index: 1,
            status: 'failed',
            attemptCount: 1,
            errorCode: 'provider_output_truncated',
          },
        ],
        callsUsed: 1,
        maxTotalCalls: 2,
        tokensUsed: 13_192,
        estimatedTokenCeiling: 256_000,
        maxAttemptsPerPage: 2,
      },
    });

    await render('/organization/tasks/task-1');

    expect(container.textContent).toContain('Page 1 of 1 failed');
    expect(container.textContent).toContain('reached its output limit');
    expect(container.textContent).toContain('Attempt 1 of 2');
    expect(container.textContent).toContain('provider_output_truncated');
    expect(container.textContent).toContain('Retry page');
  });

  it('does not offer another retry after a page exhausts its approved attempts', async () => {
    db.getOrganizationTask.mockResolvedValue({
      ...recoveredTask,
      status: 'needs_attention',
      revision: 6,
      attentionCode: 'page_failed',
      generationRun: {
        approvalTaskRevision: 3,
        pages: [
          {
            key: 'page-1',
            index: 1,
            status: 'failed',
            attemptCount: 2,
            errorCode: 'provider_call_failed',
          },
        ],
        callsUsed: 2,
        maxTotalCalls: 2,
        tokensUsed: 0,
        estimatedTokenCeiling: 256_000,
        maxAttemptsPerPage: 2,
      },
    });

    await render('/organization/tasks/task-1');

    expect(container.textContent).toContain('Every approved retry for a page has been used');
    expect(container.textContent).toContain('Attempt 2 of 2');
    expect(container.textContent).not.toContain('Retry page');
  });

  it('reviews all risk tiers, exposes repository evidence, and confirms exact displayed effects', async () => {
    db.getOrganizationTask.mockResolvedValue(planReadyTask);
    await render('/organization/tasks/task-1');

    expect(container.textContent).toContain('Review Organization Plan');
    expect(container.textContent).toContain('Add to existing classifications');
    expect(container.textContent).toContain('Proposed new classifications');
    expect(container.textContent).toContain('Remove existing relationships');
    expect(container.textContent).toContain('No operation');
    expect(container.textContent).toContain(
      'Repository foreign is outside the fixed authorized scope. Evidence pages: 1.',
    );
    expect(container.querySelector('details')?.textContent).toContain('acme/agent-kit');
    const newGroup = container.querySelector('section[aria-labelledby] h4[id]')?.closest('section');
    expect(newGroup?.getAttribute('aria-labelledby')).toBe(newGroup?.querySelector('h4')?.id);
    expect(
      container.querySelector('button[aria-label="Approve new classification: Read later"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Exclude repository: acme/agent-kit"]'),
    ).not.toBeNull();
    expect(container.querySelector('dl[aria-live="polite"][aria-atomic="true"]')).not.toBeNull();

    const approveNew = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Approve new classification'),
    );
    await act(async () => {
      approveNew?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(db.reviewOrganizationPlanGroup).toHaveBeenCalledWith(expect.anything(), {
      taskId: 'task-1',
      expectedRevision: 5,
      planRevision: 1,
      groupKey: 'new-classification',
      groupFingerprint: 'fingerprint-new',
      approved: true,
    });

    const confirm = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Confirm exact plan'),
    );
    await act(async () => {
      confirm?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(db.confirmOrganizationPlan).toHaveBeenCalledWith(expect.anything(), {
      taskId: 'task-1',
      expectedRevision: 5,
      planRevision: 1,
      planFingerprint: 'plan-1',
      groupFingerprints: ['fingerprint-add'],
      counts: { newClassifications: 0, additions: 1, removals: 0, noOps: 4 },
    });
  });

  it('resumes the linked bounded executor from the stable task route after recovery', async () => {
    const operation = {
      id: 'operation-1',
      source: 'organization_task',
      sourceRepoIds: ['repo-1'],
      status: 'pending',
      completedAt: null,
      createdAt: '2026-08-04T00:00:00.000Z',
      updatedAt: '2026-08-04T00:00:00.000Z',
      items: [
        {
          id: 'item-1',
          repoId: 'repo-1',
          relationType: 'tag',
          targetId: 'tag-1',
          action: 'add',
          status: 'pending',
          attemptCount: 0,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      ],
    } as const;
    const executionTask = {
      ...planReadyTask,
      status: 'executing',
      revision: 6,
      execution: {
        operationId: 'operation-1',
        operationStatus: 'pending',
        succeeded: 0,
        retryableFailed: 0,
        terminalFailed: 0,
        dismissed: 0,
        pending: 1,
        running: 0,
        total: 1,
      },
    } as const;
    db.getOrganizationTask.mockResolvedValue(executionTask);
    db.listBulkOperations.mockResolvedValue([operation]);
    db.invokeBulkOperation.mockResolvedValueOnce(operation).mockResolvedValueOnce({
      ...operation,
      status: 'completed',
      completedAt: '2026-08-04T00:01:00.000Z',
      items: [{ ...operation.items[0], status: 'succeeded', attemptCount: 1 }],
    });

    await render('/organization/tasks/task-1');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('Organization execution');
    expect(db.invokeBulkOperation).toHaveBeenNthCalledWith(1, expect.anything(), {
      action: 'get',
      operationId: 'operation-1',
    });
    expect(db.invokeBulkOperation).toHaveBeenNthCalledWith(2, expect.anything(), {
      action: 'execute',
      operationId: 'operation-1',
    });
  });
});
// @vitest-environment happy-dom
