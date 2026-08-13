import { describe, expect, it } from 'vitest';
import {
  collectionDialReducer,
  createCollectionDialPickup,
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
});
