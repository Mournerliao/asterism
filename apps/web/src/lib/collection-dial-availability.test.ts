import { describe, expect, it } from 'vitest';
import {
  getCollectionDialUnavailableReason,
  getMultiCollectionDialBlockReason,
} from './collection-dial-availability';

describe('Collection Dial availability', () => {
  it('distinguishes an empty catalog from a repository already assigned everywhere', () => {
    expect(getCollectionDialUnavailableReason(0)).toBe('no_collections');
    expect(getCollectionDialUnavailableReason(3)).toBe('already_in_all');
  });

  it('fails multi pickup closed until the durable ledger state is known', () => {
    expect(getMultiCollectionDialBlockReason({ isPending: true, isError: false })).toBe(
      'operation_state_unavailable',
    );
    expect(getMultiCollectionDialBlockReason({ isPending: false, isError: true })).toBe(
      'operation_state_unavailable',
    );
    expect(
      getMultiCollectionDialBlockReason({
        hasUnfinishedOperation: true,
        isPending: false,
        isError: false,
      }),
    ).toBe('active_multi_operation');
  });
});
