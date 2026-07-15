import type { StarredRepoRecord } from '@asterism/db';
import { afterEach, describe, expect, it } from 'vitest';
import { adjacentRepo, findRepoIndex, useRepoInspectorStore } from './repo-inspector';

function record(repoId: string): StarredRepoRecord {
  return {
    repoId,
    starredAt: null,
    repo: {
      githubId: repoId.length,
      fullName: `owner/${repoId}`,
      owner: 'owner',
      name: repoId,
      description: null,
      language: null,
      topics: [],
      stargazers: 0,
      forks: 0,
      homepage: null,
      pushedAt: null,
      repoCreatedAt: null,
      archived: false,
      isFork: false,
      syncedAt: '2026-07-15T00:00:00.000Z',
    },
  };
}

const records = [record('one'), record('two'), record('three')];
const context = { sourceKey: 'test', records };

afterEach(() => useRepoInspectorStore.getState().close());

describe('repo inspector sequence', () => {
  it('finds the selected item and adjacent repositories', () => {
    expect(findRepoIndex(context, 'two')).toBe(1);
    expect(adjacentRepo(context, 'two', -1)?.repoId).toBe('one');
    expect(adjacentRepo(context, 'two', 1)?.repoId).toBe('three');
    expect(adjacentRepo(context, 'one', -1)).toBeNull();
    expect(adjacentRepo(context, 'missing', 1)).toBeNull();
  });

  it('changes selection and resets the record and context on close', () => {
    const store = useRepoInspectorStore.getState();
    store.setSelection(records[0] as StarredRepoRecord, context);
    store.setSelection(records[1] as StarredRepoRecord, context);

    expect(useRepoInspectorStore.getState()).toMatchObject({
      record: records[1],
      context,
    });

    useRepoInspectorStore.getState().close();
    expect(useRepoInspectorStore.getState()).toMatchObject({
      record: null,
      context: null,
    });
  });
});
