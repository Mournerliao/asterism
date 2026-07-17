import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canAttemptReverseContraction,
  createFlipKeyframes,
  planForwardWorkspaceMotion,
  planReverseWorkspaceMotion,
  type RectLike,
  runWorkspaceFrameAnimation,
} from './readme-workspace-motion';

const floating: RectLike = { left: 800, top: 200, width: 480, height: 640 };
const workspace: RectLike = { left: 240, top: 64, width: 960, height: 800 };

describe('planForwardWorkspaceMotion', () => {
  it('expands from a measured floating Quick Look into the workspace', () => {
    expect(
      planForwardWorkspaceMotion({
        reducedMotion: false,
        floatingQuickLook: true,
        sourceRect: floating,
        targetRect: workspace,
      }),
    ).toBe('expand');
  });

  it('uses a restrained crossfade when the floating source is unavailable', () => {
    expect(
      planForwardWorkspaceMotion({
        reducedMotion: false,
        floatingQuickLook: true,
        sourceRect: null,
        targetRect: workspace,
      }),
    ).toBe('crossfade');
  });

  it('does not fabricate a spatial expand from the mobile sheet', () => {
    expect(
      planForwardWorkspaceMotion({
        reducedMotion: false,
        floatingQuickLook: false,
        sourceRect: floating,
        targetRect: workspace,
      }),
    ).toBe('crossfade');
  });

  it('removes spatial transforms under reduced motion', () => {
    expect(
      planForwardWorkspaceMotion({
        reducedMotion: true,
        floatingQuickLook: true,
        sourceRect: floating,
        targetRect: workspace,
      }),
    ).toBe('immediate');
  });
});

describe('planReverseWorkspaceMotion and contraction eligibility', () => {
  it('contracts only after restore when the same repo trigger and Quick Look are visible', () => {
    expect(
      canAttemptReverseContraction({
        sourceRestored: true,
        sameRepo: true,
        triggerVisible: true,
        quickLookVisible: true,
      }),
    ).toBe(true);

    expect(
      planReverseWorkspaceMotion({
        reducedMotion: false,
        sourceRestored: true,
        sameRepo: true,
        triggerVisible: true,
        quickLookVisible: true,
        sourceRect: workspace,
        targetRect: floating,
      }),
    ).toBe('contract');
  });

  it('falls back to crossfade for stale or unavailable sources', () => {
    expect(
      canAttemptReverseContraction({
        sourceRestored: true,
        sameRepo: true,
        triggerVisible: false,
        quickLookVisible: true,
      }),
    ).toBe(false);

    expect(
      planReverseWorkspaceMotion({
        reducedMotion: false,
        sourceRestored: true,
        sameRepo: true,
        triggerVisible: false,
        quickLookVisible: true,
        sourceRect: workspace,
        targetRect: floating,
      }),
    ).toBe('crossfade');
  });

  it('uses immediate switching under reduced motion', () => {
    expect(
      planReverseWorkspaceMotion({
        reducedMotion: true,
        sourceRestored: true,
        sameRepo: true,
        triggerVisible: true,
        quickLookVisible: true,
        sourceRect: workspace,
        targetRect: floating,
      }),
    ).toBe('immediate');
  });
});

describe('createFlipKeyframes', () => {
  it('keeps frame movement math separate from content opacity', () => {
    const keyframes = createFlipKeyframes(floating, workspace);
    expect(keyframes).toHaveLength(2);
    expect(keyframes[0]).toMatchObject({ opacity: 1 });
    expect(keyframes[1]).toMatchObject({ opacity: 1, transform: 'none' });
    expect(String(keyframes[0]?.transform)).toContain('translate3d');
    expect(String(keyframes[0]?.transform)).toContain('scale');
  });
});

describe('runWorkspaceFrameAnimation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves without blocking when Web Animations is missing', async () => {
    const element = { animate: undefined } as unknown as HTMLElement;

    await expect(
      runWorkspaceFrameAnimation({
        element,
        mode: 'expand',
        from: floating,
        to: workspace,
      }),
    ).resolves.toBe('skipped');
  });

  it('resolves when the animation rejects or is interrupted', async () => {
    const element = {
      animate: vi.fn(() => ({
        finished: Promise.reject(new DOMException('Aborted', 'AbortError')),
      })),
    } as unknown as HTMLElement;

    await expect(
      runWorkspaceFrameAnimation({
        element,
        mode: 'contract',
        from: workspace,
        to: floating,
      }),
    ).resolves.toBe('failed');
  });

  it('skips spatial work for immediate and crossfade modes', async () => {
    const animate = vi.fn();
    const element = { animate } as unknown as HTMLElement;

    await expect(
      runWorkspaceFrameAnimation({
        element,
        mode: 'immediate',
        from: floating,
        to: workspace,
      }),
    ).resolves.toBe('skipped');
    await expect(
      runWorkspaceFrameAnimation({
        element,
        mode: 'crossfade',
        from: floating,
        to: workspace,
      }),
    ).resolves.toBe('skipped');
    expect(animate).not.toHaveBeenCalled();
  });
});
