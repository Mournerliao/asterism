import { describe, expect, it, vi } from 'vitest';
import {
  buildOrganizationRepositoryContentFingerprint,
  type OrganizationDiscoveryRepository,
  type OrganizationTaskView,
} from '../../../packages/core/src/ai/organization-task';
import {
  createOrganizationTaskService,
  type GenerationPageClaim,
  type OrganizationTaskServiceDependencies,
} from './service';

const task: OrganizationTaskView = {
  id: 'task-1',
  origin: 'direct_goal',
  status: 'clarifying',
  goal: 'Group active agent tools',
  suggestedGoal: null,
  contextRepositoryIds: [],
  revision: 1,
  snapshot: null,
  manifest: null,
  generationApproval: null,
  generationRun: null,
  attentionCode: null,
  plans: [],
  messages: [],
  endedAt: null,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
};

function dependencies(
  overrides: Partial<OrganizationTaskServiceDependencies> = {},
): OrganizationTaskServiceDependencies {
  return {
    createTask: vi.fn().mockResolvedValue(task),
    listTasks: vi.fn().mockResolvedValue([task]),
    getTask: vi.fn().mockResolvedValue(task),
    updateGoalCas: vi.fn().mockResolvedValue({ ...task, revision: 2 }),
    loadAuthorizedLibrary: vi.fn().mockResolvedValue([
      {
        id: 'repo-1',
        fullName: 'acme/agent-kit',
        description: 'Tools for coding agents',
        language: 'TypeScript',
        topics: ['agents'],
        archived: false,
        starredAt: '2026-07-27T00:00:00.000Z',
        tags: [],
        collections: [],
        note: null,
        derivedEmbedding: null,
      },
      {
        id: 'repo-2',
        fullName: 'acme/css-kit',
        description: 'CSS utilities',
        language: 'CSS',
        topics: ['css'],
        archived: false,
        starredAt: '2026-07-26T00:00:00.000Z',
        tags: [],
        collections: [],
        note: null,
        derivedEmbedding: null,
      },
    ]),
    beginDiscoveryCas: vi.fn().mockResolvedValue({
      ...task,
      status: 'discovering',
      revision: 2,
    }),
    loadGenerationDisclosure: vi.fn().mockResolvedValue({
      connection: { id: 'connection-1', adapter: 'openai', model: 'gpt-5-mini' },
      includeNotes: false,
    }),
    persistDiscoveryCas: vi.fn().mockImplementation(async (_userId, input) => ({
      ...task,
      status: 'awaiting_generation_approval',
      revision: input.expectedRevision + 1,
      snapshot: input.snapshot,
      manifest: input.manifest,
    })),
    persistExclusionCas: vi.fn().mockImplementation(async (_userId, input) => ({
      ...task,
      status: 'awaiting_generation_approval',
      revision: task.revision + 1,
      snapshot: input.snapshot,
      manifest: input.manifest,
    })),
    persistApprovalCas: vi.fn().mockImplementation(async (_userId, input) => ({
      ...task,
      status: 'generation_approved',
      revision: task.revision + 1,
      generationApproval: {
        revision: task.revision + 1,
        manifestFingerprint: input.manifestFingerprint,
        approvedAt: '2026-07-28T00:00:00.000Z',
      },
    })),
    persistEndCas: vi.fn().mockResolvedValue({
      ...task,
      status: 'ended',
      revision: 2,
      endedAt: '2026-07-28T00:00:00.000Z',
    }),
    listOpportunities: vi.fn().mockResolvedValue([]),
    acceptOpportunity: vi.fn().mockResolvedValue(task),
    ignoreOpportunity: vi.fn().mockResolvedValue(true),
    startGenerationCas: vi.fn().mockResolvedValue({ ...task, status: 'generating', revision: 2 }),
    pauseGenerationCas: vi
      .fn()
      .mockResolvedValue({ ...task, status: 'generation_paused', revision: 2 }),
    resumeGenerationCas: vi.fn().mockResolvedValue({ ...task, status: 'generating', revision: 2 }),
    retryGenerationRpc: vi.fn().mockResolvedValue({ outcome: 'retrying' }),
    flagGenerationAttention: vi.fn().mockResolvedValue(true),
    claimGenerationPage: vi.fn().mockResolvedValue({ outcome: 'complete' }),
    completeGenerationPage: vi.fn().mockResolvedValue({ outcome: 'accepted' }),
    loadGenerationPageContext: vi
      .fn()
      .mockResolvedValue({ repositories: [], contentFingerprints: {}, tags: [], collections: [] }),
    callGenerationPage: vi.fn().mockResolvedValue({ ok: true, status: 200, body: {} }),
    loadPlanMergeContext: vi.fn().mockResolvedValue({
      nextPlanRevision: 1,
      pages: [],
      existingTags: [],
      existingCollections: [],
      preconditions: {
        snapshotFingerprint: '',
        manifestFingerprint: '',
        candidateFingerprints: [],
      },
    }),
    savePlan: vi.fn().mockResolvedValue({ outcome: 'saved', planRevision: 1 }),
    readPlan: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('Organization Task authoritative service', () => {
  it('discovers against the complete authorized library and fixes a disclosed snapshot', async () => {
    const deps = dependencies();
    const result = await createOrganizationTaskService(deps).discover('user-1', {
      taskId: 'task-1',
      expectedRevision: 1,
    });

    expect(deps.loadAuthorizedLibrary).toHaveBeenCalledWith('user-1');
    expect(deps.persistDiscoveryCas).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ taskId: 'task-1', expectedRevision: 2 }),
    );
    expect(result.snapshot?.libraryCount).toBe(2);
    expect(result.snapshot?.items.map((item) => item.repositoryId)).toEqual(['repo-1']);
    expect(result.manifest).toMatchObject({
      candidateCount: 1,
      pageCount: 1,
      maxInitialCalls: 1,
      maxRetryCalls: 1,
      fields: ['full_name', 'description', 'language', 'topics', 'tags', 'collections'],
    });
    expect(JSON.stringify(result)).not.toMatch(/credential|readme/i);
  });

  it('regenerates exact counts from an immutable exclusion revision', async () => {
    const discovered = await createOrganizationTaskService(dependencies()).discover('user-1', {
      taskId: 'task-1',
      expectedRevision: 1,
    });
    const deps = dependencies({
      getTask: vi.fn().mockResolvedValue(discovered),
    });

    const result = await createOrganizationTaskService(deps).excludeCandidate('user-1', {
      taskId: 'task-1',
      expectedRevision: discovered.revision,
      repositoryId: 'repo-1',
      excluded: true,
    });

    expect(result.snapshot?.revision).toBe(2);
    expect(result.snapshot?.candidateCount).toBe(0);
    expect(result.manifest).toBeNull();
    expect(discovered.snapshot?.items[0]?.included).toBe(true);
  });

  it('binds approval to the current manifest and preserves newer state on CAS conflict', async () => {
    const discovered = await createOrganizationTaskService(dependencies()).discover('user-1', {
      taskId: 'task-1',
      expectedRevision: 1,
    });
    const approved = await createOrganizationTaskService(
      dependencies({ getTask: vi.fn().mockResolvedValue(discovered) }),
    ).approveGeneration('user-1', {
      taskId: 'task-1',
      expectedRevision: discovered.revision,
    });
    expect(approved.generationApproval?.manifestFingerprint).toBe(discovered.manifest?.fingerprint);

    const conflict = dependencies({
      getTask: vi.fn().mockResolvedValue(discovered),
      persistApprovalCas: vi.fn().mockResolvedValue(null),
    });
    await expect(
      createOrganizationTaskService(conflict).approveGeneration('user-1', {
        taskId: 'task-1',
        expectedRevision: discovered.revision,
      }),
    ).rejects.toThrow('organization_task_conflict');
  });

  it('revalidates candidate authorization before Generation approval', async () => {
    const discovered = await createOrganizationTaskService(dependencies()).discover('user-1', {
      taskId: 'task-1',
      expectedRevision: 1,
    });
    const deps = dependencies({
      getTask: vi.fn().mockResolvedValue(discovered),
      loadAuthorizedLibrary: vi.fn().mockResolvedValue([]),
    });

    await expect(
      createOrganizationTaskService(deps).approveGeneration('user-1', {
        taskId: 'task-1',
        expectedRevision: discovered.revision,
      }),
    ).rejects.toThrow('organization_candidate_authorization_changed');
    expect(deps.persistApprovalCas).not.toHaveBeenCalled();
  });

  it('rejects approval when a disclosed canonical relationship changed', async () => {
    const original = dependencies();
    const discovered = await createOrganizationTaskService(original).discover('user-1', {
      taskId: 'task-1',
      expectedRevision: 1,
    });
    const library = await original.loadAuthorizedLibrary('user-1');
    const deps = dependencies({
      getTask: vi.fn().mockResolvedValue(discovered),
      loadAuthorizedLibrary: vi
        .fn()
        .mockResolvedValue([
          { ...library[0], tags: [{ id: 'new-tag', name: 'changed' }] },
          library[1],
        ]),
    });

    await expect(
      createOrganizationTaskService(deps).approveGeneration('user-1', {
        taskId: 'task-1',
        expectedRevision: discovered.revision,
      }),
    ).rejects.toThrow('organization_candidate_authorization_changed');
    expect(deps.persistApprovalCas).not.toHaveBeenCalled();
  });

  it('keeps ended tasks read-only', async () => {
    const deps = dependencies({
      getTask: vi.fn().mockResolvedValue({ ...task, status: 'ended', endedAt: 'now' }),
    });
    await expect(
      createOrganizationTaskService(deps).updateGoal('user-1', {
        taskId: 'task-1',
        expectedRevision: 1,
        goal: 'Changed goal',
        message: null,
      }),
    ).rejects.toThrow('organization_task_ended');
    expect(deps.updateGoalCas).not.toHaveBeenCalled();
  });

  it('automates direct creation through discovery, recount, approval, recovery and end', async () => {
    let durable: OrganizationTaskView = { ...task, goal: 'Organize my active Stars' };
    const base = dependencies();
    const deps = dependencies({
      createTask: vi.fn().mockImplementation(async (_userId, input) => {
        durable = { ...durable, goal: input.goal };
        return durable;
      }),
      getTask: vi.fn().mockImplementation(async () => durable),
      beginDiscoveryCas: vi.fn().mockImplementation(async (_userId, input) => {
        if (durable.revision !== input.expectedRevision) return null;
        durable = { ...durable, status: 'discovering', revision: durable.revision + 1 };
        return durable;
      }),
      persistDiscoveryCas: vi.fn().mockImplementation(async (_userId, input) => {
        if (durable.revision !== input.expectedRevision) return null;
        durable = {
          ...durable,
          status: 'awaiting_generation_approval',
          revision: durable.revision + 1,
          snapshot: input.snapshot,
          manifest: input.manifest,
        };
        return durable;
      }),
      persistExclusionCas: vi.fn().mockImplementation(async (_userId, input) => {
        if (durable.revision !== input.expectedRevision) return null;
        durable = {
          ...durable,
          revision: durable.revision + 1,
          snapshot: input.snapshot,
          manifest: input.manifest,
        };
        return durable;
      }),
      persistApprovalCas: vi.fn().mockImplementation(async (_userId, input) => {
        if (durable.revision !== input.expectedRevision || !durable.manifest) return null;
        durable = {
          ...durable,
          status: 'generation_approved',
          revision: durable.revision + 1,
          generationApproval: {
            revision: durable.revision + 1,
            manifestFingerprint: input.manifestFingerprint,
            approvedAt: '2026-07-28T00:00:00.000Z',
          },
        };
        return durable;
      }),
      persistEndCas: vi.fn().mockImplementation(async (_userId, input) => {
        if (durable.revision !== input.expectedRevision) return null;
        durable = {
          ...durable,
          status: 'ended',
          revision: durable.revision + 1,
          endedAt: '2026-07-28T00:00:00.000Z',
        };
        return durable;
      }),
      loadAuthorizedLibrary: base.loadAuthorizedLibrary,
    });

    const firstTab = createOrganizationTaskService(deps);
    const created = await firstTab.createTask('user-1', {
      goal: 'Organize my active Stars',
      contextRepositoryIds: [],
    });
    const discovered = await firstTab.discover('user-1', {
      taskId: created.id,
      expectedRevision: created.revision,
    });
    expect(discovered.snapshot?.candidateCount).toBe(2);

    const recounted = await firstTab.excludeCandidate('user-1', {
      taskId: discovered.id,
      expectedRevision: discovered.revision,
      repositoryId: 'repo-2',
      excluded: true,
    });
    expect(recounted.snapshot?.candidateCount).toBe(1);
    expect(recounted.manifest?.candidateCount).toBe(1);

    const approved = await firstTab.approveGeneration('user-1', {
      taskId: recounted.id,
      expectedRevision: recounted.revision,
    });
    const recoveredAfterRefresh = await createOrganizationTaskService(deps).getTask(
      'user-1',
      approved.id,
    );
    expect(recoveredAfterRefresh.generationApproval?.manifestFingerprint).toBe(
      approved.manifest?.fingerprint,
    );

    await expect(
      firstTab.approveGeneration('user-1', {
        taskId: approved.id,
        expectedRevision: recounted.revision,
      }),
    ).rejects.toThrow('organization_task_conflict');

    const ended = await createOrganizationTaskService(deps).endTask('user-1', {
      taskId: approved.id,
      expectedRevision: approved.revision,
    });
    expect(ended.status).toBe('ended');
    await expect(
      firstTab.updateGoal('user-1', {
        taskId: ended.id,
        expectedRevision: ended.revision,
        goal: 'Cannot change',
        message: null,
      }),
    ).rejects.toThrow('organization_task_ended');
  });
});

