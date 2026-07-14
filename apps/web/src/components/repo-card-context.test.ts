import type { Tag } from '@asterism/core';
import { describe, expect, it } from 'vitest';
import { buildRepoContextItems } from './repo-card-context';

const tags: Tag[] = [
  { id: 'tag-1', name: 'React', color: '#2563eb' },
  { id: 'tag-2', name: 'Reading', color: null },
];

describe('buildRepoContextItems', () => {
  it('places user tags before GitHub topics', () => {
    expect(buildRepoContextItems(tags, ['typescript']).map((item) => item.label)).toEqual([
      'React',
      'Reading',
      'typescript',
    ]);
  });

  it('deduplicates labels case-insensitively in favor of user tags', () => {
    expect(buildRepoContextItems(tags, ['react', 'REACT', 'TypeScript', 'typescript'])).toEqual([
      { kind: 'tag', key: 'tag:tag-1', label: 'React', color: '#2563eb' },
      { kind: 'tag', key: 'tag:tag-2', label: 'Reading', color: null },
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
