export function toggleSelection(selection: ReadonlySet<string>, repoId: string): Set<string> {
  const next = new Set(selection);
  if (next.has(repoId)) next.delete(repoId);
  else next.add(repoId);
  return next;
}

export function selectAllSnapshot(repoIds: readonly string[]): Set<string> {
  return new Set(repoIds);
}

export function addSelection(
  selection: ReadonlySet<string>,
  repoIds: readonly string[],
): Set<string> {
  const next = new Set(selection);
  for (const repoId of repoIds) next.add(repoId);
  return next;
}

export function removeSelection(
  selection: ReadonlySet<string>,
  repoIds: readonly string[],
): Set<string> {
  const next = new Set(selection);
  for (const repoId of repoIds) next.delete(repoId);
  return next;
}

export function clearSelection(): Set<string> {
  return new Set();
}

export interface BulkSelectionController {
  repoIds: ReadonlySet<string>;
  onToggle: (repoId: string) => void;
}