const generatingTask: OrganizationTaskView = { ...task, status: 'generating', revision: 3 };

const sampleRepository: OrganizationDiscoveryRepository = {
  id: 'repo-1',
  fullName: 'acme/agent-kit',
  description: 'Tools for coding agents',
  language: 'TypeScript',
  topics: ['agents'],
  archived: false,
  starredAt: '2026-07-27T00:00:00.000Z',
  tags: [],
  collections: [],
  note: null,
  derivedEmbedding: null,
};

function claimedPage(overrides: Partial<GenerationPageClaim> = {}): GenerationPageClaim {
  return {
    outcome: 'claimed',
    callId: 'call-1',
    pageRunId: 'page-run-1',
    pageKey: 'page-0',
    pageIndex: 0,
    repoIds: ['repo-1'],
    attempt: 1,
    leaseId: 'lease-1',
    connectionId: 'connection-1',
    adapter: 'openai',
    model: 'gpt-5-mini',
    fields: ['full_name', 'description'],
    descriptionCodePointLimit: 1_000,
    noteCodePointLimit: 2_000,
    snapshotRevision: 2,
    manifestFingerprint: 'manifest-fp',
    ...overrides,
  };
}

function pageContextFor(repository: OrganizationDiscoveryRepository) {
  return {
    repositories: [repository],
    contentFingerprints: {
      [repository.id]: buildOrganizationRepositoryContentFingerprint(repository, {
        includeNotes: false,
        descriptionCodePointLimit: 1_000,
        noteCodePointLimit: 2_000,
      }),
    },
    tags: [],
    collections: [],
  };
}

