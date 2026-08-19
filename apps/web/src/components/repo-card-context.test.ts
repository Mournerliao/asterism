import { describe, expect, it } from 'vitest';
import { buildRepoContextItems, type RepoCardCollection } from './repo-card-context';

const collections: RepoCardCollection[] = [
  { id: 'col-1', name: 'React' },
  { id: 'col-2', name: 'Reading' },
];

describe('buildRepoContextItems', () => {
  it('places collections before GitHub topics', () => {
    expect(buildRepoContextItems(collections, ['typescript']).map((item) => item.label)).toEqual([
      'React',
      'Reading',
      'typescript',
    ]);
  });

  it('deduplicates labels case-insensitively in favor of collections', () => {
    expect(
      buildRepoContextItems(collections, ['react', 'REACT', 'TypeScript', 'typescript']),
    ).toEqual([
      { kind: 'collection', key: 'collection:col-1', label: 'React' },
      { kind: 'collection', key: 'collection:col-2', label: 'Reading' },
      { kind: 'topic', key: 'topic:typescript', label: 'TypeScript' },
    ]);
  });

  it('ignores blank labels and preserves long content for width measurement', () => {
    const longTopic = 'a-very-long-topic-name-that-will-overflow';
    expect(buildRepoContextItems([], [' ', longTopic])).toEqual([
      { kind: 'topic', key: `topic:${longTopic}`, label: longTopic },
    ]);
  });

  it('returns an empty list when no context exists', () => {
    expect(buildRepoContextItems([], [])).toEqual([]);
  });
});
