export function toggleSelection(selection: ReadonlySet<string>, repoId: string): Set<string> {
  const next = new Set(selection);
  if (next.has(repoId)) next.delete(repoId);
  else next.add(repoId);
  return next;
}

export function selectAllSnapshot(repoIds: readonly string[]): Set<string> {
  return new Set(repoIds);
}

export function clearSelection(): Set<string> {
  return new Set();
}

export interface BulkSelectionController {
  repoIds: ReadonlySet<string>;
  onToggle: (repoId: string) => void;
}
