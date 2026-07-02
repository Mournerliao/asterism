import { describe, expect, it } from 'vitest';
import {
  buildExportPayload,
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
