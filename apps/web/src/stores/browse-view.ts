import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RepoViewMode = 'grid' | 'list';

interface BrowseViewState {
  view: RepoViewMode;
  setView: (view: RepoViewMode) => void;
}

function isRepoViewMode(value: unknown): value is RepoViewMode {
  return value === 'grid' || value === 'list';
}

export function migrateBrowseViewState(persistedState: unknown): { view: RepoViewMode } {
  if (
    typeof persistedState === 'object' &&
    persistedState !== null &&
    'view' in persistedState &&
    isRepoViewMode(persistedState.view)
  ) {
    return { view: persistedState.view };
  }
  return { view: 'grid' };
}

/** Browse 视图模式偏好，持久化到 localStorage 以跨会话保留。 */
export const useBrowseViewStore = create<BrowseViewState>()(
  persist(
    (set) => ({
      view: 'grid',
      setView: (view) => set({ view }),
    }),
    {
      name: 'asterism-browse-view',
      version: 1,
      partialize: (state) => ({ view: state.view }),
      migrate: migrateBrowseViewState,
    },
  ),
);

/** 读取持久化视图（初始化用，非热路径订阅）。 */
export function getBrowseView(): RepoViewMode {
  const view = useBrowseViewStore.getState().view;
  return isRepoViewMode(view) ? view : 'grid';
}

/** 写入持久化视图（useEffect 异步路径，非点击热路径）。 */
export function setBrowseViewPersisted(view: RepoViewMode): void {
  useBrowseViewStore.getState().setView(isRepoViewMode(view) ? view : 'grid');
}
