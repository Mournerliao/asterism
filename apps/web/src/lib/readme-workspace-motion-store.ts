import { create } from 'zustand';
import type { RectLike, WorkspaceMotionMode } from './readme-workspace-motion';

export type PendingForwardMotion = {
  direction: 'forward';
  repoId: string;
  sourceRect: RectLike;
  floatingQuickLook: boolean;
};

export type PendingReverseMotion = {
  direction: 'reverse';
  repoId: string;
  sourceRect: RectLike;
};

export type PendingWorkspaceMotion = PendingForwardMotion | PendingReverseMotion;

type WorkspaceMotionState = {
  pending: PendingWorkspaceMotion | null;
  lastMode: WorkspaceMotionMode | null;
  armForward: (motion: PendingForwardMotion) => void;
  armReverse: (motion: PendingReverseMotion) => void;
  consume: (direction: PendingWorkspaceMotion['direction']) => PendingWorkspaceMotion | null;
  setLastMode: (mode: WorkspaceMotionMode | null) => void;
  clear: () => void;
};

export const useWorkspaceMotionStore = create<WorkspaceMotionState>((set, get) => ({
  pending: null,
  lastMode: null,
  armForward: (motion) => set({ pending: motion }),
  armReverse: (motion) => set({ pending: motion }),
  consume: (direction) => {
    const pending = get().pending;
    if (!pending || pending.direction !== direction) {
      return null;
    }
    set({ pending: null });
    return pending;
  },
  setLastMode: (mode) => set({ lastMode: mode }),
  clear: () => set({ pending: null, lastMode: null }),
}));

export function armForwardWorkspaceMotion(motion: PendingForwardMotion): void {
  useWorkspaceMotionStore.getState().armForward(motion);
}

export function armReverseWorkspaceMotion(motion: PendingReverseMotion): void {
  useWorkspaceMotionStore.getState().armReverse(motion);
}

export function consumeWorkspaceMotion(
  direction: PendingWorkspaceMotion['direction'],
): PendingWorkspaceMotion | null {
  return useWorkspaceMotionStore.getState().consume(direction);
}

export function peekPendingWorkspaceMotion(): PendingWorkspaceMotion | null {
  return useWorkspaceMotionStore.getState().pending;
}

export function recordWorkspaceMotionMode(mode: WorkspaceMotionMode | null): void {
  useWorkspaceMotionStore.getState().setLastMode(mode);
}

export function clearWorkspaceMotionState(): void {
  useWorkspaceMotionStore.getState().clear();
}
