import type { Repo } from '@asterism/core';
import type {
  CollectionRepoLink,
  CollectionWithMeta,
  RepoTagLink,
  StarredRepoRecord,
  TagWithCount,
} from '@asterism/db';
import { describe, expect, it } from 'vitest';
import {
  buildExportSnapshot,
  buildSelectedExportSnapshot,
  type ExportSourceData,
} from './export-snapshot';

function repo(fullName: string): Repo {
  const [owner, name] = fullName.split('/');
  return {
    githubId: fullName.length,
    fullName,
    name: name ?? fullName,
    owner: owner ?? fullName,
    description: `${fullName} description`,
    language: 'TypeScript',
    topics: ['topic'],
    stargazers: 10,
    forks: 2,
    homepage: null,
    pushedAt: '2024-06-01T00:00:00Z',
    repoCreatedAt: '2020-01-01T00:00:00Z',
    archived: false,
    isFork: false,
    syncedAt: '2024-06-02T00:00:00Z',
  };
}

function record(repoId: string, fullName: string): StarredRepoRecord {
  return { repoId, repo: repo(fullName), starredAt: '2024-01-01T00:00:00Z' };
}

const tags: TagWithCount[] = [
  { id: 'tag-fe', name: 'frontend', color: '#0969da', repoCount: 1 },
  { id: 'tag-be', name: 'backend', color: null, repoCount: 1 },
];

const collections: CollectionWithMeta[] = [
  { id: 'col-web', name: 'Web', description: 'Web stack', repoCount: 1, updatedAt: '2024-01-01' },
  { id: 'col-infra', name: 'Infra', description: null, repoCount: 1, updatedAt: '2024-01-01' },
];

const repoTags: RepoTagLink[] = [
  { repoId: 'r1', tagId: 'tag-fe' },
  { repoId: 'r2', tagId: 'tag-be' },
];

const collectionRepos: CollectionRepoLink[] = [
  { collectionId: 'col-web', repoId: 'r1' },
  { collectionId: 'col-infra', repoId: 'r2' },
];

const source: ExportSourceData = {
  starredRepos: [record('r1', 'vercel/next.js'), record('r2', 'denoland/deno')],
  tags,
  collections,
  repoTags,
  collectionRepos,
  notes: [
    { repoId: 'r1', body: 'Great docs' },
    { repoId: 'r2', body: 'Rust runtime' },
    { repoId: 'ghost', body: 'orphan note' },
  ],
};

describe('buildExportSnapshot', () => {
  it('maps repository-id-keyed source data to a full-name-keyed snapshot', () => {
    const snapshot = buildExportSnapshot(source);

    expect(snapshot.repos.map((r) => r.fullName)).toEqual(['vercel/next.js', 'denoland/deno']);
    expect(snapshot.repoTags).toEqual([
      { fullName: 'vercel/next.js', tagName: 'frontend' },
      { fullName: 'denoland/deno', tagName: 'backend' },
    ]);
    expect(snapshot.collectionRepos).toEqual([
      { collectionName: 'Web', fullName: 'vercel/next.js' },
      { collectionName: 'Infra', fullName: 'denoland/deno' },
    ]);
    expect(snapshot.notes).toEqual([
      { fullName: 'vercel/next.js', body: 'Great docs' },
      { fullName: 'denoland/deno', body: 'Rust runtime' },
    ]);
  });

  it('drops notes and links that reference repositories outside the library', () => {
    const snapshot = buildExportSnapshot(source);

    expect(snapshot.notes.some((note) => note.body === 'orphan note')).toBe(false);
  });
});

describe('buildSelectedExportSnapshot', () => {
  it('keeps only the fixed repository-id scope and its relevant organization data', () => {
    const snapshot = buildSelectedExportSnapshot(source, new Set(['r1']));

    expect(snapshot.repos.map((r) => r.fullName)).toEqual(['vercel/next.js']);
    expect(snapshot.tags).toEqual([{ name: 'frontend', color: '#0969da' }]);
    expect(snapshot.collections).toEqual([{ name: 'Web', description: 'Web stack' }]);
    expect(snapshot.repoTags).toEqual([{ fullName: 'vercel/next.js', tagName: 'frontend' }]);
    expect(snapshot.notes).toEqual([{ fullName: 'vercel/next.js', body: 'Great docs' }]);
  });

  it('returns an empty snapshot when the scope is empty', () => {
    const snapshot = buildSelectedExportSnapshot(source, new Set());

    expect(snapshot.repos).toEqual([]);
    expect(snapshot.tags).toEqual([]);
    expect(snapshot.collections).toEqual([]);
  });

  it('ignores repository ids that are not in the library', () => {
    const snapshot = buildSelectedExportSnapshot(source, new Set(['r2', 'missing']));

    expect(snapshot.repos.map((r) => r.fullName)).toEqual(['denoland/deno']);
  });
});
