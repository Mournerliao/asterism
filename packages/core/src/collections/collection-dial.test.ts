import { describe, expect, it } from 'vitest';
import {
  collectionDialReducer,
  createCollectionDialPickup,
  createCollectionDialSnapshot,
  rankCollectionDialTargets,
} from './collection-dial';

const collections = [
  { id: 'z', name: 'Zulu', updatedAt: '2026-08-10T00:00:00.000Z' },
  { id: 'mru-old', name: 'Older MRU', updatedAt: '2026-08-01T00:00:00.000Z' },
  { id: 'already', name: 'Already there', updatedAt: '2026-08-13T00:00:00.000Z' },
  { id: 'a', name: 'Ａlpha', updatedAt: '2026-08-10T00:00:00.000Z' },
  { id: 'mru-new', name: 'Newer MRU', updatedAt: '2026-07-01T00:00:00.000Z' },
  { id: 'b', name: 'Beta', updatedAt: '2026-08-09T00:00:00.000Z' },
  { id: 'c', name: 'Charlie', updatedAt: '2026-08-08T00:00:00.000Z' },
  { id: 'd', name: 'Delta', updatedAt: '2026-08-07T00:00:00.000Z' },
  { id: 'e', name: 'Echo', updatedAt: '2026-08-06T00:00:00.000Z' },
  { id: 'f', name: 'Foxtrot', updatedAt: '2026-08-05T00:00:00.000Z' },
];

describe('Collection Dial target ranking', () => {
  it('excludes collections containing the full scope and returns at most seven stable targets', () => {
    expect(
      rankCollectionDialTargets({
        collections,
        collectionRepos: [
          { collectionId: 'already', repoId: 'repo-1' },
          { collectionId: 'already', repoId: 'repo-2' },
          { collectionId: 'z', repoId: 'repo-1' },
        ],
        repoIds: ['repo-1', 'repo-2'],
        sessionMru: ['mru-new', 'mru-old'],
      }).map((target) => target.id),
    ).toEqual(['mru-new', 'mru-old', 'a', 'z', 'b', 'c', 'd']);
  });

  it('uses normalized name and id as deterministic tie breakers', () => {
    expect(
      rankCollectionDialTargets({
        collections: [
          { id: '2', name: '  Alpha ', updatedAt: '2026-08-10T00:00:00.000Z' },
          { id: '1', name: 'ＡLPHA', updatedAt: '2026-08-10T00:00:00.000Z' },
        ],
        collectionRepos: [],
        repoIds: ['repo-1'],
        sessionMru: [],
      }).map((target) => target.id),
    ).toEqual(['1', '2']);
  });
});

