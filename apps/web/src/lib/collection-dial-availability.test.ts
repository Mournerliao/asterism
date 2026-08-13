import { describe, expect, it } from 'vitest';
import { getCollectionDialUnavailableReason } from './collection-dial-availability';

describe('Collection Dial availability', () => {
  it('distinguishes an empty catalog from a repository already assigned everywhere', () => {
    expect(getCollectionDialUnavailableReason(0)).toBe('no_collections');
    expect(getCollectionDialUnavailableReason(3)).toBe('already_in_all');
  });
});
