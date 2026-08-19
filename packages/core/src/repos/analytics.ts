import type { Collection } from '../models/collection';
import type { StarredRepoLike } from './filter';

export interface RepoCollectionLink {
  repoId: string;
  collectionId: string;
}

export interface DashboardStats {
  totalStars: number;
  languageCount: number;
  collectedRepoCount: number;
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

export interface CollectionUsage {
  collectionId: string;
  name: string;
  count: number;
}

export interface DashboardInsights {
  stats: DashboardStats;
  languages: NamedCount[];
  starredByYear: YearCount[];
  topics: NamedCount[];
  archiveSplit: ArchiveSplit;
  topCollections: CollectionUsage[];
}

export interface DeriveDashboardInput {
  starredRepos: StarredRepoLike[];
  collections: Collection[];
  collectionRepos: RepoCollectionLink[];
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

/** 从 stars / 集合数据聚合仪表盘洞察。 */
export function deriveDashboardInsights(input: DeriveDashboardInput): DashboardInsights {
  const { starredRepos, collections, collectionRepos } = input;

  const collectedRepoIds = new Set(collectionRepos.map((link) => link.repoId));
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

  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const collectionUsageCounts = new Map<string, number>();
  for (const link of collectionRepos) {
    collectionUsageCounts.set(
      link.collectionId,
      (collectionUsageCounts.get(link.collectionId) ?? 0) + 1,
    );
  }
  const topCollections = [...collectionUsageCounts.entries()]
    .map(([collectionId, count]) => {
      const collection = collectionById.get(collectionId);
      return {
        collectionId,
        name: collection?.name ?? collectionId,
        count,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);

  return {
    stats: {
      totalStars: starredRepos.length,
      languageCount: languages.size,
      collectedRepoCount: collectedRepoIds.size,
      collectionCount: collections.length,
    },
    languages: languageCounts,
    starredByYear,
    topics,
    archiveSplit: { active, archived },
    topCollections,
  };
}
