import type { ExportPayloadV1, ExportSnapshot } from './types';
import { EXPORT_VERSION } from './types';

/** 组装 v1 JSON 导出 payload。 */
export function buildExportPayload(
  snapshot: ExportSnapshot,
  exportedAt: string = new Date().toISOString(),
): ExportPayloadV1 {
  return {
    version: EXPORT_VERSION,
    exportedAt,
    counts: {
      repos: snapshot.repos.length,
      tags: snapshot.tags.length,
      collections: snapshot.collections.length,
      notes: snapshot.notes.length,
    },
    tags: snapshot.tags,
    collections: snapshot.collections,
    repos: snapshot.repos,
    repoTags: snapshot.repoTags,
    collectionRepos: snapshot.collectionRepos,
    notes: snapshot.notes,
  };
}

/**
 * 按固定的仓库范围裁剪导出快照：只保留在 `repoFullNames` 内的仓库，以及
 * 与之相关的标签 / 集合 / 关联 / 笔记。范围外的名字会被忽略，不会扩大导出。
 */
export function scopeExportSnapshot(
  snapshot: ExportSnapshot,
  repoFullNames: ReadonlySet<string>,
): ExportSnapshot {
  const repos = snapshot.repos.filter((repo) => repoFullNames.has(repo.fullName));
  const repoTags = snapshot.repoTags.filter((link) => repoFullNames.has(link.fullName));
  const collectionRepos = snapshot.collectionRepos.filter((link) =>
    repoFullNames.has(link.fullName),
  );
  const notes = snapshot.notes.filter((note) => repoFullNames.has(note.fullName));

  const usedTagNames = new Set(repoTags.map((link) => link.tagName));
  const usedCollectionNames = new Set(collectionRepos.map((link) => link.collectionName));
  const tags = snapshot.tags.filter((tag) => usedTagNames.has(tag.name));
  const collections = snapshot.collections.filter((collection) =>
    usedCollectionNames.has(collection.name),
  );

  return { tags, collections, repos, repoTags, collectionRepos, notes };
}

/** 序列化为格式化 JSON 字符串。 */
export function serializeExportJson(payload: ExportPayloadV1): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

const CSV_HEADERS = [
  'full_name',
  'language',
  'stars',
  'forks',
  'archived',
  'starred_at',
  'pushed_at',
  'topics',
] as const;

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** 导出仓库扁平行 CSV（仅 repos 维度）。 */
export function serializeExportCsv(snapshot: ExportSnapshot): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const repo of snapshot.repos) {
    lines.push(
      [
        escapeCsv(repo.fullName),
        escapeCsv(repo.language ?? ''),
        String(repo.stargazers),
        String(repo.forks ?? ''),
        repo.archived ? 'true' : 'false',
        escapeCsv(repo.starredAt ?? ''),
        escapeCsv(repo.pushedAt ?? ''),
        escapeCsv(repo.topics.join(';')),
      ].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

/** 可读 Markdown 导出：按集合与标签分组列出仓库与笔记。 */
export function serializeExportMarkdown(snapshot: ExportSnapshot): string {
  const lines: string[] = ['# Asterism Export', ''];
  lines.push(`Exported: ${new Date().toISOString()}`, '');
  lines.push(`- Repositories: ${snapshot.repos.length}`);
  lines.push(`- Tags: ${snapshot.tags.length}`);
  lines.push(`- Collections: ${snapshot.collections.length}`);
  lines.push(`- Notes: ${snapshot.notes.length}`, '');

  if (snapshot.collections.length > 0) {
    lines.push('## Collections', '');
    for (const collection of snapshot.collections) {
      lines.push(`### ${collection.name}`);
      if (collection.description) {
        lines.push('', collection.description);
      }
      lines.push('');
      const members = snapshot.collectionRepos
        .filter((link) => link.collectionName === collection.name)
        .map((link) => link.fullName);
      if (members.length === 0) {
        lines.push('_No repositories_');
      } else {
        for (const fullName of members) {
          lines.push(`- [${fullName}](https://github.com/${fullName})`);
        }
      }
      lines.push('');
    }
  }

  if (snapshot.tags.length > 0) {
    lines.push('## Tags', '');
    for (const tag of snapshot.tags) {
      lines.push(`### ${tag.name}`);
      lines.push('');
      const tagged = snapshot.repoTags
        .filter((link) => link.tagName === tag.name)
        .map((link) => link.fullName);
      if (tagged.length === 0) {
        lines.push('_No repositories_');
      } else {
        for (const fullName of tagged) {
          lines.push(`- [${fullName}](https://github.com/${fullName})`);
        }
      }
      lines.push('');
    }
  }

  const notesWithBody = snapshot.notes.filter((note) => note.body.trim().length > 0);
  if (notesWithBody.length > 0) {
    lines.push('## Notes', '');
    for (const note of notesWithBody) {
      lines.push(`### ${note.fullName}`, '', note.body.trim(), '');
    }
  }

  if (
    snapshot.repos.length > 0 &&
    snapshot.collections.length === 0 &&
    snapshot.tags.length === 0
  ) {
    lines.push('## All repositories', '');
    for (const repo of snapshot.repos) {
      lines.push(`- [${repo.fullName}](https://github.com/${repo.fullName})`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
