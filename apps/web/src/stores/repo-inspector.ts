import type { StarredRepoRecord } from '@asterism/db';
import { create } from 'zustand';

export type RepoOpenModality = 'keyboard' | 'pointer';

export type RepoInspectorContext = {
  sourceKey: string;
  records: readonly StarredRepoRecord[];
};

type RepoInspectorState = {
  record: StarredRepoRecord | null;
  context: RepoInspectorContext | null;
  setSelection: (record: StarredRepoRecord, context: RepoInspectorContext) => void;
  setContext: (context: RepoInspectorContext) => void;
  close: () => void;
};

export function findRepoIndex(
  context: RepoInspectorContext | null,
  repoId: string | undefined,
): number {
  if (!context || !repoId) {
    return -1;
  }
  return context.records.findIndex((item) => item.repoId === repoId);
}

export function adjacentRepo(
  context: RepoInspectorContext | null,
  repoId: string | undefined,
  direction: -1 | 1,
): StarredRepoRecord | null {
  const index = findRepoIndex(context, repoId);
  if (index < 0) {
    return null;
  }
  return context?.records[index + direction] ?? null;
}

export const useRepoInspectorStore = create<RepoInspectorState>((set) => ({
  record: null,
  context: null,
  setSelection: (record, context) => set({ record, context }),
  setContext: (context) => set({ context }),
  close: () => set({ record: null, context: null }),
}));
