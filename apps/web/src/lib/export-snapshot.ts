import { type ExportSnapshot, scopeExportSnapshot } from '@asterism/core';
import type {
  CollectionRepoLink,
  CollectionWithMeta,
  RepoTagLink,
  StarredRepoRecord,
  TagWithCount,
} from '@asterism/db';

/** 构建导出快照所需的原始查询数据（均为 TanStack Query 已缓存的最新结果）。 */
export interface ExportSourceData {
  starredRepos: readonly StarredRepoRecord[];
  tags: readonly TagWithCount[];
  collections: readonly CollectionWithMeta[];
  repoTags: readonly RepoTagLink[];
  collectionRepos: readonly CollectionRepoLink[];
  notes: readonly { repoId: string; body: string }[];
}

/**
 * 把按 repoId 关联的查询数据映射为按 fullName 关联的导出快照。
 * 关联到库外仓库的标签/集合/笔记会被丢弃，保证快照自洽。
 */
export function buildExportSnapshot(source: ExportSourceData): ExportSnapshot {
  const tagNameById = new Map(source.tags.map((tag) => [tag.id, tag.name]));
  const collectionNameById = new Map(
    source.collections.map((collection) => [collection.id, collection.name]),
  );
  const fullNameByRepoId = new Map(
    source.starredRepos.map((record) => [record.repoId, record.repo.fullName]),
  );

  return {
    tags: source.tags.map(({ name, color }) => ({ name, color })),
    collections: source.collections.map(({ name, description }) => ({ name, description })),
    repos: source.starredRepos.map(({ repo, starredAt }) => ({
      fullName: repo.fullName,
      starredAt,
      language: repo.language,
      description: repo.description,
      topics: repo.topics,
      stargazers: repo.stargazers,
      forks: repo.forks,
      archived: repo.archived,
      pushedAt: repo.pushedAt,
    })),
    repoTags: source.repoTags.flatMap((link) => {
      const tagName = tagNameById.get(link.tagId);
      const fullName = fullNameByRepoId.get(link.repoId);
      return tagName && fullName ? [{ fullName, tagName }] : [];
    }),
    collectionRepos: source.collectionRepos.flatMap((link) => {
      const collectionName = collectionNameById.get(link.collectionId);
      const fullName = fullNameByRepoId.get(link.repoId);
      return collectionName && fullName ? [{ collectionName, fullName }] : [];
    }),
    notes: source.notes.flatMap((note) => {
      const fullName = fullNameByRepoId.get(note.repoId);
      return fullName && note.body.trim() ? [{ fullName, body: note.body }] : [];
    }),
  };
}

/**
 * 针对固定的 repoId 选择范围构建裁剪后的导出快照：
 * 先映射出完整快照，再按选中仓库的 fullName 收缩，范围外的 id 会被忽略。
 */
export function buildSelectedExportSnapshot(
  source: ExportSourceData,
  selectedRepoIds: ReadonlySet<string>,
): ExportSnapshot {
  const selectedFullNames = new Set<string>();
  for (const record of source.starredRepos) {
    if (selectedRepoIds.has(record.repoId)) {
      selectedFullNames.add(record.repo.fullName);
    }
  }
  return scopeExportSnapshot(buildExportSnapshot(source), selectedFullNames);
}
