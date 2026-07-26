/**
 * HDBSCAN-class density clustering for the Asterism emergent clusters feature.
 *
 * ADR 0026 §8: "纯向量的密度聚类（HDBSCAN 一类：自动定簇数 + 允许「孤立点」不属任何簇），
 * 不预设 k、不混 topic / language"
 *
 * Algorithm pipeline:
 *   1. Compute core distances (k-NN distance for each point, k = minSamples)
 *   2. Build Minimum Spanning Tree via Prim's with mutual reachability distance
 *   3. Build single-linkage dendrogram from sorted MST edges
 *   4. Extract flat clusters using excess-of-mass (EOM) stability
 *
 * Deterministic: same input → same output (no RNG, fixed iteration order).
 * Noise points receive label -1.
 */

export interface HdbscanOptions {
  /**
   * Minimum number of points to form a cluster.
   * Smaller values find more (smaller) clusters; larger values are more conservative.
   * Default: 5
   */
  minClusterSize?: number;

  /**
   * Core distance neighborhood size. Controls how conservative the clustering is.
   * Higher values smooth out more noise. Default: same as minClusterSize.
   */
  minSamples?: number;

  /**
   * Flat-cluster selection from the condensed tree (same knob as scikit-learn
   * HDBSCAN `cluster_selection_method`). 'eom' picks the most stable clusters
   * and tends toward few macro regions; 'leaf' picks the finest-grained leaf
   * clusters, better for surfacing many small thematic areas. Default: 'eom'.
   */
  clusterSelection?: 'eom' | 'leaf';
}

export interface HdbscanResult {
  /** Cluster label for each input point. -1 = noise (not in any cluster). */
  labels: Int32Array;
  /** Number of clusters found (excluding noise). */
  clusterCount: number;
}

interface MstEdge {
  u: number;
  v: number;
  weight: number;
}

interface DendrogramNode {
  left: number;
  right: number;
  distance: number;
  size: number;
}

/**
 * Run HDBSCAN density clustering on high-dimensional vectors.
 *
 * Accepts raw embedding vectors (number[][]) and returns cluster labels.
 * Uses Euclidean distance — for L2-normalized embeddings this is monotonically
 * related to cosine distance.
 */
export function hdbscan(vectors: number[][], options: HdbscanOptions = {}): HdbscanResult {
  const n = vectors.length;
  if (n === 0) {
    return { labels: new Int32Array(0), clusterCount: 0 };
  }

  const minClusterSize = Math.max(2, options.minClusterSize ?? 5);
  const minSamples = Math.max(1, options.minSamples ?? minClusterSize);
  const clusterSelection = options.clusterSelection ?? 'eom';

  if (n < minClusterSize) {
    return { labels: new Int32Array(n).fill(-1), clusterCount: 0 };
  }

  const coreDistances = computeCoreDistances(vectors, minSamples);
  const mst = buildMst(vectors, coreDistances);
  const dendrogram = buildDendrogram(mst, n);
  const labels = extractClusters(dendrogram, n, minClusterSize, clusterSelection);

  return labels;
}

