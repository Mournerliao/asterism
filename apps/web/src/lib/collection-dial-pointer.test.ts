import { describe, expect, it } from 'vitest';
import {
  exceedsCollectionDialDragThreshold,
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
});
