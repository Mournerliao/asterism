import type { CollectionRepoLink } from '@asterism/db';
import { describe, expect, it } from 'vitest';
import { countCollectionsByRepo, toRepoIdSet, updateNoteRepoIds } from './repo-card-metadata';

describe('repo card metadata', () => {
  it('counts collection memberships by repository', () => {
    const links: CollectionRepoLink[] = [
      { collectionId: 'a', repoId: 'repo-1' },
      { collectionId: 'b', repoId: 'repo-1' },
      { collectionId: 'a', repoId: 'repo-2' },
    ];

    expect([...countCollectionsByRepo(links)]).toEqual([
      ['repo-1', 2],
      ['repo-2', 1],
    ]);
  });

  it('builds a deduplicated note repository index', () => {
    expect([...toRepoIdSet(['repo-1', 'repo-1', 'repo-2'])]).toEqual(['repo-1', 'repo-2']);
  });

  it('adds and removes a repository when note state changes', () => {
    expect(updateNoteRepoIds(['repo-1'], 'repo-2', true)).toEqual(['repo-1', 'repo-2']);
    expect(updateNoteRepoIds(['repo-1', 'repo-2'], 'repo-1', false)).toEqual(['repo-2']);
    expect(updateNoteRepoIds(undefined, 'repo-1', true)).toBeUndefined();
  });
});