function providerPage(payload: unknown) {
  return {
    ok: true,
    status: 200,
    body: {
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
    },
  };
}

describe('Organization Task generation page runner', () => {
  it('does not call the provider while generation is paused', async () => {
    const deps = dependencies({
      claimGenerationPage: vi
        .fn()
        .mockResolvedValue({ outcome: 'not_generating', status: 'generation_paused' }),
      getTask: vi.fn().mockResolvedValue({ ...generatingTask, status: 'generation_paused' }),
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run).toEqual({ outcome: 'not_generating', status: 'generation_paused' });
    expect(deps.callGenerationPage).not.toHaveBeenCalled();
    expect(deps.completeGenerationPage).not.toHaveBeenCalled();
  });

  it('yields to the in-flight owner without a duplicate provider call', async () => {
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue({ outcome: 'in_flight' }),
      getTask: vi.fn().mockResolvedValue(generatingTask),
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run.outcome).toBe('in_flight');
    expect(deps.callGenerationPage).not.toHaveBeenCalled();
    expect(deps.completeGenerationPage).not.toHaveBeenCalled();
  });

  it.each([
    ['call_ceiling', 'call_ceiling'],
    ['token_ceiling', 'token_ceiling'],
    ['exhausted', 'retry_exhausted'],
  ] as const)('routes %s to needs-attention', async (claimOutcome, attentionCode) => {
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue({ outcome: claimOutcome }),
      getTask: vi.fn().mockResolvedValue(generatingTask),
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run).toEqual({ outcome: 'attention', attentionCode });
    expect(deps.flagGenerationAttention).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ taskId: 'task-1', code: attentionCode }),
    );
    expect(deps.callGenerationPage).not.toHaveBeenCalled();
  });

  it('reports an already-finalized Plan without re-merging', async () => {
    const readyTask: OrganizationTaskView = {
      ...generatingTask,
      status: 'plan_ready',
      plans: [
        {
          revision: 3,
          actionCount: 0,
          conflictCount: 0,
          uncertaintyCount: 0,
          preconditionFingerprint: 'pre',
          fingerprint: 'fp',
          createdAt: '2026-07-28T00:00:00.000Z',
        },
      ],
    };
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue({ outcome: 'complete' }),
      getTask: vi.fn().mockResolvedValue(readyTask),
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run).toEqual({ outcome: 'plan_ready', planRevision: 3 });
    expect(deps.loadPlanMergeContext).not.toHaveBeenCalled();
    expect(deps.savePlan).not.toHaveBeenCalled();
  });

  it('deterministically merges accepted pages into an immutable Plan revision', async () => {
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue({ outcome: 'complete' }),
      getTask: vi.fn().mockResolvedValue(generatingTask),
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run).toEqual({ outcome: 'plan_ready', planRevision: 1 });
    expect(deps.savePlan).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ taskId: 'task-1', expectedRevision: generatingTask.revision }),
    );
  });

  it('fails the page and raises attention when candidate authorization drifts', async () => {
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue(claimedPage()),
      getTask: vi.fn().mockResolvedValue(generatingTask),
      loadGenerationPageContext: vi.fn().mockResolvedValue({
        repositories: [sampleRepository],
        contentFingerprints: { 'repo-1': 'stale-fingerprint' },
        tags: [],
        collections: [],
      }),
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run).toEqual({ outcome: 'attention', attentionCode: 'authorization_changed' });
    expect(deps.callGenerationPage).not.toHaveBeenCalled();
    expect(deps.completeGenerationPage).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        status: 'failed',
        errorCode: 'organization_candidate_authorization_changed',
        result: null,
      }),
    );
    expect(deps.flagGenerationAttention).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ code: 'authorization_changed' }),
    );
  });

  it('records a single failed attempt when the provider call throws', async () => {
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue(claimedPage()),
      getTask: vi.fn().mockResolvedValue(generatingTask),
      loadGenerationPageContext: vi.fn().mockResolvedValue(pageContextFor(sampleRepository)),
      callGenerationPage: vi.fn().mockRejectedValue(new Error('provider_timeout')),
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run).toEqual({ outcome: 'attention', attentionCode: 'page_failed' });
    expect(deps.completeGenerationPage).toHaveBeenCalledTimes(1);
    expect(deps.completeGenerationPage).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ status: 'failed', errorCode: 'provider_timeout' }),
    );
    expect(deps.flagGenerationAttention).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ code: 'page_failed' }),
    );
  });

  it('records a failed attempt when the provider responds with an error status', async () => {
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue(claimedPage()),
      getTask: vi.fn().mockResolvedValue(generatingTask),
      loadGenerationPageContext: vi.fn().mockResolvedValue(pageContextFor(sampleRepository)),
      callGenerationPage: vi.fn().mockResolvedValue({ ok: false, status: 500, body: {} }),
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run).toEqual({ outcome: 'attention', attentionCode: 'page_failed' });
    expect(deps.completeGenerationPage).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ status: 'failed', errorCode: 'provider_http_500' }),
    );
  });

  it('classifies a provider output ceiling separately from malformed JSON', async () => {
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue(claimedPage()),
      getTask: vi.fn().mockResolvedValue(generatingTask),
      loadGenerationPageContext: vi.fn().mockResolvedValue(pageContextFor(sampleRepository)),
      callGenerationPage: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          choices: [{ finish_reason: 'length', message: { content: '{"relationChanges":[' } }],
          usage: { prompt_tokens: 5000, completion_tokens: 8192, total_tokens: 13192 },
        },
      }),
    });

    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });

    expect(result.run).toEqual({ outcome: 'attention', attentionCode: 'page_failed' });
    expect(deps.completeGenerationPage).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        status: 'failed',
        errorCode: 'provider_output_truncated',
        usage: { inputTokens: 5000, outputTokens: 8192, totalTokens: 13192 },
      }),
    );
  });

  it('accepts a well-formed provider page exactly once with recorded usage', async () => {
    const complete = vi.fn().mockResolvedValue({ outcome: 'accepted' });
    const deps = dependencies({
      claimGenerationPage: vi.fn().mockResolvedValue(claimedPage()),
      getTask: vi.fn().mockResolvedValue(generatingTask),
      loadGenerationPageContext: vi.fn().mockResolvedValue(pageContextFor(sampleRepository)),
      callGenerationPage: vi
        .fn()
        .mockResolvedValue(providerPage({ newClassifications: [], relationChanges: [] })),
      completeGenerationPage: complete,
    });
    const result = await createOrganizationTaskService(deps).runGenerationPage('user-1', {
      taskId: 'task-1',
    });
    expect(result.run.outcome).toBe('page_succeeded');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        status: 'succeeded',
        callId: 'call-1',
        leaseId: 'lease-1',
        usage: { inputTokens: 120, outputTokens: 40, totalTokens: 160 },
        result: expect.objectContaining({
          version: 1,
          relationChanges: [],
          newClassifications: [],
        }),
      }),
    );
  });
});