/**
 * Compute Euclidean distance between two vectors.
 * Uses Float64 arithmetic for numerical stability.
 */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const dim = a.length;
  for (let d = 0; d < dim; d += 1) {
    const diff = (a[d] ?? 0) - (b[d] ?? 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Compute core distance for each point: distance to the k-th nearest neighbor.
 * O(n² × d) — acceptable for personal-scale collections (≤5000 points).
 */
function computeCoreDistances(vectors: number[][], k: number): Float64Array {
  const n = vectors.length;
  const coreDistances = new Float64Array(n);
  const effectiveK = Math.min(k, n - 1);

  for (let i = 0; i < n; i += 1) {
    const distances: number[] = [];
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      distances.push(euclideanDistance(vectors[i]!, vectors[j]!));
    }
    distances.sort((a, b) => a - b);
    coreDistances[i] = distances[effectiveK - 1] ?? 0;
  }

  return coreDistances;
}

/**
 * Build MST using Prim's algorithm with mutual reachability distance.
 * mrd(a, b) = max(core_dist(a), core_dist(b), dist(a, b))
 * O(n²) — avoids storing the full distance matrix.
 */
function buildMst(vectors: number[][], coreDistances: Float64Array): MstEdge[] {
  const n = vectors.length;
  if (n <= 1) return [];

  const inMst = new Uint8Array(n);
  const minWeight = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
  const minNeighbor = new Int32Array(n).fill(-1);
  const edges: MstEdge[] = [];

  inMst[0] = 1;
  for (let j = 1; j < n; j += 1) {
    const dist = euclideanDistance(vectors[0]!, vectors[j]!);
    const mrd = Math.max(coreDistances[0] ?? 0, coreDistances[j] ?? 0, dist);
    minWeight[j] = mrd;
    minNeighbor[j] = 0;
  }

  for (let step = 1; step < n; step += 1) {
    let bestIdx = -1;
    let bestWeight = Number.POSITIVE_INFINITY;
    for (let j = 0; j < n; j += 1) {
      if (!inMst[j] && (minWeight[j] ?? Number.POSITIVE_INFINITY) < bestWeight) {
        bestWeight = minWeight[j] ?? Number.POSITIVE_INFINITY;
        bestIdx = j;
      }
    }

    if (bestIdx < 0) break;
    inMst[bestIdx] = 1;
    edges.push({ u: minNeighbor[bestIdx] ?? 0, v: bestIdx, weight: bestWeight });

    for (let j = 0; j < n; j += 1) {
      if (inMst[j]) continue;
      const dist = euclideanDistance(vectors[bestIdx]!, vectors[j]!);
      const mrd = Math.max(coreDistances[bestIdx] ?? 0, coreDistances[j] ?? 0, dist);
      if (mrd < (minWeight[j] ?? Number.POSITIVE_INFINITY)) {
        minWeight[j] = mrd;
        minNeighbor[j] = bestIdx;
      }
    }
  }

  return edges;
}

/**
 * Build single-linkage dendrogram from MST edges (sorted by weight).
 * Uses union-find to track component merges.
 */
function buildDendrogram(mst: MstEdge[], n: number): DendrogramNode[] {
  const sorted = mst.slice().sort((a, b) => a.weight - b.weight);

  const parent = new Int32Array(n + sorted.length);
  const size = new Int32Array(n + sorted.length);
  for (let i = 0; i < n; i += 1) {
    parent[i] = i;
    size[i] = 1;
  }

  function find(x: number): number {
    let root = x;
    while (parent[root] !== root) root = parent[root] ?? root;
    let current = x;
    while (current !== root) {
      const next = parent[current] ?? current;
      parent[current] = root;
      current = next;
    }
    return root;
  }

  const dendrogram: DendrogramNode[] = [];
  let nextId = n;

  for (const edge of sorted) {
    const rootU = find(edge.u);
    const rootV = find(edge.v);
    if (rootU === rootV) continue;

    const nodeSize = (size[rootU] ?? 1) + (size[rootV] ?? 1);
    dendrogram.push({
      left: rootU,
      right: rootV,
      distance: edge.weight,
      size: nodeSize,
    });

    parent[rootU] = nextId;
    parent[rootV] = nextId;
    parent[nextId] = nextId;
    size[nextId] = nodeSize;
    nextId += 1;
  }

  return dendrogram;
}

/**
 * Extract flat clusters via the HDBSCAN condensed tree + EOM selection.
 *
 * Condensed-tree semantics: walking the dendrogram top-down, a cluster only
 * *splits* when both children have ≥ minClusterSize points (a "true split",
 * which births two new condensed clusters). If one side is smaller, those
 * points fall out as noise at that lambda and the cluster itself persists
 * into the large side — it does NOT become a new cluster. This persistence is
 * what lets a real cluster accumulate stability across noise-shedding levels.
 *
 * Stability(C) = Σ over points passing through C of (λ_leave − λ_birth),
 * where λ = 1/distance and λ_leave is when the point falls out of C (as noise
 * or because C dies in a true split).
 *
 * EOM: bottom-up, a cluster is kept if its own stability ≥ the summed
 * stability of its descendant selection; the root is never selectable.
 * Leaf: keep only condensed-tree leaves (finest stable granularity).
 */
function extractClusters(
  dendrogram: DendrogramNode[],
  n: number,
  minClusterSize: number,
  clusterSelection: 'eom' | 'leaf',
): HdbscanResult {
  if (dendrogram.length === 0) {
    return { labels: new Int32Array(n).fill(-1), clusterCount: 0 };
  }

  const totalNodes = n + dendrogram.length;
  const children: number[][] = Array.from({ length: totalNodes }, () => []);
  const nodeSize = new Int32Array(totalNodes);
  for (let i = 0; i < n; i += 1) {
    nodeSize[i] = 1;
  }
  for (let i = 0; i < dendrogram.length; i += 1) {
    const node = dendrogram[i]!;
    const nodeId = n + i;
    nodeSize[nodeId] = node.size;
    children[nodeId]!.push(node.left, node.right);
  }

  const rootId = n + dendrogram.length - 1;

  // Condensed clusters, indexed by creation order (0 = root cluster).
  const clusterParent: number[] = [-1];
  const clusterBirth: number[] = [0];
  const clusterStability: number[] = [0];
  const clusterChildren: number[][] = [[]];
  // Condensed cluster each point fell out of (−1 until assigned).
  const pointCluster = new Int32Array(n).fill(-1);

  const stack: Array<{ nodeId: number; clusterIdx: number }> = [{ nodeId: rootId, clusterIdx: 0 }];

  while (stack.length > 0) {
    const { nodeId, clusterIdx } = stack.pop()!;
    if (nodeId < n) {
      // Only reachable in degenerate trees; the point exits with no λ range.
      pointCluster[nodeId] = clusterIdx;
      continue;
    }

    const node = dendrogram[nodeId - n];
    if (!node) continue;
    const splitLambda = node.distance > 0 ? 1 / node.distance : Number.MAX_SAFE_INTEGER;
    const birth = clusterBirth[clusterIdx] ?? 0;
    const leftSize = nodeSize[node.left] ?? 1;
    const rightSize = nodeSize[node.right] ?? 1;
    const leftBig = leftSize >= minClusterSize;
    const rightBig = rightSize >= minClusterSize;

    if (leftBig && rightBig) {
      // True split: the current cluster dies; every remaining point leaves here.
      clusterStability[clusterIdx] =
        (clusterStability[clusterIdx] ?? 0) + (leftSize + rightSize) * (splitLambda - birth);
      for (const child of [node.left, node.right]) {
        const newIdx = clusterParent.length;
        clusterParent.push(clusterIdx);
        clusterBirth.push(splitLambda);
        clusterStability.push(0);
        clusterChildren.push([]);
        clusterChildren[clusterIdx]!.push(newIdx);
        stack.push({ nodeId: child, clusterIdx: newIdx });
      }
    } else if (leftBig || rightBig) {
      // Noise shed: small side falls out, the cluster persists into the big side.
      const bigChild = leftBig ? node.left : node.right;
      const smallChild = leftBig ? node.right : node.left;
      const smallSize = leftBig ? rightSize : leftSize;
      clusterStability[clusterIdx] =
        (clusterStability[clusterIdx] ?? 0) + smallSize * (splitLambda - birth);
      assignFallenPoints(smallChild, clusterIdx, n, children, pointCluster);
      stack.push({ nodeId: bigChild, clusterIdx });
    } else {
      // Both sides too small: the cluster dies; all points fall out here.
      clusterStability[clusterIdx] =
        (clusterStability[clusterIdx] ?? 0) + (leftSize + rightSize) * (splitLambda - birth);
      assignFallenPoints(node.left, clusterIdx, n, children, pointCluster);
      assignFallenPoints(node.right, clusterIdx, n, children, pointCluster);
    }
  }

  // EOM selection, bottom-up. Children are always created after their parent,
  // so reverse creation order visits every child before its parent.
  // Leaf selection keeps only condensed-tree leaves instead.
  const clusterTotal = clusterParent.length;
  const selected = new Array<boolean>(clusterTotal).fill(true);
  selected[0] = false;

  if (clusterSelection === 'leaf') {
    for (let i = 1; i < clusterTotal; i += 1) {
      selected[i] = clusterChildren[i]!.length === 0;
    }
  } else {
    const subtreeStability = clusterStability.slice();

    for (let i = clusterTotal - 1; i >= 1; i -= 1) {
      const kids = clusterChildren[i]!;
      if (kids.length === 0) continue;
      let childSum = 0;
      for (const child of kids) {
        childSum += subtreeStability[child] ?? 0;
      }
      if ((clusterStability[i] ?? 0) >= childSum) {
        for (const child of kids) {
          deselectSubtree(child, clusterChildren, selected);
        }
      } else {
        selected[i] = false;
        subtreeStability[i] = childSum;
      }
    }
  }

  const labels = new Int32Array(n).fill(-1);
  let clusterCount = 0;
  const clusterLabelMap = new Map<number, number>();
  for (let i = 1; i < clusterTotal; i += 1) {
    if (selected[i]) {
      clusterLabelMap.set(i, clusterCount);
      clusterCount += 1;
    }
  }

  // A point belongs to the selected ancestor (if any) of the cluster it fell
  // out of; points that fell out above every selected cluster are noise.
  for (let p = 0; p < n; p += 1) {
    let current = pointCluster[p] ?? -1;
    while (current >= 0) {
      if (selected[current]) {
        labels[p] = clusterLabelMap.get(current) ?? -1;
        break;
      }
      current = clusterParent[current] ?? -1;
    }
  }

  return { labels, clusterCount };
}

function assignFallenPoints(
  nodeId: number,
  clusterIdx: number,
  n: number,
  children: number[][],
  pointCluster: Int32Array,
): void {
  const stack: number[] = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current < n) {
      pointCluster[current] = clusterIdx;
    } else {
      const kids = children[current];
      if (kids) {
        for (const child of kids) stack.push(child);
      }
    }
  }
}

function deselectSubtree(
  clusterIdx: number,
  clusterChildren: number[][],
  selected: boolean[],
): void {
  const stack: number[] = [clusterIdx];
  while (stack.length > 0) {
    const current = stack.pop()!;
    selected[current] = false;
    const kids = clusterChildren[current];
    if (kids) {
      for (const child of kids) stack.push(child);
    }
  }
}
