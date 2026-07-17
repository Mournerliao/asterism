import { useLayoutEffect, useRef } from 'react';
import {
  measureElementRect,
  planForwardWorkspaceMotion,
  runWorkspaceFrameAnimation,
  WORKSPACE_MOTION_EASING,
} from '../lib/readme-workspace-motion';
import {
  consumeWorkspaceMotion,
  recordWorkspaceMotionMode,
} from '../lib/readme-workspace-motion-store';
import { useMediaQuery } from './use-media-query';

/**
 * Plays the optional Quick Look → README forward transition after navigation.
 * Motion never blocks route rendering; failures fall back silently.
 */
export function useForwardWorkspaceMotion(repoId: string | undefined) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useLayoutEffect(() => {
    if (playedRef.current || !repoId) {
      return;
    }
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    const pending = consumeWorkspaceMotion('forward');
    if (pending?.direction !== 'forward' || pending.repoId !== repoId) {
      recordWorkspaceMotionMode(null);
      return;
    }
    playedRef.current = true;

    const targetRect = measureElementRect(workspace);
    const mode = planForwardWorkspaceMotion({
      reducedMotion,
      floatingQuickLook: pending.floatingQuickLook,
      sourceRect: pending.sourceRect,
      targetRect,
    });
    recordWorkspaceMotionMode(mode);
    workspace.dataset.workspaceMotion = mode;

    if (mode === 'expand' && targetRect) {
      void runWorkspaceFrameAnimation({
        element: workspace,
        mode,
        from: pending.sourceRect,
        to: targetRect,
      });
      const content = contentRef.current;
      if (content && typeof content.animate === 'function') {
        const contentAnimation = content.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 120,
          easing: WORKSPACE_MOTION_EASING,
        });
        void contentAnimation.finished.catch(() => undefined);
      }
      return;
    }

    if (mode === 'crossfade' && typeof workspace.animate === 'function') {
      const fade = workspace.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 120,
        easing: WORKSPACE_MOTION_EASING,
      });
      void fade.finished.catch(() => undefined);
    }
  }, [reducedMotion, repoId]);

  return { workspaceRef, contentRef };
}
