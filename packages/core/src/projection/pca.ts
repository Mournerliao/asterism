/**
 * Deterministic PCA projection: top-2 principal components via power iteration.
 *
 * ADR 0026 §7 law #2: "坐标用确定性语义投影，不是随机力导向" — same batch → same
 * coordinates every load. Fixed init + no RNG guarantees bit-identical output
 * across runs, sessions, and devices.
 *
 * Accepts `number[][]` (from DB layer's `listRepoEmbeddings`) rather than
 * prototype's `Float32Array[]` for production ergonomics.
 */

export interface Point2D {
  x: number;
  y: number;
}

function computeMean(vectors: number[][], dim: number): Float64Array {
  const mean = new Float64Array(dim);
  for (const vec of vectors) {
    for (let d = 0; d < dim; d += 1) {
      mean[d] = (mean[d] ?? 0) + (vec[d] ?? 0);
    }
  }
  const inv = 1 / Math.max(1, vectors.length);
  for (let d = 0; d < dim; d += 1) {
    mean[d] = (mean[d] ?? 0) * inv;
  }
  return mean;
}

/**
 * Gram–Schmidt: remove projections onto existing components, then L2-normalize.
 */
function orthonormalize(v: Float64Array, basis: Float64Array[], dim: number): void {
  for (const b of basis) {
    let dot = 0;
    for (let d = 0; d < dim; d += 1) {
      dot += (v[d] ?? 0) * (b[d] ?? 0);
    }
    for (let d = 0; d < dim; d += 1) {
      v[d] = (v[d] ?? 0) - dot * (b[d] ?? 0);
    }
  }
  let sum = 0;
  for (let d = 0; d < dim; d += 1) {
    const val = v[d] ?? 0;
    sum += val * val;
  }
  const norm = Math.sqrt(sum) || 1;
  for (let d = 0; d < dim; d += 1) {
    v[d] = (v[d] ?? 0) / norm;
  }
}

/**
 * Top-`k` principal directions via implicit power iteration on the covariance
 * (v ← Xᵀ(Xv)), deflating each found component. Deterministic init → deterministic
 * eigenvector signs, so repeated runs are bit-identical (delta === 0).
 */
function topPrincipalComponents(
  vectors: number[][],
  dim: number,
  mean: Float64Array,
  k: number,
  iterations: number,
): Float64Array[] {
  const n = vectors.length;
  const components: Float64Array[] = [];

  for (let c = 0; c < k; c += 1) {
    let v = new Float64Array(dim);
    for (let d = 0; d < dim; d += 1) {
      v[d] = Math.sin((d + 1) * (c + 1) * 0.7) + 0.001 * ((d % 5) - 2);
    }
    orthonormalize(v, components, dim);

    for (let iter = 0; iter < iterations; iter += 1) {
      const next = new Float64Array(dim);
      for (let i = 0; i < n; i += 1) {
        const vec = vectors[i];
        if (!vec) continue;
        let dot = 0;
        for (let d = 0; d < dim; d += 1) {
          dot += ((vec[d] ?? 0) - (mean[d] ?? 0)) * (v[d] ?? 0);
        }
        for (let d = 0; d < dim; d += 1) {
          next[d] = (next[d] ?? 0) + ((vec[d] ?? 0) - (mean[d] ?? 0)) * dot;
        }
      }
      orthonormalize(next, components, dim);
      v = next;
    }
    components.push(v);
  }
  return components;
}

/**
 * Deterministic linear projection: top-2 principal components.
 * Returns raw (unnormalized) 2D coordinates in PCA space.
 */
export function pca2d(vectors: number[][], dim: number): Point2D[] {
  if (vectors.length === 0) {
    return [];
  }
  if (dim < 2) {
    return vectors.map((v) => ({ x: v[0] ?? 0, y: v[1] ?? 0 }));
  }
  const mean = computeMean(vectors, dim);
  const comps = topPrincipalComponents(vectors, dim, mean, 2, 64);
  const pc0 = comps[0] ?? new Float64Array(dim);
  const pc1 = comps[1] ?? new Float64Array(dim);
  return vectors.map((vec) => {
    let x = 0;
    let y = 0;
    for (let d = 0; d < dim; d += 1) {
      const centered = (vec[d] ?? 0) - (mean[d] ?? 0);
      x += centered * (pc0[d] ?? 0);
      y += centered * (pc1[d] ?? 0);
    }
    return { x, y };
  });
}
