import { describe, expect, it } from 'vitest';
import type { Repo } from '../models/repo';
import { deriveDashboardInsights } from './analytics';
import type { StarredRepoLike } from './filter';

function makeRepo(overrides: Partial<Repo>): Repo {
  return {
    githubId: 1,
    fullName: 'owner/name',
    name: 'name',
    owner: 'owner',
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
    syncedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function item(
  overrides: Partial<Repo>,
  starredAt: string | null = null,
  repoId?: string,
): StarredRepoLike {
  return { repo: makeRepo(overrides), starredAt, repoId };
}

describe('deriveDashboardInsights', () => {
  it('aggregates stats, languages, years, topics, archive split and tag usage', () => {
    const insights = deriveDashboardInsights({
      starredRepos: [
        item(
          { language: 'TypeScript', topics: ['react'], archived: false },
          '2024-06-01T00:00:00Z',
          'r1',
        ),
        item(
          { language: 'Rust', topics: ['cli', 'tool'], archived: true },
          '2025-01-01T00:00:00Z',
          'r2',
        ),
        item({ language: 'TypeScript', topics: ['react', 'ui'] }, '2025-03-01T00:00:00Z', 'r3'),
      ],
      tags: [
        { id: 't1', name: 'frontend', color: '#0969da' },
        { id: 't2', name: 'tools', color: '#1a7f37' },
      ],
      collections: [{ id: 'c1', name: 'Web', description: null }],
      repoTags: [
        { repoId: 'r1', tagId: 't1' },
        { repoId: 'r2', tagId: 't2' },
        { repoId: 'r3', tagId: 't1' },
      ],
    });

    expect(insights.stats).toEqual({
      totalStars: 3,
      languageCount: 2,
      taggedRepoCount: 3,
      collectionCount: 1,
    });
    expect(insights.languages).toEqual([
      { name: 'TypeScript', count: 2 },
      { name: 'Rust', count: 1 },
    ]);
    expect(insights.starredByYear).toEqual([
      { year: '2024', count: 1 },
      { year: '2025', count: 2 },
    ]);
    expect(insights.topics[0]).toEqual({ name: 'react', count: 2 });
    expect(insights.archiveSplit).toEqual({ active: 2, archived: 1 });
    expect(insights.topTags[0]).toMatchObject({ tagId: 't1', name: 'frontend', count: 2 });
  });

  it('returns empty-friendly defaults', () => {
    const insights = deriveDashboardInsights({
      starredRepos: [],
      tags: [],
      collections: [],
      repoTags: [],
    });
    expect(insights.stats.totalStars).toBe(0);
    expect(insights.languages).toEqual([]);
    expect(insights.starredByYear).toEqual([]);
    expect(insights.topTags).toEqual([]);
  });
});
