import { describe, expect, it } from 'vitest';
import { hdbscan } from './hdbscan';
import { nameCluster, nameClusters } from './naming';

/** Deterministic Gaussian blobs in D-dim for testing cluster separation. */
function makeSyntheticClusters(
  pointsPerCluster: number,
  dim: number,
  clusterCount: number,
  spread = 0.15,
): { vectors: number[][]; groundTruth: number[] } {
  let seed = 0xdeadbeef >>> 0;
  const rng = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const centers: number[][] = [];
  for (let c = 0; c < clusterCount; c += 1) {
    const center: number[] = [];
    for (let d = 0; d < dim; d += 1) center.push(gaussian());
    const norm = Math.sqrt(center.reduce((s, v) => s + v * v, 0)) || 1;
    centers.push(center.map((v) => v / norm));
  }

  const vectors: number[][] = [];
  const groundTruth: number[] = [];
  for (let c = 0; c < clusterCount; c += 1) {
    for (let i = 0; i < pointsPerCluster; i += 1) {
      const vec = centers[c]!.map((v) => v + gaussian() * spread);
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
      vectors.push(vec.map((v) => v / norm));
      groundTruth.push(c);
    }
  }
  return { vectors, groundTruth };
}

describe('hdbscan', () => {
  it('returns empty result for empty input', () => {
    const result = hdbscan([]);
    expect(result.labels.length).toBe(0);
    expect(result.clusterCount).toBe(0);
  });

  it('returns all noise for fewer points than minClusterSize', () => {
    const vectors = [
      [1, 0],
      [0, 1],
      [0.5, 0.5],
    ];
    const result = hdbscan(vectors, { minClusterSize: 5 });
    expect(result.clusterCount).toBe(0);
    expect(Array.from(result.labels)).toEqual([-1, -1, -1]);
  });

  it('finds well-separated clusters in low dimensions', () => {
    const { vectors } = makeSyntheticClusters(15, 8, 3, 0.05);
    const result = hdbscan(vectors, { minClusterSize: 5 });

    expect(result.clusterCount).toBeGreaterThanOrEqual(2);

    const assigned = Array.from(result.labels).filter((l) => l >= 0).length;
    expect(assigned).toBeGreaterThan(vectors.length * 0.5);
  });

  it('is deterministic: same input always produces same output', () => {
    const { vectors } = makeSyntheticClusters(20, 16, 3, 0.1);
    const r1 = hdbscan(vectors, { minClusterSize: 5 });
    const r2 = hdbscan(vectors, { minClusterSize: 5 });

    expect(r1.clusterCount).toBe(r2.clusterCount);
    expect(Array.from(r1.labels)).toEqual(Array.from(r2.labels));
  });

  it('allows noise points (not all points assigned)', () => {
    const { vectors: clustered } = makeSyntheticClusters(10, 8, 2, 0.03);
    const noise = Array.from({ length: 8 }, (_, i) => {
      const vec = Array.from({ length: 8 }, (__, d) => (d === i % 8 ? 5 : 0));
      return vec;
    });
    const vectors = [...clustered, ...noise];
    const result = hdbscan(vectors, { minClusterSize: 5, minSamples: 3 });

    const noiseCount = Array.from(result.labels).filter((l) => l === -1).length;
    expect(noiseCount).toBeGreaterThan(0);
  });

  it('works with 384-dimensional vectors (embedding scale)', () => {
    // spread 0.03: per-point noise norm ~0.59 in 384-dim vs unit centers,
    // keeping post-normalization contrast in the range real embeddings show.
    const { vectors } = makeSyntheticClusters(20, 384, 3, 0.03);
    const result = hdbscan(vectors, { minClusterSize: 5 });

    expect(result.clusterCount).toBeGreaterThanOrEqual(1);
    expect(result.labels.length).toBe(60);
  });

  it('handles single-point input gracefully', () => {
    const result = hdbscan([[1, 2, 3]]);
    expect(result.clusterCount).toBe(0);
    expect(Array.from(result.labels)).toEqual([-1]);
  });

  // Regression: the condensed tree must let a cluster persist through
  // noise-shedding splits. A prior implementation birthed a new cluster at
  // every large child, so EOM collapsed messy data into one giant cluster.
  it('separates unbalanced blobs plus uniform noise instead of one giant cluster', () => {
    let seed = 42 >>> 0;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const gaussian = () => {
      const u = Math.max(rng(), 1e-12);
      const v = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const normalize = (vec: number[]) => {
      const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
      return vec.map((x) => x / norm);
    };

    const dim = 64;
    const vectors: number[][] = [];
    for (const count of [150, 120, 100]) {
      const center = normalize(Array.from({ length: dim }, () => gaussian()));
      for (let i = 0; i < count; i += 1) {
        vectors.push(normalize(center.map((c) => c + 0.05 * gaussian())));
      }
    }
    for (let i = 0; i < 40; i += 1) {
      vectors.push(normalize(Array.from({ length: dim }, () => gaussian())));
    }

    const { labels, clusterCount } = hdbscan(vectors, { minClusterSize: 5 });

    expect(clusterCount).toBeGreaterThanOrEqual(3);
    const sizes = new Map<number, number>();
    for (const label of labels) {
      if (label >= 0) sizes.set(label, (sizes.get(label) ?? 0) + 1);
    }
    const largest = Math.max(...sizes.values());
    expect(largest).toBeLessThan(vectors.length * 0.8);
  });

  // Leaf selection must surface at least the granularity EOM would, and stay
  // deterministic — it is the mode the star map uses to expose fine-grained
  // thematic areas.
  it('leaf selection finds at least as many clusters as EOM', () => {
    const { vectors } = makeSyntheticClusters(30, 2, 4, 0.05);
    const eom = hdbscan(vectors, { minClusterSize: 5, clusterSelection: 'eom' });
    const leaf = hdbscan(vectors, { minClusterSize: 5, clusterSelection: 'leaf' });

    expect(leaf.clusterCount).toBeGreaterThanOrEqual(eom.clusterCount);
    expect(leaf.clusterCount).toBeGreaterThanOrEqual(4);

    const again = hdbscan(vectors, { minClusterSize: 5, clusterSelection: 'leaf' });
    expect(Array.from(again.labels)).toEqual(Array.from(leaf.labels));
  });
});

describe('nameCluster', () => {
  it('derives name from frequent topics', () => {
    const members = [
      { topics: ['react', 'typescript'], description: 'A React component', fullName: 'a/b' },
      { topics: ['react', 'hooks'], description: 'Hook utilities', fullName: 'c/d' },
      { topics: ['react', 'state'], description: 'State management', fullName: 'e/f' },
    ];
    const label = nameCluster(0, members);
    expect(label.name).toContain('react');
    expect(label.clusterId).toBe(0);
  });

  it('falls back to description words when no topics', () => {
    const members = [
      { topics: [], description: 'Machine learning framework', fullName: 'a/ml' },
      { topics: [], description: 'Deep learning framework tools', fullName: 'b/dl' },
      { topics: [], description: 'Neural network framework', fullName: 'c/nn' },
    ];
    const label = nameCluster(1, members);
    expect(label.name.length).toBeGreaterThan(0);
    expect(label.tokens.length).toBeGreaterThan(0);
  });

  it('falls back to generic name when no signal', () => {
    const members = [
      { topics: [], description: null, fullName: 'a/b' },
      { topics: [], description: null, fullName: 'c/d' },
    ];
    const label = nameCluster(2, members);
    expect(label.name).toBe('cluster-3');
  });

  it('respects usedTokens to avoid duplication', () => {
    const members = [
      { topics: ['react', 'typescript'], description: null, fullName: 'a/b' },
      { topics: ['react', 'vue'], description: null, fullName: 'c/d' },
    ];
    const used = new Set(['react']);
    const label = nameCluster(0, members, used);
    expect(label.tokens).not.toContain('react');
  });
});

describe('nameClusters', () => {
  it('names all clusters with cross-cluster deduplication', () => {
    const labels = new Int32Array([0, 0, 0, 1, 1, 1, -1]);
    const repos = [
      { topics: ['react', 'typescript'], description: null, fullName: 'a/1' },
      { topics: ['react', 'hooks'], description: null, fullName: 'a/2' },
      { topics: ['react'], description: null, fullName: 'a/3' },
      { topics: ['python', 'ml'], description: null, fullName: 'b/1' },
      { topics: ['python', 'data'], description: null, fullName: 'b/2' },
      { topics: ['python', 'science'], description: null, fullName: 'b/3' },
      { topics: ['random'], description: null, fullName: 'noise/1' },
    ];

    const result = nameClusters(labels, 2, repos);
    expect(result).toHaveLength(2);
    expect(result[0]!.clusterId).toBe(0);
    expect(result[1]!.clusterId).toBe(1);

    const allTokens = result.flatMap((r) => r.tokens);
    const uniqueTokens = new Set(allTokens);
    expect(uniqueTokens.size).toBe(allTokens.length);
  });

  it('returns empty array for zero clusters', () => {
    const result = nameClusters(new Int32Array([-1, -1]), 0, [
      { topics: [], description: null, fullName: 'a/b' },
      { topics: [], description: null, fullName: 'c/d' },
    ]);
    expect(result).toEqual([]);
  });
});
