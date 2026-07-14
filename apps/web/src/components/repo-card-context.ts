import type { Tag } from '@asterism/core';

export type RepoContextItem =
  | { kind: 'tag'; key: string; label: string; color: string | null }
  | { kind: 'topic'; key: string; label: string };

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function buildRepoContextItems(
  tags: readonly Tag[],
  topics: readonly string[],
): RepoContextItem[] {
  const items: RepoContextItem[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const label = tag.name.trim();
    const normalized = normalizeLabel(label);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    items.push({ kind: 'tag', key: `tag:${tag.id}`, label, color: tag.color });
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
