import { create } from 'zustand';

type ListScrollState = {
  bySourceKey: Record<string, number>;
  setScrollTop: (sourceKey: string, scrollTop: number) => void;
  getScrollTop: (sourceKey: string) => number;
  clear: (sourceKey?: string) => void;
};

/** Ephemeral list scroll offsets keyed by inspector source (`browse` / `collection:id`). */
export const useListScrollStore = create<ListScrollState>((set, get) => ({
  bySourceKey: {},
  setScrollTop: (sourceKey, scrollTop) =>
    set((state) => ({
      bySourceKey: { ...state.bySourceKey, [sourceKey]: scrollTop },
    })),
  getScrollTop: (sourceKey) => get().bySourceKey[sourceKey] ?? 0,
  clear: (sourceKey) =>
    set((state) => {
      if (!sourceKey) {
        return { bySourceKey: {} };
      }
      const { [sourceKey]: _removed, ...rest } = state.bySourceKey;
      return { bySourceKey: rest };
    }),
}));
