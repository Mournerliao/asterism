import { describe, expect, it } from 'vitest';
import {
  buildCandidateSnapshot,
  buildGenerationManifest,
  OrganizationTaskDomainError,
  transitionOrganizationTask,
} from './organization-task';

const repositories = [
  {
    id: 'repo-1',
    fullName: 'acme/agent-kit',
    description: 'TypeScript tools for coding agents',
    language: 'TypeScript',
    topics: ['agents', 'developer-tools'],
    archived: false,
    starredAt: '2026-07-27T00:00:00.000Z',
    tags: [],
    collections: [],
    note: null,
    derivedEmbedding: {
      model: 'multilingual-e5-small',
      contentHash: 'derived-1',
      vector: [1, 0],
    },
  },
  {
    id: 'repo-2',
    fullName: 'acme/css-kit',
    description: 'A small CSS toolkit',
    language: 'CSS',
    topics: ['css'],
    archived: false,
    starredAt: '2026-07-26T00:00:00.000Z',
    tags: [{ id: 'tag-1', name: 'design' }],
    collections: [],
    note: 'Prefer for design systems',
    derivedEmbedding: {
      model: 'multilingual-e5-small',
      contentHash: 'derived-2',
      vector: [0.9, 0.1],
    },
  },
  {
    id: 'repo-3',
    fullName: 'acme/old-agent',
    description: 'Archived autonomous agent',
    language: 'Python',
    topics: ['agents'],
    archived: true,
    starredAt: '2024-01-01T00:00:00.000Z',
    tags: [],
    collections: [],
    note: null,
    derivedEmbedding: null,
  },
] as const;

describe('Organization Task domain', () => {
  it('accepts only legal compare-and-set lifecycle transitions', () => {
    expect(
      transitionOrganizationTask(
        { status: 'clarifying', revision: 3, endedAt: null },
        { expectedRevision: 3, to: 'discovering' },
      ),
    ).toEqual({ status: 'discovering', revision: 4, endedAt: null });

    expect(() =>
      transitionOrganizationTask(
        { status: 'clarifying', revision: 4, endedAt: null },
        { expectedRevision: 3, to: 'discovering' },
      ),
    ).toThrow(new OrganizationTaskDomainError('organization_task_conflict'));

    expect(() =>
      transitionOrganizationTask(
        {
          status: 'ended',
          revision: 5,
          endedAt: '2026-07-28T00:00:00.000Z',
        },
        { expectedRevision: 5, to: 'clarifying' },
      ),
    ).toThrow(new OrganizationTaskDomainError('organization_task_ended'));
  });

  it('discovers explained candidates from the complete authorized library deterministically', () => {
    const snapshot = buildCandidateSnapshot({
      taskId: 'task-1',
      revision: 2,
      goal: 'Organize my active agent developer tools',
      repositories,
      discoveryVersion: 'goal-metadata-v1',
    });

    expect(snapshot).toEqual({
      taskId: 'task-1',
      revision: 2,
      discoveryVersion: 'goal-metadata-v1',
      libraryCount: 3,
      candidateCount: 1,
      fingerprint: expect.any(String),
      items: [
        {
          repositoryId: 'repo-1',
          contentFingerprint: expect.stringMatching(/^fnv1a-/),
          included: true,
          reasons: [
            { kind: 'goal_term', value: 'agent' },
            { kind: 'goal_term', value: 'developer' },
            { kind: 'goal_term', value: 'tools' },
            { kind: 'unorganized' },
          ],
        },
      ],
    });
    expect(
      buildCandidateSnapshot({
        taskId: 'task-1',
        revision: 2,
        goal: 'Organize my active agent developer tools',
        repositories: [...repositories].reverse(),
        discoveryVersion: 'goal-metadata-v1',
      }),
    ).toEqual(snapshot);
  });

  it('treats optional precise context as an exact authorized scope', () => {
    const snapshot = buildCandidateSnapshot({
      taskId: 'task-context',
      revision: 1,
      goal: '整理最近同步的 GitHub Star',
      repositories,
      discoveryVersion: 'goal-metadata-derived-v2',
      contextRepositoryIds: ['repo-2'],
    });

    expect(snapshot.libraryCount).toBe(3);
    expect(snapshot.items.map((item) => item.repositoryId)).toEqual(['repo-2']);
    expect(snapshot.items[0]?.reasons).toContainEqual({ kind: 'precise_context' });
  });

  it('uses a compatible available derived goal signal without exposing vectors', () => {
    const snapshot = buildCandidateSnapshot({
      taskId: 'task-derived',
      revision: 1,
      goal: 'agentic developer workflow',
      repositories,
      discoveryVersion: 'goal-metadata-derived-v2',
      goalEmbedding: { model: 'multilingual-e5-small', vector: [1, 0] },
    });

    expect(snapshot.items.map((item) => item.repositoryId)).toEqual(['repo-1', 'repo-2']);
    expect(snapshot.items[1]?.reasons).toContainEqual({
      kind: 'derived_similarity',
      value: 0.994,
    });
    expect(JSON.stringify(snapshot)).not.toContain('"vector"');
  });

  it('creates an exact bounded Generation disclosure without Provider payloads', () => {
    const manifest = buildGenerationManifest({
      taskId: 'task-1',
      snapshotRevision: 4,
      repositoryIds: Array.from({ length: 101 }, (_, index) => `repo-${index + 1}`),
      connection: {
        id: 'connection-1',
        adapter: 'anthropic',
        model: 'claude-sonnet-4-5',
      },
      includeNotes: false,
      descriptionCodePointLimit: 1_000,
      noteCodePointLimit: 2_000,
      maxRetriesPerPage: 1,
      tokenCeilingPerCall: 128_000,
    });

    expect(manifest).toMatchObject({
      taskId: 'task-1',
      snapshotRevision: 4,
      candidateCount: 101,
      pageCount: 3,
      maxInitialCalls: 3,
      maxRetryCalls: 3,
      maxTotalCalls: 6,
      estimatedTokenCeiling: 768_000,
      monetaryCost: { kind: 'unknown' },
      fields: ['full_name', 'description', 'language', 'topics', 'tags', 'collections'],
      truncation: { descriptionCodePoints: 1_000, noteCodePoints: 0 },
      connection: {
        id: 'connection-1',
        adapter: 'anthropic',
        model: 'claude-sonnet-4-5',
      },
      fingerprint: expect.any(String),
    });
    expect(manifest.pages.map((page) => page.repositoryIds.length)).toEqual([50, 50, 1]);
    expect(JSON.stringify(manifest)).not.toMatch(/credential|readme/i);
  });

  it('uses time and status signals for a recent active-library goal', () => {
    const snapshot = buildCandidateSnapshot({
      taskId: 'task-2',
      revision: 1,
      goal: 'Organize my recent active Stars',
      repositories,
      discoveryVersion: 'goal-metadata-v1',
    });

    expect(snapshot.items.map((item) => item.repositoryId)).toEqual(['repo-1', 'repo-2']);
    expect(snapshot.items[0]?.reasons).toContainEqual({ kind: 'recently_starred' });
    expect(
      snapshot.items.every((item) => item.reasons.some((reason) => reason.kind !== 'archived')),
    ).toBe(true);
  });
});
