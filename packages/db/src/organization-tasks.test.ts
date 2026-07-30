import { describe, expect, it } from 'vitest';
import {
  isOrganizationOpportunity,
  isOrganizationTask,
  readOrganizationRunResponse,
  readOrganizationTaskResponse,
} from './organization-tasks';

const task = {
  id: 'task-1',
  origin: 'direct_goal',
  status: 'awaiting_generation_approval',
  goal: 'Organize agent tools',
  suggestedGoal: null,
  contextRepositoryIds: [],
  revision: 2,
  snapshot: {
    taskId: 'task-1',
    revision: 1,
    discoveryVersion: 'goal-metadata-v1',
    libraryCount: 2,
    candidateCount: 1,
    fingerprint: 'snapshot-1',
    items: [
      {
        repositoryId: 'repo-1',
        contentFingerprint: 'content-1',
        included: true,
        reasons: [
          { kind: 'goal_term', value: 'agent' },
          { kind: 'derived_similarity', value: 0.91 },
          { kind: 'unorganized' },
        ],
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
  generationRun: null,
  attentionCode: null,
  plans: [],
  endedAt: null,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
};

describe('Organization Task data-access trust boundary', () => {
  it('accepts only the strict safe task projection', () => {
    expect(isOrganizationTask(task)).toBe(true);
    expect(readOrganizationTaskResponse({ task })).toEqual(task);
    expect(isOrganizationTask({ ...task, status: 'running_provider' })).toBe(false);
    expect(isOrganizationTask({ ...task, credential: 'secret' })).toBe(false);
    expect(
      isOrganizationTask({
        ...task,
        manifest: { ...task.manifest, rawProviderPayload: { prompt: 'private' } },
      }),
    ).toBe(false);
  });

  it('accepts only no-cost opportunity projections', () => {
    expect(
      isOrganizationOpportunity({
        id: 'opportunity-1',
        kind: 'new_stars',
        repositoryCount: 7,
        status: 'available',
        createdAt: '2026-07-28T00:00:00.000Z',
      }),
    ).toBe(true);
    expect(
      isOrganizationOpportunity({
        id: 'opportunity-1',
        kind: 'new_stars',
        repositoryCount: 7,
        status: 'available',
        estimatedCost: 0,
        createdAt: '2026-07-28T00:00:00.000Z',
      }),
    ).toBe(false);
  });
});

describe('Organization Task generation run trust boundary', () => {
  const generationRun = {
    approvalTaskRevision: 3,
    pages: [{ key: 'page-1', index: 1, status: 'succeeded', attemptCount: 1, errorCode: null }],
    callsUsed: 1,
    maxTotalCalls: 2,
    tokensUsed: 160,
    estimatedTokenCeiling: 1400,
    maxAttemptsPerPage: 2,
  };
  const planSummary = {
    revision: 1,
    actionCount: 3,
    conflictCount: 0,
    uncertaintyCount: 1,
    preconditionFingerprint: 'precondition-1',
    fingerprint: 'plan-1',
    createdAt: '2026-07-28T00:00:00.000Z',
  };

  it('accepts resumable generation statuses', () => {
    for (const status of ['generating', 'generation_paused', 'needs_attention', 'plan_ready']) {
      expect(isOrganizationTask({ ...task, status })).toBe(true);
    }
  });

  it('accepts a task carrying an in-flight run and plan summaries', () => {
    expect(
      isOrganizationTask({
        ...task,
        status: 'generating',
        generationRun,
        attentionCode: 'call_ceiling',
        plans: [planSummary],
      }),
    ).toBe(true);
  });

  it('rejects a generation run leaking provider payloads', () => {
    expect(
      isOrganizationTask({ ...task, generationRun: { ...generationRun, rawPrompt: 'secret' } }),
    ).toBe(false);
  });

  it('rejects a plan summary with keys beyond the safe contract', () => {
    expect(
      isOrganizationTask({ ...task, plans: [{ ...planSummary, rawProviderPayload: {} }] }),
    ).toBe(false);
  });

  it('reads a valid run response and rejects unknown outcomes or leaked keys', () => {
    const run = { outcome: 'plan_ready', planRevision: 1 };
    expect(readOrganizationRunResponse({ task, run })).toEqual({ task, run });
    expect(() => readOrganizationRunResponse({ task, run: { outcome: 'exploded' } })).toThrow();
    expect(() =>
      readOrganizationRunResponse({ task, run: { outcome: 'plan_ready', secret: 'x' } }),
    ).toThrow();
  });
});
