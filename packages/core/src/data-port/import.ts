import { normalizeClassificationName } from '../classifications/name';
import type {
  ExportCollection,
  ExportCollectionRepo,
  ExportNote,
  ExportRepo,
  ExportRepoTag,
  ExportTag,
  ImportIssue,
  ImportPayload,
  ImportVersion,
  NormalizedImportData,
  ParsedImportPayload,
} from './types';
import { IMPORT_VERSIONS } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every((item) => typeof item === 'string')) {
    return null;
  }
  return value;
}

function isImportVersion(value: unknown): value is ImportVersion {
  return IMPORT_VERSIONS.some((version) => version === value);
}

/** 解析并校验 v1 / v2 JSON 导入 payload。v1 的 tags 在此折叠进 collections。 */
export function parseImportJson(raw: string): ParsedImportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }

  const issues: ImportIssue[] = [];
  if (!isRecord(parsed)) {
    throw new Error('INVALID_SCHEMA');
  }

  if (!isImportVersion(parsed.version)) {
    throw new Error('UNSUPPORTED_VERSION');
  }

  const exportedAt = readString(parsed.exportedAt);
  if (!exportedAt) {
    issues.push({ kind: 'warning', message: 'Missing exportedAt' });
  }

  const tags =
    parsed.version === 1
      ? parseTags(parsed.tags, issues)
      : Array.isArray(parsed.tags)
        ? parseTags(parsed.tags, issues)
        : [];
  const collections = parseCollections(parsed.collections, issues);
  const repos = parseRepos(parsed.repos, issues);
  const repoTags =
    parsed.version === 1
      ? parseRepoTags(parsed.repoTags, issues)
      : Array.isArray(parsed.repoTags)
        ? parseRepoTags(parsed.repoTags, issues)
        : [];
  const collectionRepos = parseCollectionRepos(parsed.collectionRepos, issues);
  const notes = parseNotes(parsed.notes, issues);
  const folded = foldTagsIntoCollections(tags, collections, repoTags, collectionRepos);

  const payload: ImportPayload = {
    version: parsed.version,
    exportedAt: exportedAt ?? new Date().toISOString(),
    collections: folded.collections,
    repos,
    collectionRepos: folded.collectionRepos,
    notes,
  };

  if (issues.some((issue) => issue.kind === 'error')) {
    throw new Error('INVALID_SCHEMA');
  }

  return { payload };
}

/** 从 payload 提取可写入数据库的组织数据（不含 repos 本体）。 */
export function normalizeImportData(payload: ImportPayload): NormalizedImportData {
  return {
    collections: payload.collections,
    collectionRepos: payload.collectionRepos,
    notes: payload.notes.filter((note) => note.body.trim().length > 0),
  };
}

export function foldTagsIntoCollections(
  tags: readonly ExportTag[],
  collections: readonly ExportCollection[],
  repoTags: readonly ExportRepoTag[],
  collectionRepos: readonly ExportCollectionRepo[],
): { collections: ExportCollection[]; collectionRepos: ExportCollectionRepo[] } {
  const byNorm = new Map<string, ExportCollection>();
  for (const collection of collections) {
    const key = normalizeClassificationName(collection.name);
    if (!byNorm.has(key)) {
      byNorm.set(key, collection);
    }
  }
  for (const tag of tags) {
    const key = normalizeClassificationName(tag.name);
    if (!byNorm.has(key)) {
      byNorm.set(key, { name: tag.name, description: null });
    }
  }

  const links: ExportCollectionRepo[] = [];
  const seen = new Set<string>();
  const pushLink = (collectionName: string, fullName: string) => {
    const collection = byNorm.get(normalizeClassificationName(collectionName));
    if (!collection) {
      return;
    }
    const dedupe = `${normalizeClassificationName(collection.name)}\0${fullName.toLowerCase()}`;
    if (seen.has(dedupe)) {
      return;
    }
    seen.add(dedupe);
    links.push({ collectionName: collection.name, fullName });
  };

  for (const link of collectionRepos) {
    pushLink(link.collectionName, link.fullName);
  }
  for (const link of repoTags) {
    pushLink(link.tagName, link.fullName);
  }

  return { collections: [...byNorm.values()], collectionRepos: links };
}

function parseTags(value: unknown, issues: ImportIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ kind: 'error', message: 'tags must be an array' });
    return [];
  }
  const tags = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const name = readString(item.name)?.trim();
    if (!name) {
      continue;
    }
    const color = item.color === null ? null : readString(item.color);
    tags.push({ name, color });
  }
  return tags;
}

function parseCollections(value: unknown, issues: ImportIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ kind: 'error', message: 'collections must be an array' });
    return [];
  }
  const collections = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const name = readString(item.name)?.trim();
    if (!name) {
      continue;
    }
    const description =
      item.description === null ? null : readString(item.description)?.trim() || null;
    collections.push({ name, description });
  }
  return collections;
}

function parseRepos(value: unknown, issues: ImportIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ kind: 'error', message: 'repos must be an array' });
    return [];
  }
  const repos: ExportRepo[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const fullName = readString(item.fullName)?.trim();
    if (!fullName) {
      continue;
    }
    repos.push({
      fullName,
      starredAt: readString(item.starredAt),
      language: item.language === null ? null : readString(item.language),
      description: item.description === null ? null : readString(item.description),
      topics: readStringArray(item.topics) ?? [],
      stargazers: typeof item.stargazers === 'number' ? item.stargazers : 0,
      forks: typeof item.forks === 'number' ? item.forks : null,
      archived: Boolean(item.archived),
      pushedAt: item.pushedAt === null ? null : readString(item.pushedAt),
    });
  }
  return repos;
}

function parseRepoTags(value: unknown, issues: ImportIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ kind: 'error', message: 'repoTags must be an array' });
    return [];
  }
  const links: ExportRepoTag[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const fullName = readString(item.fullName)?.trim();
    const tagName = readString(item.tagName)?.trim();
    if (fullName && tagName) {
      links.push({ fullName, tagName });
    }
  }
  return links;
}

function parseCollectionRepos(value: unknown, issues: ImportIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ kind: 'error', message: 'collectionRepos must be an array' });
    return [];
  }
  const links: ExportCollectionRepo[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const collectionName = readString(item.collectionName)?.trim();
    const fullName = readString(item.fullName)?.trim();
    if (collectionName && fullName) {
      links.push({ collectionName, fullName });
    }
  }
  return links;
}

function parseNotes(value: unknown, issues: ImportIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ kind: 'error', message: 'notes must be an array' });
    return [];
  }
  const notes: ExportNote[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const fullName = readString(item.fullName)?.trim();
    const body = readString(item.body);
    if (fullName && body != null) {
      notes.push({ fullName, body });
    }
  }
  return notes;
}
