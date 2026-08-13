// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import {
  exceedsCollectionDialDragThreshold,
  findCollectionDialFocusTarget,
  shouldSuppressCollectionDialClick,
} from './collection-dial-pointer';

describe('Collection Dial pointer threshold', () => {
  it('preserves click semantics below seven pixels and begins dragging at seven pixels', () => {
    expect(exceedsCollectionDialDragThreshold({ x: 10, y: 10 }, { x: 16.99, y: 10 })).toBe(false);
    expect(exceedsCollectionDialDragThreshold({ x: 10, y: 10 }, { x: 17, y: 10 })).toBe(true);
  });

  it('suppresses only the synthetic click adjacent to a drag, not a later click', () => {
    expect(shouldSuppressCollectionDialClick(true, 120, 500)).toBe(true);
    expect(shouldSuppressCollectionDialClick(true, 501, 500)).toBe(false);
    expect(shouldSuppressCollectionDialClick(false, 120, 500)).toBe(false);
  });

  it('restores focus only to the grip in the active Browse view', () => {
    document.body.innerHTML = `
      <div data-repo-view-active="false"><button data-collection-dial-grip="repo-1"></button></div>
      <div data-repo-view-active="true"><button data-collection-dial-grip="repo-1"></button></div>
    `;
    const hidden = document.querySelector<HTMLButtonElement>(
      '[data-repo-view-active="false"] button',
    );
    const active = document.querySelector<HTMLButtonElement>(
      '[data-repo-view-active="true"] button',
    );

    expect(findCollectionDialFocusTarget(document, 'repo-1', hidden)).toBe(active);
  });
});
