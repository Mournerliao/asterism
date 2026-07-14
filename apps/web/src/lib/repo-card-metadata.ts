import type { CollectionRepoLink } from '@asterism/db';

export function countCollectionsByRepo(links: readonly CollectionRepoLink[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const link of links) {
    counts.set(link.repoId, (counts.get(link.repoId) ?? 0) + 1);
  }
  return counts;
}

export function toRepoIdSet(repoIds: readonly string[]): Set<string> {
  return new Set(repoIds);
}

export function updateNoteRepoIds(
  current: readonly string[] | undefined,
  repoId: string,
  hasNote: boolean,
): string[] | undefined {
  if (!current) {
    return current;
  }

  const repoIds = new Set(current);
  if (hasNote) {
    repoIds.add(repoId);
  } else {
    repoIds.delete(repoId);
  }
  return [...repoIds];
}
