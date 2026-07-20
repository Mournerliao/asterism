import { describe, expect, it } from 'vitest';
import {
  buildExportPayload,
  scopeExportSnapshot,
  serializeExportCsv,
  serializeExportJson,
  serializeExportMarkdown,
} from './export';
import { normalizeImportData, parseImportJson } from './import';
import type { ExportSnapshot } from './types';

const snapshot: ExportSnapshot = {
  tags: [{ name: 'frontend', color: '#0969da' }],
  collections: [{ name: 'Web', description: 'Web stack' }],
  repos: [
    {
      fullName: 'vercel/next.js',
      starredAt: '2024-01-01T00:00:00Z',
      language: 'TypeScript',
      description: 'React framework',
      topics: ['react'],
      stargazers: 100,
      forks: 20,
      archived: false,
      pushedAt: '2024-06-01T00:00:00Z',
    },
  ],
  repoTags: [{ fullName: 'vercel/next.js', tagName: 'frontend' }],
  collectionRepos: [{ collectionName: 'Web', fullName: 'vercel/next.js' }],
  notes: [{ fullName: 'vercel/next.js', body: 'Great docs' }],
};

describe('data port export', () => {
  it('builds v1 payload and round-trips through JSON', () => {
    const payload = buildExportPayload(snapshot, '2026-01-01T00:00:00.000Z');
    expect(payload.version).toBe(1);
    expect(payload.counts.repos).toBe(1);

    const parsed = parseImportJson(serializeExportJson(payload));
    expect(parsed.payload.tags).toEqual(snapshot.tags);
    expect(normalizeImportData(parsed.payload).notes).toEqual(snapshot.notes);
  });

  it('serializes CSV and Markdown', () => {
    const csv = serializeExportCsv(snapshot);
    expect(csv).toContain('full_name,language');
    expect(csv).toContain('vercel/next.js');

    const md = serializeExportMarkdown(snapshot);
    expect(md).toContain('# Asterism Export');
    expect(md).toContain('### Web');
    expect(md).toContain('Great docs');
  });

  it('rejects malformed JSON', () => {
    expect(() => parseImportJson('{')).toThrow('INVALID_JSON');
    expect(() => parseImportJson(JSON.stringify({ version: 99 }))).toThrow('UNSUPPORTED_VERSION');
  });
});

const library: ExportSnapshot = {
  tags: [
    { name: 'frontend', color: '#0969da' },
    { name: 'backend', color: null },
  ],
  collections: [
    { name: 'Web', description: 'Web stack' },
    { name: 'Infra', description: null },
  ],
  repos: [
    {
      fullName: 'vercel/next.js',
      starredAt: '2024-01-01T00:00:00Z',
      language: 'TypeScript',
      description: 'React framework',
      topics: ['react'],
      stargazers: 100,
      forks: 20,
      archived: false,
      pushedAt: '2024-06-01T00:00:00Z',
    },
    {
      fullName: 'denoland/deno',
      starredAt: '2024-02-01T00:00:00Z',
      language: 'Rust',
      description: 'A modern runtime',
      topics: ['runtime'],
      stargazers: 90,
      forks: 10,
      archived: false,
      pushedAt: '2024-05-01T00:00:00Z',
    },
  ],
  repoTags: [
    { fullName: 'vercel/next.js', tagName: 'frontend' },
    { fullName: 'denoland/deno', tagName: 'backend' },
  ],
  collectionRepos: [
    { collectionName: 'Web', fullName: 'vercel/next.js' },
    { collectionName: 'Infra', fullName: 'denoland/deno' },
  ],
  notes: [
    { fullName: 'vercel/next.js', body: 'Great docs' },
    { fullName: 'denoland/deno', body: 'Rust runtime' },
  ],
};

describe('scopeExportSnapshot', () => {
  it('keeps only repositories in the fixed scope and their relevant organization data', () => {
    const scoped = scopeExportSnapshot(library, new Set(['vercel/next.js']));

    expect(scoped.repos.map((repo) => repo.fullName)).toEqual(['vercel/next.js']);
    expect(scoped.repoTags).toEqual([{ fullName: 'vercel/next.js', tagName: 'frontend' }]);
    expect(scoped.collectionRepos).toEqual([{ collectionName: 'Web', fullName: 'vercel/next.js' }]);
    expect(scoped.notes).toEqual([{ fullName: 'vercel/next.js', body: 'Great docs' }]);
    expect(scoped.tags).toEqual([{ name: 'frontend', color: '#0969da' }]);
    expect(scoped.collections).toEqual([{ name: 'Web', description: 'Web stack' }]);
  });

  it('returns an empty snapshot for an empty scope', () => {
    const scoped = scopeExportSnapshot(library, new Set());

    expect(scoped.repos).toEqual([]);
    expect(scoped.tags).toEqual([]);
    expect(scoped.collections).toEqual([]);
    expect(scoped.repoTags).toEqual([]);
    expect(scoped.collectionRepos).toEqual([]);
    expect(scoped.notes).toEqual([]);
  });

  it('ignores repository names outside the library without expanding the scope', () => {
    const scoped = scopeExportSnapshot(library, new Set(['ghost/repo', 'denoland/deno']));

    expect(scoped.repos.map((repo) => repo.fullName)).toEqual(['denoland/deno']);
    expect(scoped.tags).toEqual([{ name: 'backend', color: null }]);
    expect(scoped.collections).toEqual([{ name: 'Infra', description: null }]);
  });

  it('serializes the scoped snapshot to selected-only JSON, CSV, and Markdown', () => {
    const scoped = scopeExportSnapshot(library, new Set(['vercel/next.js']));

    const json = serializeExportJson(buildExportPayload(scoped, '2026-01-01T00:00:00.000Z'));
    expect(json).toContain('vercel/next.js');
    expect(json).not.toContain('denoland/deno');

    const csv = serializeExportCsv(scoped);
    expect(csv).toContain('vercel/next.js');
    expect(csv).not.toContain('denoland/deno');

    const md = serializeExportMarkdown(scoped);
    expect(md).toContain('vercel/next.js');
    expect(md).not.toContain('denoland/deno');
  });
});
