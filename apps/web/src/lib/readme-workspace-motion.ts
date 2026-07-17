export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type WorkspaceMotionMode = 'expand' | 'contract' | 'crossfade' | 'immediate';

export type AnimationOutcome = 'played' | 'skipped' | 'failed';

export const WORKSPACE_MOTION_DURATION_MS = 220;
export const WORKSPACE_MOTION_EASING = 'cubic-bezier(0.25, 1, 0.5, 1)';

export function measureElementRect(element: Element | null): RectLike | null {
  if (!element) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function planForwardWorkspaceMotion(input: {
  reducedMotion: boolean;
  floatingQuickLook: boolean;
  sourceRect: RectLike | null;
  targetRect: RectLike | null;
}): WorkspaceMotionMode {
  if (input.reducedMotion) {
    return 'immediate';
  }
  if (!input.floatingQuickLook || !input.sourceRect || !input.targetRect) {
    return 'crossfade';
  }
  return 'expand';
}

export function canAttemptReverseContraction(input: {
  sourceRestored: boolean;
  sameRepo: boolean;
  triggerVisible: boolean;
  quickLookVisible: boolean;
}): boolean {
  return input.sourceRestored && input.sameRepo && input.triggerVisible && input.quickLookVisible;
}

export function planReverseWorkspaceMotion(input: {
  reducedMotion: boolean;
  sourceRestored: boolean;
  sameRepo: boolean;
  triggerVisible: boolean;
  quickLookVisible: boolean;
  sourceRect: RectLike | null;
  targetRect: RectLike | null;
}): WorkspaceMotionMode {
  if (input.reducedMotion) {
    return 'immediate';
  }
  if (!canAttemptReverseContraction(input) || !input.sourceRect || !input.targetRect) {
    return 'crossfade';
  }
  return 'contract';
}

/** FLIP keyframes from `from` (first) to `to` (last). Opacity stays 1 — content crossfade is separate. */
export function createFlipKeyframes(from: RectLike, to: RectLike): Keyframe[] {
  const scaleX = from.width / to.width;
  const scaleY = from.height / to.height;
  const translateX = from.left + from.width / 2 - (to.left + to.width / 2);
  const translateY = from.top + from.height / 2 - (to.top + to.height / 2);
  return [
    {
      opacity: 1,
      transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`,
    },
    {
      opacity: 1,
      transform: 'none',
    },
  ];
}

export async function runWorkspaceFrameAnimation(input: {
  element: HTMLElement;
  mode: WorkspaceMotionMode;
  from: RectLike;
  to: RectLike;
  durationMs?: number;
  easing?: string;
}): Promise<AnimationOutcome> {
  if (input.mode !== 'expand' && input.mode !== 'contract') {
    return 'skipped';
  }
  if (typeof input.element.animate !== 'function') {
    return 'skipped';
  }

  try {
    const animation = input.element.animate(createFlipKeyframes(input.from, input.to), {
      duration: input.durationMs ?? WORKSPACE_MOTION_DURATION_MS,
      easing: input.easing ?? WORKSPACE_MOTION_EASING,
      fill: 'none',
    });
    await animation.finished;
    return 'played';
  } catch {
    return 'failed';
  }
}
