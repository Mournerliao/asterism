import type { StarredRepoRecord } from '@asterism/db';
import { create } from 'zustand';

interface RepoDrawerState {
  record: StarredRepoRecord | null;
  open: (record: StarredRepoRecord) => void;
  close: () => void;
}

/** 仓库详情抽屉的全局选中态：任意页面的卡片点击都能打开同一个 Drawer。 */
export const useRepoDrawer = create<RepoDrawerState>((set) => ({
  record: null,
  open: (record) => set({ record }),
  close: () => set({ record: null }),
}));
