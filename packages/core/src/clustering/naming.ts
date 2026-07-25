/**
 * Zero-dependency cluster naming: derive area labels from repos' topics and
 * high-frequency words in descriptions.
 *
 * ADR 0026 §8: "命名：默认零依赖——从簇内 repos 的 topics / 高频词提取区域标签；
 * BYOK generation 只是可选增益"
 */

export interface ClusterNameInput {
  topics: string[];
  description: string | null;
  fullName: string;
}

export interface ClusterLabel {
  /** Cluster index (0-based, matching hdbscan output). */
  clusterId: number;
  /** Human-readable label derived from topics/keywords. */
  name: string;
  /** Individual tokens that contributed to the name (for deduplication). */
  tokens: string[];
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'it',
  'as',
  'be',
  'was',
  'are',
  'this',
  'that',
  'which',
  'not',
  'no',
  'if',
  'so',
  'up',
  'out',
  'do',
  'has',
  'had',
  'have',
  'will',
  'can',
  'could',
  'would',
  'should',
  'just',
  'more',
  'very',
  'also',
  'about',
  'into',
  'over',
  'after',
  'all',
  'any',
  'each',
  'some',
  'such',
  'than',
  'too',
  'own',
  'its',
  'been',
  'being',
  'both',
  'there',
  'here',
  'when',
  'where',
  'how',
  'what',
  'who',
  'you',
  'your',
  'we',
  'our',
  'they',
  'their',
  'my',
  'me',
  'us',
  'them',
  'he',
  'she',
  'him',
  'her',
  'his',
  'using',
  'based',
  'use',
  'new',
  'one',
  'two',
  'make',
  'made',
  'simple',
  'easy',
  'fast',
  'lightweight',
  'minimal',
  'awesome',
  'best',
  'great',
  'good',
  'old',
  'big',
  'small',
  'high',
  'low',
  'full',
  'open',
  'source',
  'free',
  'via',
  'etc',
  'like',
]);

const MIN_TOKEN_LENGTH = 2;
const MAX_LABEL_TOKENS = 3;

/**
 * Derive labels for each cluster based on topic frequency and high-frequency
 * description words. Returns one ClusterLabel per cluster, sorted by clusterId.
 */
export function nameCluster(
  clusterId: number,
  members: ClusterNameInput[],
  usedTokens?: Set<string>,
): ClusterLabel {
  const topicCounts = new Map<string, number>();
  const wordCounts = new Map<string, number>();

  for (const member of members) {
    for (const topic of member.topics) {
      const normalized = topic.toLowerCase().trim();
      if (normalized.length >= MIN_TOKEN_LENGTH) {
        topicCounts.set(normalized, (topicCounts.get(normalized) ?? 0) + 1);
      }
    }

    if (member.description) {
      const words = extractWords(member.description);
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
    }
  }

  const candidates: Array<{ token: string; score: number }> = [];

  for (const [topic, count] of topicCounts) {
    if (usedTokens?.has(topic)) continue;
    candidates.push({ token: topic, score: count * 3 });
  }

  for (const [word, count] of wordCounts) {
    if (usedTokens?.has(word)) continue;
    if (topicCounts.has(word)) continue;
    if (count >= 2) {
      candidates.push({ token: word, score: count });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.token.localeCompare(b.token));

  const selected: string[] = [];
  const selectedSet = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= MAX_LABEL_TOKENS) break;
    if (selectedSet.has(candidate.token)) continue;

    const isSimilar = selected.some(
      (s) => s.includes(candidate.token) || candidate.token.includes(s),
    );
    if (isSimilar) continue;

    selected.push(candidate.token);
    selectedSet.add(candidate.token);
  }

  const name = selected.length > 0 ? selected.join(' · ') : `cluster-${clusterId + 1}`;

  return { clusterId, name, tokens: selected };
}

/**
 * Name all clusters, ensuring cross-cluster token deduplication.
 * Larger clusters get naming priority.
 */
export function nameClusters(
  labels: Int32Array,
  clusterCount: number,
  repos: ClusterNameInput[],
): ClusterLabel[] {
  if (clusterCount === 0) return [];

  const clusterMembers: ClusterNameInput[][] = Array.from({ length: clusterCount }, () => []);
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i] ?? -1;
    if (label >= 0 && label < clusterCount) {
      clusterMembers[label]?.push(repos[i]!);
    }
  }

  const indexed = clusterMembers.map((members, idx) => ({ idx, size: members.length }));
  indexed.sort((a, b) => b.size - a.size);

  const usedTokens = new Set<string>();
  const results: ClusterLabel[] = [];

  for (const { idx } of indexed) {
    const label = nameCluster(idx, clusterMembers[idx]!, usedTokens);
    for (const token of label.tokens) {
      usedTokens.add(token);
    }
    results.push(label);
  }

  results.sort((a, b) => a.clusterId - b.clusterId);
  return results;
}

function extractWords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(w));
  return tokens;
}
