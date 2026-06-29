import type { Repo } from '@/data/mock';

export type ArchivedFilter = 'all' | 'active' | 'archived';
export type UpdatedFilter = 'any' | 'week' | 'month' | 'quarter' | 'year' | 'stale';
export type SortKey = 'starredAt' | 'stars' | 'pushedAt' | 'name';

export interface FilterState {
  languages: string[];
  topics: string[];
  minStars: number;
  archived: ArchivedFilter;
  updated: UpdatedFilter;
  tagIds: string[];
}

export const emptyFilters: FilterState = {
  languages: [],
  topics: [],
  minStars: 0,
  archived: 'all',
  updated: 'any',
  tagIds: [],
};

export function activeFilterCount(f: FilterState): number {
  let n = 0;
  n += f.languages.length;
  n += f.topics.length;
  n += f.tagIds.length;
  if (f.minStars > 0) n += 1;
  if (f.archived !== 'all') n += 1;
  if (f.updated !== 'any') n += 1;
  return n;
}

const UPDATED_DAYS: Record<UpdatedFilter, number | null> = {
  any: null,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
  stale: -365, // negative marker = older than a year
};

export function applyFilters(
  list: Repo[],
  filters: FilterState,
  search: string,
  repoTags: Record<string, string[]>,
): Repo[] {
  const q = search.trim().toLowerCase();
  const now = Date.now();

  return list.filter((r) => {
    if (q) {
      const hay = `${r.fullName} ${r.description} ${r.topics.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.languages.length && !filters.languages.includes(r.language)) return false;
    if (filters.topics.length && !filters.topics.some((t) => r.topics.includes(t))) return false;
    if (filters.minStars > 0 && r.stargazers < filters.minStars) return false;
    if (filters.archived === 'active' && r.archived) return false;
    if (filters.archived === 'archived' && !r.archived) return false;

    if (filters.tagIds.length) {
      const ids = repoTags[r.id] ?? [];
      if (!filters.tagIds.some((t) => ids.includes(t))) return false;
    }

    if (filters.updated !== 'any') {
      const days = UPDATED_DAYS[filters.updated];
      const ageDays = (now - new Date(r.pushedAt).getTime()) / 86_400_000;
      if (days != null) {
        if (days >= 0 && ageDays > days) return false;
        if (days < 0 && ageDays < -days) return false;
      }
    }
    return true;
  });
}

export function sortRepos(list: Repo[], key: SortKey): Repo[] {
  const arr = [...list];
  switch (key) {
    case 'stars':
      return arr.sort((a, b) => b.stargazers - a.stargazers);
    case 'pushedAt':
      return arr.sort((a, b) => +new Date(b.pushedAt) - +new Date(a.pushedAt));
    case 'name':
      return arr.sort((a, b) => a.fullName.localeCompare(b.fullName));
    default:
      return arr.sort((a, b) => +new Date(b.starredAt) - +new Date(a.starredAt));
  }
}
