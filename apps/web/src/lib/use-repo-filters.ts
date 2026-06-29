import { useMemo, useState } from 'react';
import type { Repo } from './mock-data';

export type SortKey = 'starred' | 'stars' | 'updated' | 'name';
export type ArchivedFilter = 'all' | 'active' | 'archived';

export interface Filters {
  query: string;
  languages: string[];
  topics: string[];
  tagIds: string[];
  minStars: number;
  archived: ArchivedFilter;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  languages: [],
  topics: [],
  tagIds: [],
  minStars: 0,
  archived: 'all',
  sort: 'starred',
};

export function useRepoFilters(repos: Repo[]) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleInArray = (key: 'languages' | 'topics' | 'tagIds', value: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));

  const reset = () => setFilters(DEFAULT_FILTERS);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const result = repos.filter((r) => {
      if (q && !`${r.fullName} ${r.description}`.toLowerCase().includes(q)) return false;
      if (filters.languages.length && !filters.languages.includes(r.language)) return false;
      if (filters.topics.length && !filters.topics.some((t) => r.topics.includes(t))) return false;
      if (filters.tagIds.length && !filters.tagIds.some((t) => r.tagIds.includes(t))) return false;
      if (r.stargazers < filters.minStars) return false;
      if (filters.archived === 'active' && r.archived) return false;
      if (filters.archived === 'archived' && !r.archived) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (filters.sort) {
        case 'stars':
          return b.stargazers - a.stargazers;
        case 'updated':
          return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        default:
          return new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime();
      }
    });
    return result;
  }, [repos, filters]);

  const activeCount =
    filters.languages.length +
    filters.topics.length +
    filters.tagIds.length +
    (filters.minStars > 0 ? 1 : 0) +
    (filters.archived !== 'all' ? 1 : 0) +
    (filters.query ? 1 : 0);

  return { filters, update, toggleInArray, reset, filtered, activeCount };
}
