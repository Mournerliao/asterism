import { describe, expect, it } from 'vitest';
import type { Repo } from '../models/repo';
import type { StarredRepoLike } from './filter';
import { rankHybridRepos } from './hybrid-search';

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
  repoId: string,
  starredAt: string | null = null,
): StarredRepoLike {
  return { repo: makeRepo(overrides), starredAt, repoId };
}

const NOW = Date.parse('2026-06-30T00:00:00Z');

const dataset: StarredRepoLike[] = [
  item(
    {
      githubId: 1,
      fullName: 'facebook/react',
      description: 'A JavaScript library',
      stargazers: 100,
    },
    'r1',
  ),
  item({ githubId: 2, fullName: 'vuejs/core', description: 'Vue framework', stargazers: 90 }, 'r2'),
  item(
    {
      githubId: 3,
      fullName: 'sveltejs/svelte',
      description: 'Cybernetically enhanced apps',
      stargazers: 80,
    },
    'r3',
  ),
  item(
    {
      githubId: 4,
      fullName: 'rust-lang/rust',
      description: 'Empowering everyone',
      stargazers: 70,
      language: 'Rust',
    },
    'r4',
  ),
];

describe('rankHybridRepos', () => {
  it('with no query returns the full sorted list and no semantic neighbors', () => {
    const result = rankHybridRepos({ items: dataset, filter: {}, sort: 'stars', now: NOW });
    expect(result.primary.map((r) => r.repoId)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(result.semantic).toEqual([]);
  });

  it('with a query but no distance map degrades to keyword-only ranking', () => {
    const result = rankHybridRepos({
      items: dataset,
      filter: { query: 'react' },
      sort: 'stars',
      now: NOW,
    });
    expect(result.primary.map((r) => r.repoId)).toEqual(['r1']);
    expect(result.semantic).toEqual([]);
  });

  it('appends non-keyword neighbors ordered by ascending distance', () => {
    const result = rankHybridRepos({
      items: dataset,
      filter: { query: 'react' },
      sort: 'stars',
      now: NOW,
      distanceByRepoId: new Map([
        ['r1', 0.05],
        ['r2', 0.2],
        ['r3', 0.1],
      ]),
    });
    expect(result.primary.map((r) => r.repoId)).toEqual(['r1']);
    // r1 matches the keyword so it stays out of the semantic tail even though it has a distance
    expect(result.semantic.map((r) => r.repoId)).toEqual(['r3', 'r2']);
  });

  it('keeps facet filters applied to semantic neighbors', () => {
    const result = rankHybridRepos({
      items: dataset,
      filter: { query: 'react', language: 'Rust' },
      sort: 'stars',
      now: NOW,
      distanceByRepoId: new Map([
        ['r2', 0.2],
        ['r3', 0.1],
        ['r4', 0.3],
      ]),
    });
    // language:Rust removes react from primary and constrains neighbors to r4
    expect(result.primary.map((r) => r.repoId)).toEqual([]);
    expect(result.semantic.map((r) => r.repoId)).toEqual(['r4']);
  });

  it('caps semantic neighbors at semanticLimit', () => {
    const result = rankHybridRepos({
      items: dataset,
      filter: { query: 'react' },
      sort: 'stars',
      now: NOW,
      semanticLimit: 1,
      distanceByRepoId: new Map([
        ['r2', 0.2],
        ['r3', 0.1],
        ['r4', 0.3],
      ]),
    });
    expect(result.semantic.map((r) => r.repoId)).toEqual(['r3']);
  });

  it('breaks distance ties deterministically by fullName', () => {
    const result = rankHybridRepos({
      items: dataset,
      filter: { query: 'react' },
      sort: 'stars',
      now: NOW,
      distanceByRepoId: new Map([
        ['r4', 0.1],
        ['r3', 0.1],
        ['r2', 0.1],
      ]),
    });
    // equal distance → rust-lang/rust, sveltejs/svelte, vuejs/core
    expect(result.semantic.map((r) => r.repoId)).toEqual(['r4', 'r3', 'r2']);
  });

  it('excludes records without a distance entry from the semantic tail', () => {
    const result = rankHybridRepos({
      items: dataset,
      filter: { query: 'react' },
      sort: 'stars',
      now: NOW,
      distanceByRepoId: new Map([['r2', 0.2]]),
    });
    expect(result.semantic.map((r) => r.repoId)).toEqual(['r2']);
  });
});
