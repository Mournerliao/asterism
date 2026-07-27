export interface RepoSemanticVector {
  repoId: string;
  embedding: readonly number[];
}

export interface SemanticNeighbor {
  repoId: string;
  similarity: number;
}

const CANDIDATE_POOL_SIZE = 12;
const RESULT_LIMIT = 5;

function cosineSimilarity(
  left: readonly number[],
  right: readonly number[],
  leftNorm: number,
  rightNorm: number,
): number {
  if (left.length !== right.length || leftNorm === 0 || rightNorm === 0) {
    return Number.NEGATIVE_INFINITY;
  }
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return dot / (leftNorm * rightNorm);
}

function vectorNorm(vector: readonly number[]): number {
  let squared = 0;
  for (const value of vector) {
    squared += value * value;
  }
  return Math.sqrt(squared);
}

function compareNeighbors(left: SemanticNeighbor, right: SemanticNeighbor): number {
  return right.similarity - left.similarity || left.repoId.localeCompare(right.repoId);
}

/**
 * Returns a conservative local semantic neighborhood.
 *
 * A candidate is accepted only when both repositories appear in each other's
 * nearest-neighbor pool. The relationship may legitimately be empty.
 */
export function findMutualSemanticNeighbors(
  vectors: readonly RepoSemanticVector[],
  anchorRepoId: string,
): SemanticNeighbor[] {
  const uniqueVectors = new Map<string, readonly number[]>();
  for (const item of vectors) {
    if (!uniqueVectors.has(item.repoId) && item.embedding.length > 0) {
      uniqueVectors.set(item.repoId, item.embedding);
    }
  }
  const anchor = uniqueVectors.get(anchorRepoId);
  if (!anchor) {
    return [];
  }

  const norms = new Map<string, number>();
  for (const [repoId, vector] of uniqueVectors) {
    norms.set(repoId, vectorNorm(vector));
  }

  const nearestFor = (repoId: string): SemanticNeighbor[] => {
    const source = uniqueVectors.get(repoId);
    const sourceNorm = norms.get(repoId) ?? 0;
    if (!source || sourceNorm === 0) {
      return [];
    }
    const nearest: SemanticNeighbor[] = [];
    for (const [candidateId, candidate] of uniqueVectors) {
      if (candidateId === repoId) {
        continue;
      }
      const similarity = cosineSimilarity(
        source,
        candidate,
        sourceNorm,
        norms.get(candidateId) ?? 0,
      );
      if (Number.isFinite(similarity)) {
        nearest.push({ repoId: candidateId, similarity });
      }
    }
    nearest.sort(compareNeighbors);
    return nearest.slice(0, CANDIDATE_POOL_SIZE);
  };

  const candidates = nearestFor(anchorRepoId);
  const mutual: SemanticNeighbor[] = [];
  for (const candidate of candidates) {
    if (nearestFor(candidate.repoId).some((item) => item.repoId === anchorRepoId)) {
      mutual.push(candidate);
      if (mutual.length === RESULT_LIMIT) {
        break;
      }
    }
  }
  return mutual;
}
