import type { RepoFilter, RepoSort, RepoStatus } from '@asterism/core';
import { create } from 'zustand';

interface BrowseFiltersState {
  query: string;
  language: string | null;
  topic: string | null;
  tagIds: string[];
  minStars: number;
  pushedWithinDays: number | null;
  status: RepoStatus;
  sort: RepoSort;
  setQuery: (query: string) => void;
  setLanguage: (language: string | null) => void;
  setTopic: (topic: string | null) => void;
  toggleTagId: (tagId: string) => void;
  setMinStars: (minStars: number) => void;
  setPushedWithinDays: (days: number | null) => void;
  setStatus: (status: RepoStatus) => void;
  setSort: (sort: RepoSort) => void;
  reset: () => void;
}

const INITIAL = {
  query: '',
  language: null,
  topic: null,
  tagIds: [] as string[],
  minStars: 0,
  pushedWithinDays: null,
  status: 'all' as RepoStatus,
  sort: 'starred' as RepoSort,
};

/** Browse 的筛选 / 搜索 / 排序状态（内存态，跨导航保留，不持久化到磁盘）。 */
export const useBrowseFilters = create<BrowseFiltersState>((set) => ({
  ...INITIAL,
  setQuery: (query) => set({ query }),
  setLanguage: (language) => set({ language }),
  setTopic: (topic) => set({ topic }),
  toggleTagId: (tagId) =>
    set((state) => ({
      tagIds: state.tagIds.includes(tagId)
        ? state.tagIds.filter((id) => id !== tagId)
        : [...state.tagIds, tagId],
    })),
  setMinStars: (minStars) => set({ minStars }),
  setPushedWithinDays: (pushedWithinDays) => set({ pushedWithinDays }),
  setStatus: (status) => set({ status }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ ...INITIAL }),
}));

/** 把 store 状态映射为 core 的 RepoFilter（不含排序）。 */
export function toRepoFilter(state: BrowseFiltersState): RepoFilter {
  return {
    query: state.query,
    language: state.language,
    topic: state.topic,
    minStars: state.minStars,
    pushedWithinDays: state.pushedWithinDays,
    status: state.status,
    tagIds: state.tagIds.length > 0 ? state.tagIds : undefined,
  };
}
