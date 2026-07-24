// PROTOTYPE — throwaway (#21 石墨语义星图 spike). Delete once the verdict is captured.
//
// Deterministic 2D projections of high-dim vectors, plus a determinism probe.
// The whole point of this file is ADR 0026 §7 anti-slop law #2:
//   "坐标用确定性语义投影，不是随机力导向" — same batch → same coordinates every load.
// So we compare three mechanics on identical input:
//   - pca2d               : linear, deterministic by construction (top-2 principal comps)
//   - deterministicRefine : PCA-init + fixed-iteration neighbor attraction (nonlinear, still deterministic)
//   - randomForce2d       : random-init force layout (the anti-pattern; reseed → different map)

export interface Point2D {
  x: number;
  y: number;
}

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

function computeMean(vectors: Float32Array[], dim: number): Float32Array {
  const mean = new Float32Array(dim);
  for (const vec of vectors) {
    for (let d = 0; d < dim; d += 1) {
      mean[d] = mean[d]! + vec[d]!;
    }
  }
  const inv = 1 / Math.max(1, vectors.length);
  for (let d = 0; d < dim; d += 1) {
    mean[d] = mean[d]! * inv;
  }
  return mean;
}

// Top-`k` principal directions via implicit power iteration on the covariance
// (v ← Xᵀ(Xv)), deflating each found component. Deterministic init → deterministic
// eigenvector signs, so repeated runs are bit-identical (delta === 0).
function topPrincipalComponents(
  vectors: Float32Array[],
  dim: number,
  mean: Float32Array,
  k: number,
  iterations: number,
): Float32Array[] {
  const n = vectors.length;
  const components: Float32Array[] = [];

  for (let c = 0; c < k; c += 1) {
    // Fixed, non-degenerate init pattern (no RNG) — the source of determinism.
    let v = new Float32Array(dim);
    for (let d = 0; d < dim; d += 1) {
      v[d] = Math.sin((d + 1) * (c + 1) * 0.7) + 0.001 * ((d % 5) - 2);
    }
    orthonormalize(v, components, dim);

    for (let iter = 0; iter < iterations; iter += 1) {
      const next = new Float32Array(dim);
      for (let i = 0; i < n; i += 1) {
        const vec = vectors[i]!;
        let dot = 0;
        for (let d = 0; d < dim; d += 1) {
          dot += (vec[d]! - mean[d]!) * v[d]!;
        }
        for (let d = 0; d < dim; d += 1) {
          next[d] = next[d]! + (vec[d]! - mean[d]!) * dot;
        }
      }
      orthonormalize(next, components, dim);
      v = next;
    }
    components.push(v);
  }
  return components;
}

/** Gram–Schmidt: remove projections onto existing components, then L2-normalize (in place). */
function orthonormalize(v: Float32Array, basis: Float32Array[], dim: number): void {
  for (const b of basis) {
    let dot = 0;
    for (let d = 0; d < dim; d += 1) {
      dot += v[d]! * b[d]!;
    }
    for (let d = 0; d < dim; d += 1) {
      v[d] = v[d]! - dot * b[d]!;
    }
  }
  let sum = 0;
  for (let d = 0; d < dim; d += 1) {
    sum += v[d]! * v[d]!;
  }
  const norm = Math.sqrt(sum) || 1;
  for (let d = 0; d < dim; d += 1) {
    v[d] = v[d]! / norm;
  }
}

/** Project every vector onto the given components → coordinates in component space. */
function projectOnto(
  vectors: Float32Array[],
  dim: number,
  mean: Float32Array,
  components: Float32Array[],
): number[][] {
  return vectors.map((vec) =>
    components.map((comp) => {
      let dot = 0;
      for (let d = 0; d < dim; d += 1) {
        dot += (vec[d]! - mean[d]!) * comp[d]!;
      }
      return dot;
    }),
  );
}

/** Deterministic linear projection: top-2 principal components. */
export function pca2d(vectors: Float32Array[], dim: number): Point2D[] {
  if (vectors.length === 0) {
    return [];
  }
  const mean = computeMean(vectors, dim);
  const comps = topPrincipalComponents(vectors, dim, mean, 2, 64);
  const coords = projectOnto(vectors, dim, mean, comps);
  return coords.map(([x, y]) => ({ x: x ?? 0, y: y ?? 0 }));
}

/** Project to top-`p` PCA dims (a deterministic, cheap space for the neighbor graph). */
function pcaProject(vectors: Float32Array[], dim: number, p: number): number[][] {
  const mean = computeMean(vectors, dim);
  const comps = topPrincipalComponents(vectors, dim, mean, p, 48);
  return projectOnto(vectors, dim, mean, comps);
}

export interface RefineOptions {
  /** neighbors per point in the high-dim (PCA-reduced) space. */
  neighbors?: number;
  iterations?: number;
  /** PCA dims used for the neighbor graph (UMAP-style preprocessing). */
  pcaDims?: number;
}

