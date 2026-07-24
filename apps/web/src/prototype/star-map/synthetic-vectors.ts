// PROTOTYPE — throwaway (#21 石墨语义星图 spike). Delete once the verdict is captured.
//
// Deterministic synthetic embedding vectors: K gaussian blobs in D-dim space
// (plus a few isolated points). We know the ground-truth cluster of every point,
// so we can judge whether a 2D projection actually preserves semantic neighborhoods
// — without dragging in the real embedding worker / DB vectors.

export interface SyntheticVectorSet {
  /** length N, each of dimension `dim`, L2-normalized like real e5 output. */
  vectors: Float32Array[];
  /** ground-truth blob id per point; -1 marks an intentional isolated point. */
  labels: number[];
  dim: number;
}

/** mulberry32 — small, fast, fully deterministic PRNG (same seed → same stream). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box–Muller, driven by a seeded uniform source. */
function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = rng();
  }
  while (v === 0) {
    v = rng();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function normalize(vec: Float32Array): void {
  let sum = 0;
  for (let i = 0; i < vec.length; i += 1) {
    sum += vec[i]! * vec[i]!;
  }
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < vec.length; i += 1) {
    vec[i] = vec[i]! / norm;
  }
}

export interface SyntheticOptions {
  count: number;
  dim?: number;
  clusters?: number;
  /** within-blob standard deviation before normalization. */
  spread?: number;
  isolatedRatio?: number;
  seed?: number;
}

export function makeSyntheticVectors(options: SyntheticOptions): SyntheticVectorSet {
  const dim = options.dim ?? 384;
  const clusters = Math.max(1, options.clusters ?? 8);
  const spread = options.spread ?? 0.34;
  const isolatedRatio = options.isolatedRatio ?? 0.04;
  const rng = mulberry32(options.seed ?? 0x51617a);

  // Fixed cluster centers (deterministic given the seed): random directions in D-space.
  const centers: Float32Array[] = [];
  for (let c = 0; c < clusters; c += 1) {
    const center = new Float32Array(dim);
    for (let d = 0; d < dim; d += 1) {
      center[d] = gaussian(rng);
    }
    normalize(center);
    centers.push(center);
  }

  const vectors: Float32Array[] = [];
  const labels: number[] = [];
  for (let i = 0; i < options.count; i += 1) {
    const vec = new Float32Array(dim);
    if (rng() < isolatedRatio) {
      for (let d = 0; d < dim; d += 1) {
        vec[d] = gaussian(rng);
      }
      labels.push(-1);
    } else {
      const c = Math.floor(rng() * clusters) % clusters;
      const center = centers[c]!;
      for (let d = 0; d < dim; d += 1) {
        vec[d] = center[d]! + gaussian(rng) * spread;
      }
      labels.push(c);
    }
    normalize(vec);
    vectors.push(vec);
  }

  return { vectors, labels, dim };
}