describe('Collection Dial snapshot', () => {
  const catalog = [
    {
      id: 'frontend',
      name: 'Frontend',
      description: 'Web interfaces',
      updatedAt: '2026-08-10T00:00:00.000Z',
      repoCount: 2,
    },
    {
      id: 'systems',
      name: 'Systems',
      description: 'Low-level tools',
      updatedAt: '2026-08-09T00:00:00.000Z',
      repoCount: 2,
    },
    {
      id: 'owned',
      name: 'Already owned',
      description: null,
      updatedAt: '2026-08-11T00:00:00.000Z',
      repoCount: 2,
    },
  ];
  const memberships = [
    { collectionId: 'frontend', repoId: 'front-a' },
    { collectionId: 'frontend', repoId: 'front-b' },
    { collectionId: 'systems', repoId: 'system-a' },
    { collectionId: 'systems', repoId: 'system-b' },
    { collectionId: 'owned', repoId: 'scope-a' },
    { collectionId: 'owned', repoId: 'scope-b' },
  ];
  const embeddings = [
    { repoId: 'front-a', vector: [1, 0] },
    { repoId: 'front-b', vector: [0.8, 0.2] },
    { repoId: 'system-a', vector: [0, 1] },
    { repoId: 'system-b', vector: [0.2, 0.8] },
  ];

  it('deduplicates and freezes the full scope while reporting partial membership', () => {
    const repoIds = ['scope-a', 'scope-a', 'scope-b'];
    const snapshot = createCollectionDialSnapshot({
      scopeId: 'scope-1',
      createdAt: '2026-08-14T00:00:00.000Z',
      repoIds,
      collections: catalog,
      collectionRepos: [...memberships, { collectionId: 'frontend', repoId: 'scope-a' }],
      sessionMru: [],
    });
    repoIds.push('late');

    expect(snapshot.repoIds).toEqual(['scope-a', 'scope-b']);
    expect(
      snapshot.entries.map(({ id, alreadyMemberCount, missingCount }) => ({
        id,
        alreadyMemberCount,
        missingCount,
      })),
    ).toEqual([
      { id: 'frontend', alreadyMemberCount: 1, missingCount: 1 },
      { id: 'systems', alreadyMemberCount: 0, missingCount: 2 },
    ]);
    expect(snapshot.quickTargetIds).toEqual(['frontend', 'systems']);
    expect(snapshot.semanticOrderingApplied).toBe(false);
  });

  it('orders a single repository by similarity to collection centroids', () => {
    const snapshot = createCollectionDialSnapshot({
      scopeId: 'scope-2',
      createdAt: '2026-08-14T00:00:00.000Z',
      repoIds: ['source'],
      collections: catalog,
      collectionRepos: memberships,
      sessionMru: ['systems'],
      repositoryEmbeddings: [...embeddings, { repoId: 'source', vector: [0.95, 0.05] }],
    });

    expect(snapshot.quickTargetIds).toEqual(['frontend', 'systems', 'owned']);
    expect(snapshot.semanticOrderingApplied).toBe(true);
  });

  it('promotes only a multi-repository top-one simple-majority consensus', () => {
    const common = {
      scopeId: 'scope-3',
      createdAt: '2026-08-14T00:00:00.000Z',
      collections: catalog,
      collectionRepos: memberships,
      sessionMru: ['systems'],
      repositoryEmbeddings: [
        ...embeddings,
        { repoId: 'source-a', vector: [1, 0] },
        { repoId: 'source-b', vector: [0.9, 0.1] },
        { repoId: 'source-c', vector: [0, 1] },
      ],
    } as const;

    const consensus = createCollectionDialSnapshot({
      ...common,
      repoIds: ['source-a', 'source-b', 'source-c'],
    });
    expect(consensus.quickTargetIds[0]).toBe('frontend');
    expect(consensus.semanticOrderingApplied).toBe(true);

    const noConsensus = createCollectionDialSnapshot({
      ...common,
      repoIds: ['source-a', 'source-c'],
    });
    expect(noConsensus.quickTargetIds[0]).toBe('systems');
    expect(noConsensus.semanticOrderingApplied).toBe(false);
  });

  it('counts only source vectors that can cast a valid top-one vote', () => {
    const snapshot = createCollectionDialSnapshot({
      scopeId: 'scope-valid-votes',
      createdAt: '2026-08-14T00:00:00.000Z',
      repoIds: ['source-a', 'source-b', 'invalid-a', 'invalid-b'],
      collections: catalog,
      collectionRepos: memberships,
      sessionMru: ['systems'],
      repositoryEmbeddings: [
        ...embeddings,
        { repoId: 'source-a', vector: [1, 0] },
        { repoId: 'source-b', vector: [0.9, 0.1] },
        { repoId: 'invalid-a', vector: [1, 0, 0] },
        { repoId: 'invalid-b', vector: [Number.NaN, 0] },
      ],
    });

    expect(snapshot.quickTargetIds[0]).toBe('frontend');
    expect(snapshot.semanticOrderingApplied).toBe(true);
  });

  it('falls back without semantic ordering when the scope exceeds fifty repositories', () => {
    const repoIds = Array.from({ length: 51 }, (_, index) => `source-${index}`);
    const snapshot = createCollectionDialSnapshot({
      scopeId: 'scope-4',
      createdAt: '2026-08-14T00:00:00.000Z',
      repoIds,
      collections: catalog,
      collectionRepos: memberships,
      sessionMru: ['systems'],
      repositoryEmbeddings: [
        ...embeddings,
        ...repoIds.map((repoId) => ({ repoId, vector: [1, 0] })),
      ],
    });

    expect(snapshot.quickTargetIds[0]).toBe('systems');
    expect(snapshot.semanticOrderingApplied).toBe(false);
  });
});