// Deterministic nonlinear refinement: start from the PCA-2D layout, then for a fixed
// number of iterations pull each point toward its high-dim nearest neighbors and apply
// mild uniform repulsion. No RNG anywhere → repeated runs are identical.
export function deterministicRefine(
  vectors: Float32Array[],
  dim: number,
  options: RefineOptions = {},
): Point2D[] {
  const n = vectors.length;
  if (n === 0) {
    return [];
  }
  const neighbors = options.neighbors ?? 10;
  const iterations = options.iterations ?? 220;
  const pcaDims = options.pcaDims ?? 8;

  const reduced = pcaProject(vectors, dim, Math.min(pcaDims, dim));
  const layout = pca2d(vectors, dim);

  // Exact kNN in the reduced space (fine for the capped N this variant runs at).
  const neighborIndex: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    const dists: { j: number; d: number }[] = [];
    const a = reduced[i]!;
    for (let j = 0; j < n; j += 1) {
      if (j === i) {
        continue;
      }
      let sum = 0;
      const b = reduced[j]!;
      for (let d = 0; d < a.length; d += 1) {
        const diff = a[d]! - b[d]!;
        sum += diff * diff;
      }
      dists.push({ j, d: sum });
    }
    dists.sort((p, q) => p.d - q.d);
    neighborIndex.push(dists.slice(0, neighbors).map((entry) => entry.j));
  }

  for (let iter = 0; iter < iterations; iter += 1) {
    const alpha = 0.08 * (1 - iter / iterations); // cooling attraction rate
    const next = layout.map((p) => ({ x: p.x, y: p.y }));
    for (let i = 0; i < n; i += 1) {
      let fx = 0;
      let fy = 0;
      const neigh = neighborIndex[i]!;
      const li = layout[i]!;
      for (const j of neigh) {
        const lj = layout[j]!;
        fx += lj.x - li.x;
        fy += lj.y - li.y;
      }
      const inv = 1 / Math.max(1, neigh.length);
      const ni = next[i]!;
      ni.x += alpha * fx * inv;
      ni.y += alpha * fy * inv;
    }
    for (let i = 0; i < n; i += 1) {
      layout[i] = next[i]!;
    }
  }
  return layout;
}

// The anti-pattern, kept only to make law #2 visible: random-init force layout.
// Deterministic *given a seed*, but there is no natural seed across sessions/devices,
// so a fresh seed each session scrambles the map — muscle memory impossible.
export function randomForce2d(vectors: Float32Array[], dim: number, seed: number): Point2D[] {
  const n = vectors.length;
  if (n === 0) {
    return [];
  }
  const rng = mulberry32(seed);
  const reduced = pcaProject(vectors, dim, Math.min(8, dim));
  const layout: Point2D[] = [];
  for (let i = 0; i < n; i += 1) {
    layout.push({ x: rng() * 2 - 1, y: rng() * 2 - 1 });
  }
  const neighbors = 8;
  const neighborIndex: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    const dists: { j: number; d: number }[] = [];
    const a = reduced[i]!;
    for (let j = 0; j < n; j += 1) {
      if (j === i) {
        continue;
      }
      let sum = 0;
      const b = reduced[j]!;
      for (let d = 0; d < a.length; d += 1) {
        const diff = a[d]! - b[d]!;
        sum += diff * diff;
      }
      dists.push({ j, d: sum });
    }
    dists.sort((p, q) => p.d - q.d);
    neighborIndex.push(dists.slice(0, neighbors).map((entry) => entry.j));
  }
  for (let iter = 0; iter < 160; iter += 1) {
    const alpha = 0.06 * (1 - iter / 160);
    for (let i = 0; i < n; i += 1) {
      let fx = 0;
      let fy = 0;
      const neigh = neighborIndex[i]!;
      const li = layout[i]!;
      for (const j of neigh) {
        const lj = layout[j]!;
        fx += lj.x - li.x;
        fy += lj.y - li.y;
      }
      const inv = 1 / neigh.length;
      li.x += alpha * fx * inv + (rng() - 0.5) * 0.004;
      li.y += alpha * fy * inv + (rng() - 0.5) * 0.004;
    }
  }
  return layout;
}

/**
 * Determinism probe: max & RMS per-point coordinate delta between two layouts,
 * after normalizing both to [0,1]². 0 means the projection is reproducible.
 */
export function projectionDelta(a: Point2D[], b: Point2D[]): { max: number; rms: number } {
  const na = normalizeLayout(a);
  const nb = normalizeLayout(b);
  const count = Math.min(na.length, nb.length);
  let max = 0;
  let sumSq = 0;
  for (let i = 0; i < count; i += 1) {
    const pa = na[i]!;
    const pb = nb[i]!;
    const dx = pa.x - pb.x;
    const dy = pa.y - pb.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > max) {
      max = d;
    }
    sumSq += d * d;
  }
  return { max, rms: count > 0 ? Math.sqrt(sumSq / count) : 0 };
}

/** Fit a layout into the unit square [0,1]², preserving aspect ratio. */
export function normalizeLayout(points: Point2D[]): Point2D[] {
  if (points.length === 0) {
    return [];
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const padX = (span - (maxX - minX)) / 2;
  const padY = (span - (maxY - minY)) / 2;
  return points.map((p) => ({
    x: (p.x - minX + padX) / span,
    y: (p.y - minY + padY) / span,
  }));
}
