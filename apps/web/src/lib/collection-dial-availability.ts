export type CollectionDialUnavailableReason = 'no_collections' | 'already_in_all';

export function getCollectionDialUnavailableReason(
  collectionCount: number,
): CollectionDialUnavailableReason {
  return collectionCount === 0 ? 'no_collections' : 'already_in_all';
}
