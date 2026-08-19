export type RepoCardCollection = {
  id: string;
  name: string;
};

export type RepoContextItem =
  | { kind: 'collection'; key: string; label: string }
  | { kind: 'topic'; key: string; label: string };

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function buildRepoContextItems(
  collections: readonly RepoCardCollection[],
  topics: readonly string[],
): RepoContextItem[] {
  const items: RepoContextItem[] = [];
  const seen = new Set<string>();

  for (const collection of collections) {
    const label = collection.name.trim();
    const normalized = normalizeLabel(label);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    items.push({ kind: 'collection', key: `collection:${collection.id}`, label });
  }

  for (const topic of topics) {
    const label = topic.trim();
    const normalized = normalizeLabel(label);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    items.push({ kind: 'topic', key: `topic:${normalized}`, label });
  }

  return items;
}
