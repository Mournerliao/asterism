import { afterEach, describe, expect, it } from 'vitest';
import {
  armForwardWorkspaceMotion,
  armReverseWorkspaceMotion,
  clearWorkspaceMotionState,
  consumeWorkspaceMotion,
  peekPendingWorkspaceMotion,
} from './readme-workspace-motion-store';

afterEach(() => {
  clearWorkspaceMotionState();
});

describe('workspace motion store', () => {
  it('arms and consumes a single forward expand intent', () => {
    armForwardWorkspaceMotion({
      direction: 'forward',
      repoId: 'repo-1',
      sourceRect: { left: 10, top: 20, width: 480, height: 600 },
      floatingQuickLook: true,
    });
    expect(peekPendingWorkspaceMotion()?.direction).toBe('forward');
    expect(consumeWorkspaceMotion('forward')?.repoId).toBe('repo-1');
    expect(consumeWorkspaceMotion('forward')).toBeNull();
  });

  it('keeps reverse intents distinct from forward', () => {
    armReverseWorkspaceMotion({
      direction: 'reverse',
      repoId: 'repo-2',
      sourceRect: { left: 0, top: 0, width: 900, height: 700 },
    });
    expect(consumeWorkspaceMotion('forward')).toBeNull();
    expect(consumeWorkspaceMotion('reverse')?.repoId).toBe('repo-2');
  });
});
