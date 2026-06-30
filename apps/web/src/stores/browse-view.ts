import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RepoViewMode = 'grid' | 'list';

interface BrowseViewState {
  view: RepoViewMode;
  setView: (view: RepoViewMode) => void;
}

/** Browse 视图模式（卡片/列表），持久化到 localStorage 以跨会话保留偏好。 */
export const useBrowseView = create<BrowseViewState>()(
  persist(
    (set) => ({
      view: 'grid',
      setView: (view) => set({ view }),
    }),
    { name: 'asterism-browse-view' },
  ),
);