describe('Collection Dial reducer', () => {
  it('freezes repository scope and catalog at pickup', () => {
    const repoIds = ['repo-1'];
    const targets = [{ id: 'collection-1', name: 'Frontend', updatedAt: '2026-08-13' }];
    const pickup = createCollectionDialPickup({ repoIds, repoLabel: 'owner/repo', targets });

    repoIds.push('repo-2');
    targets[0] = { id: 'collection-2', name: 'Changed', updatedAt: '2026-08-14' };

    expect(pickup.repoIds).toEqual(['repo-1']);
    expect(pickup.targets).toEqual([
      { id: 'collection-1', name: 'Frontend', updatedAt: '2026-08-13' },
    ]);
  });

  it('selects without submitting, clamps non-looping steps, and retains context on failure', () => {
    const pickup = createCollectionDialPickup({
      repoIds: ['repo-1'],
      repoLabel: 'owner/repo',
      targets: [
        { id: 'one', name: 'One', updatedAt: '2026-08-13' },
        { id: 'two', name: 'Two', updatedAt: '2026-08-12' },
      ],
    });
    let state = collectionDialReducer({ phase: 'idle' }, { type: 'pickup', pickup });
    state = collectionDialReducer(state, { type: 'step', direction: -1 });
    expect(state.phase === 'active' && state.activeIndex).toBe(0);

    state = collectionDialReducer(state, { type: 'select', targetId: 'two' });
    expect(state.phase === 'active' && state.status).toBe('ready');
    expect(state.phase === 'active' && state.activeIndex).toBe(1);

    state = collectionDialReducer(state, { type: 'submit' });
    state = collectionDialReducer(state, {
      type: 'failure',
      retryable: true,
      message: 'Network unavailable',
      operationId: 'operation-1',
    });
    expect(state).toMatchObject({
      phase: 'active',
      status: 'retryable_failure',
      activeIndex: 1,
      operationId: 'operation-1',
      message: 'Network unavailable',
    });
    expect(state.phase === 'active' && state.pickup).toEqual(pickup);
  });

  it('keeps success terminal until the dial is dismissed', () => {
    const pickup = createCollectionDialPickup({
      repoIds: ['repo-1'],
      repoLabel: 'owner/repo',
      targets: [
        { id: 'one', name: 'One', updatedAt: '2026-08-13' },
        { id: 'two', name: 'Two', updatedAt: '2026-08-12' },
      ],
    });
    let state = collectionDialReducer({ phase: 'idle' }, { type: 'pickup', pickup });
    state = collectionDialReducer(state, { type: 'success', operationId: 'operation-1' });

    expect(collectionDialReducer(state, { type: 'step', direction: 1 })).toBe(state);
    expect(collectionDialReducer(state, { type: 'select', targetId: 'two' })).toBe(state);
    expect(collectionDialReducer(state, { type: 'submit' })).toBe(state);
  });

  it('ignores an asynchronous result from an older pickup scope', () => {
    const pickup = createCollectionDialPickup({
      scopeId: 'current-scope',
      createdAt: '2026-08-14T00:00:00.000Z',
      repoIds: ['repo-1'],
      repoLabel: 'owner/repo',
      targets: [{ id: 'one', name: 'One', updatedAt: '2026-08-13' }],
    });
    const state = collectionDialReducer({ phase: 'idle' }, { type: 'pickup', pickup });

    expect(
      collectionDialReducer(state, {
        type: 'success',
        scopeId: 'stale-scope',
        operationId: 'operation-1',
      }),
    ).toBe(state);
  });

  it('blocks a new multi pickup while the current multi scope is unfinished', () => {
    const currentPickup = createCollectionDialPickup({
      scopeId: 'current-multi',
      repoIds: ['repo-1', 'repo-2'],
      repoLabel: '2 selected',
      targets: [{ id: 'one', name: 'One', updatedAt: '2026-08-13' }],
    });
    const nextPickup = createCollectionDialPickup({
      scopeId: 'next-multi',
      repoIds: ['repo-3', 'repo-4'],
      repoLabel: '2 selected',
      targets: [{ id: 'two', name: 'Two', updatedAt: '2026-08-13' }],
    });
    const state = collectionDialReducer(
      collectionDialReducer({ phase: 'idle' }, { type: 'pickup', pickup: currentPickup }),
      { type: 'pickup', pickup: nextPickup },
    );

    expect(state.phase === 'active' && state.pickup.scopeId).toBe('current-multi');
  });

  it('keeps a committing scope open until the write settles', () => {
    const pickup = createCollectionDialPickup({
      repoIds: ['repo-1', 'repo-2'],
      repoLabel: '2 selected',
      targets: [{ id: 'one', name: 'One', updatedAt: '2026-08-13' }],
    });
    const submitting = collectionDialReducer(
      collectionDialReducer({ phase: 'idle' }, { type: 'pickup', pickup }),
      { type: 'submit' },
    );

    expect(collectionDialReducer(submitting, { type: 'cancel' })).toBe(submitting);
  });
});
