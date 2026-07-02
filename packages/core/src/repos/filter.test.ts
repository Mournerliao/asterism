import { describe, expect, it } from 'vitest';
import type { Repo } from '../models/repo';
import {
  deriveRepoFacets,
  filterStarredRepos,
  hasActiveFilter,
  type StarredRepoLike,
  sortStarredRepos,
} from './filter';

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

function item(overrides: Partial<Repo>, starredAt: string | null = null): StarredRepoLike {
  return { repo: makeRepo(overrides), starredAt };
}

const NOW = Date.parse('2026-06-30T00:00:00Z');

describe('filterStarredRepos', () => {
  const data: StarredRepoLike[] = [
    item({
      githubId: 1,
      fullName: 'vercel/next.js',
      language: 'JavaScript',
      topics: ['react'],
      stargazers: 100,
    }),
    item({
      githubId: 2,
      fullName: 'microsoft/TypeScript',
      language: 'TypeScript',
      topics: ['compiler'],
      stargazers: 5000,
      archived: true,
    }),
    item({
      githubId: 3,
      fullName: 'rust-lang/rust',
      language: 'Rust',
      topics: ['compiler', 'language'],
      stargazers: 200,
      pushedAt: '2026-06-29T00:00:00Z',
    }),
  ];

  it('matches keyword across name, description and topics', () => {
    expect(filterStarredRepos(data, { query: 'typescript' }).map((d) => d.repo.githubId)).toEqual([
      2,
    ]);
    expect(filterStarredRepos(data, { query: 'compiler' }).map((d) => d.repo.githubId)).toEqual([
      2, 3,
    ]);
  });

  it('filters by language and topic', () => {
    expect(filterStarredRepos(data, { language: 'Rust' }).map((d) => d.repo.githubId)).toEqual([3]);
    expect(filterStarredRepos(data, { topic: 'compiler' }).map((d) => d.repo.githubId)).toEqual([
      2, 3,
    ]);
  });

  it('filters by minStars and status', () => {
    expect(filterStarredRepos(data, { minStars: 1000 }).map((d) => d.repo.githubId)).toEqual([2]);
    expect(filterStarredRepos(data, { status: 'archived' }).map((d) => d.repo.githubId)).toEqual([
      2,
    ]);
    expect(filterStarredRepos(data, { status: 'active' }).map((d) => d.repo.githubId)).toEqual([
      1, 3,
    ]);
  });

  it('filters by pushedWithinDays relative to now', () => {
    expect(
      filterStarredRepos(data, { pushedWithinDays: 7 }, NOW).map((d) => d.repo.githubId),
    ).toEqual([3]);
  });

  it('combines filters with AND', () => {
    expect(
      filterStarredRepos(data, { topic: 'compiler', status: 'active' }).map((d) => d.repo.githubId),
    ).toEqual([3]);
  });

  it('treats undefined tagIds as no tag filter', () => {
    expect(filterStarredRepos(data, { tagIds: undefined }).map((d) => d.repo.githubId)).toEqual([
      1, 2, 3,
    ]);
  });

  it('filters by tagIds with OR semantics', () => {
    const withIds: StarredRepoLike[] = data.map((entry, index) => ({
      ...entry,
      repoId: String(index + 1),
    }));
    const tagsByRepoId = new Map<string, string[]>([
      ['1', ['tag-a']],
      ['2', ['tag-b']],
      ['3', ['tag-a', 'tag-c']],
    ]);
    expect(
      filterStarredRepos(withIds, { tagIds: ['tag-a'] }, NOW, tagsByRepoId).map(
        (d) => d.repo.githubId,
      ),
    ).toEqual([1, 3]);
    expect(
      filterStarredRepos(withIds, { tagIds: ['tag-a', 'tag-b'] }, NOW, tagsByRepoId).map(
        (d) => d.repo.githubId,
      ),
    ).toEqual([1, 2, 3]);
    expect(
      filterStarredRepos(withIds, { tagIds: ['tag-missing'] }, NOW, tagsByRepoId).map(
        (d) => d.repo.githubId,
      ),
    ).toEqual([]);
  });
});

describe('sortStarredRepos', () => {
  const data: StarredRepoLike[] = [
    item(
      { githubId: 1, fullName: 'b/one', stargazers: 10, pushedAt: '2026-01-01T00:00:00Z' },
      '2026-05-01T00:00:00Z',
    ),
    item(
      { githubId: 2, fullName: 'a/two', stargazers: 30, pushedAt: '2026-03-01T00:00:00Z' },
      '2026-06-01T00:00:00Z',
    ),
    item(
      { githubId: 3, fullName: 'c/three', stargazers: 20, pushedAt: '2026-02-01T00:00:00Z' },
      null,
    ),
  ];

  it('sorts by stars desc', () => {
    expect(sortStarredRepos(data, 'stars').map((d) => d.repo.githubId)).toEqual([2, 3, 1]);
  });

  it('sorts by pushed desc', () => {
    expect(sortStarredRepos(data, 'pushed').map((d) => d.repo.githubId)).toEqual([2, 3, 1]);
  });

  it('sorts by name asc', () => {
    expect(sortStarredRepos(data, 'name').map((d) => d.repo.fullName)).toEqual([
      'a/two',
      'b/one',
      'c/three',
    ]);
  });

  it('sorts by starredAt desc with nulls last', () => {
    expect(sortStarredRepos(data, 'starred').map((d) => d.repo.githubId)).toEqual([2, 1, 3]);
  });
});

describe('deriveRepoFacets', () => {
  it('collects sorted languages and frequency-ordered topics', () => {
    const facets = deriveRepoFacets([
      item({ language: 'Go', topics: ['cli', 'tool'] }),
      item({ language: 'Rust', topics: ['cli'] }),
      item({ language: null, topics: ['tool', 'cli'] }),
    ]);
    expect(facets.languages).toEqual(['Go', 'Rust']);
    expect(facets.topics).toEqual(['cli', 'tool']);
  });
});

describe('hasActiveFilter', () => {
  it('detects active and empty filters', () => {
    expect(hasActiveFilter({})).toBe(false);
    expect(hasActiveFilter({ status: 'all', minStars: 0, query: '  ' })).toBe(false);
    expect(hasActiveFilter({ language: 'Go' })).toBe(true);
    expect(hasActiveFilter({ query: 'x' })).toBe(true);
    expect(hasActiveFilter({ tagIds: ['t1'] })).toBe(true);
  });
});
