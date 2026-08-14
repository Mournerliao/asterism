export type CollectionDialUnavailableReason =
  | 'no_collections'
  | 'already_in_all'
  | 'active_multi_operation'
  | 'operation_state_unavailable';

export function getCollectionDialUnavailableReason(
  collectionCount: number,
): CollectionDialUnavailableReason {
  return collectionCount === 0 ? 'no_collections' : 'already_in_all';
}

export function getMultiCollectionDialBlockReason(input: {
  hasUnfinishedOperation?: boolean;
  isPending: boolean;
  isError: boolean;
}): Extract<
  CollectionDialUnavailableReason,
  'active_multi_operation' | 'operation_state_unavailable'
> | null {
  if (input.hasUnfinishedOperation) return 'active_multi_operation';
  return input.isPending || input.isError ? 'operation_state_unavailable' : null;
}
