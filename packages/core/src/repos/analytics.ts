import type { Collection } from '../models/collection';
import type { Tag } from '../models/tag';
import type { StarredRepoLike } from './filter';

export interface RepoTagLink {
  repoId: string;
  tagId: string;
}

export interface DashboardStats {
  totalStars: number;
  languageCount: number;
  taggedRepoCount: number;
  collectionCount: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface YearCount {
  year: string;
  count: number;
}

export interface ArchiveSplit {
  active: number;
  archived: number;
}

export interface TagUsage {
  tagId: string;
  name: string;
  color: string | null;
  count: number;
}

export interface DashboardInsights {
  stats: DashboardStats;
  languages: NamedCount[];
  starredByYear: YearCount[];
  topics: NamedCount[];
  archiveSplit: ArchiveSplit;
  topTags: TagUsage[];
}

export interface DeriveDashboardInput {
  starredRepos: StarredRepoLike[];
  tags: Tag[];
  collections: Collection[];
  repoTags: RepoTagLink[];
}

function countBy<T>(items: T[], keyFn: (item: T) => string | null | undefined): NamedCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 从 stars / 标签 / 集合数据聚合仪表盘洞察。 */
export function deriveDashboardInsights(input: DeriveDashboardInput): DashboardInsights {
  const { starredRepos, tags, collections, repoTags } = input;

  const taggedRepoIds = new Set(repoTags.map((link) => link.repoId));
  const languages = new Set(
    starredRepos.map(({ repo }) => repo.language).filter(Boolean) as string[],
  );

  const languageCounts = countBy(starredRepos, ({ repo }) => repo.language).slice(0, 8);

  const yearCounts = new Map<string, number>();
  for (const { starredAt } of starredRepos) {
    if (!starredAt) {
      continue;
    }
    const year = String(new Date(starredAt).getUTCFullYear());
    if (Number.isFinite(Number(year))) {
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
    }
  }
  const starredByYear = [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const topicCounts = new Map<string, number>();
  for (const { repo } of starredRepos) {
    for (const topic of repo.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }
  const topics = [...topicCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 10);

  let active = 0;
  let archived = 0;
  for (const { repo } of starredRepos) {
    if (repo.archived) {
      archived += 1;
    } else {
      active += 1;
    }
  }

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const tagUsageCounts = new Map<string, number>();
  for (const link of repoTags) {
    tagUsageCounts.set(link.tagId, (tagUsageCounts.get(link.tagId) ?? 0) + 1);
  }
  const topTags = [...tagUsageCounts.entries()]
    .map(([tagId, count]) => {
      const tag = tagById.get(tagId);
      return {
        tagId,
        name: tag?.name ?? tagId,
        color: tag?.color ?? null,
        count,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);

  return {
    stats: {
      totalStars: starredRepos.length,
      languageCount: languages.size,
      taggedRepoCount: taggedRepoIds.size,
      collectionCount: collections.length,
    },
    languages: languageCounts,
    starredByYear,
    topics,
    archiveSplit: { active, archived },
    topTags,
  };
}
