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

  if (n < minClusterSize) {
    return { labels: new Int32Array(n).fill(-1), clusterCount: 0 };
  }

  const coreDistances = computeCoreDistances(vectors, minSamples);
  const mst = buildMst(vectors, coreDistances);
  const dendrogram = buildDendrogram(mst, n);
  const labels = extractClusters(dendrogram, n, minClusterSize);

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
 * Extract flat clusters using a condensed-tree approach.
 *
 * The condensed tree only keeps nodes with size ≥ minClusterSize.
 * When a dendrogram node splits into children where one has < minClusterSize,
 * those small-child points "fall out" as noise rather than forming a cluster.
 *
 * Stability for each condensed cluster = sum over points that belong to it of
 * (lambda_out - lambda_birth), where lambda = 1/distance.
 *
 * Final cluster selection uses EOM: a cluster is kept if its stability ≥ the
 * sum of its descendant clusters' stabilities; otherwise its children win.
 */
function extractClusters(
  dendrogram: DendrogramNode[],
  n: number,
  minClusterSize: number,
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

  const condensedClusters: number[] = [];
  const condensedChildren = new Map<number, number[]>();
  const condensedParent = new Map<number, number>();
  const clusterBirthLambda = new Map<number, number>();
  const pointCluster = new Int32Array(n).fill(-1);
  const pointLambdaOut = new Float64Array(n);

  clusterBirthLambda.set(rootId, 0);
  condensedClusters.push(rootId);

  const stack: Array<{ nodeId: number; parentCluster: number }> = [
    { nodeId: rootId, parentCluster: rootId },
  ];

  while (stack.length > 0) {
    const { nodeId, parentCluster } = stack.pop()!;
    const kids = children[nodeId];
    if (!kids || kids.length === 0) {
      if (nodeId < n) {
        pointCluster[nodeId] = parentCluster;
        pointLambdaOut[nodeId] = 0;
      }
      continue;
    }

    const dendroIdx = nodeId - n;
    const node = dendrogram[dendroIdx];
    if (!node) continue;
    const splitLambda = node.distance > 0 ? 1 / node.distance : Number.MAX_SAFE_INTEGER;

    for (const child of kids) {
      const childSize = nodeSize[child] ?? 1;
      if (childSize >= minClusterSize) {
        clusterBirthLambda.set(child, splitLambda);
        condensedClusters.push(child);
        if (!condensedChildren.has(parentCluster)) {
          condensedChildren.set(parentCluster, []);
        }
        condensedChildren.get(parentCluster)!.push(child);
        condensedParent.set(child, parentCluster);
        stack.push({ nodeId: child, parentCluster: child });
      } else {
        assignFallenPoints(
          child,
          parentCluster,
          splitLambda,
          n,
          children,
          pointCluster,
          pointLambdaOut,
        );
      }
    }
  }

  const stability = new Map<number, number>();
  for (const clusterId of condensedClusters) {
    const birth = clusterBirthLambda.get(clusterId) ?? 0;
    let stab = 0;
    for (let p = 0; p < n; p += 1) {
      if (pointCluster[p] === clusterId) {
        stab += (pointLambdaOut[p] ?? 0) - birth;
      }
    }
    stability.set(clusterId, Math.max(0, stab));
  }

  const isSelected = new Map<number, boolean>();
  for (const clusterId of condensedClusters) {
    isSelected.set(clusterId, true);
  }

  const processOrder = condensedClusters.slice().sort((a, b) => {
    return (clusterBirthLambda.get(b) ?? 0) - (clusterBirthLambda.get(a) ?? 0);
  });

  const subtreeStability = new Map<number, number>();
  for (const clusterId of condensedClusters) {
    subtreeStability.set(clusterId, stability.get(clusterId) ?? 0);
  }

  for (const clusterId of processOrder) {
    if (clusterId === rootId) continue;
    const kids = condensedChildren.get(clusterId);
    if (!kids || kids.length === 0) continue;

    let childSum = 0;
    for (const child of kids) {
      childSum += subtreeStability.get(child) ?? 0;
    }

    if ((stability.get(clusterId) ?? 0) >= childSum) {
      for (const child of kids) {
        deselectSubtree(child, condensedChildren, isSelected);
      }
    } else {
      isSelected.set(clusterId, false);
      subtreeStability.set(clusterId, childSum);
    }
  }

  isSelected.set(rootId, false);

  const labels = new Int32Array(n).fill(-1);
  let clusterCount = 0;
  const clusterLabelMap = new Map<number, number>();

  for (const clusterId of condensedClusters) {
    if (isSelected.get(clusterId) && clusterId !== rootId) {
      clusterLabelMap.set(clusterId, clusterCount);
      clusterCount += 1;
    }
  }

  for (let p = 0; p < n; p += 1) {
    let current: number | undefined = pointCluster[p] ?? -1;
    while (current !== undefined && current >= 0) {
      if (isSelected.get(current) && current !== rootId) {
        labels[p] = clusterLabelMap.get(current) ?? -1;
        break;
      }
      current = condensedParent.get(current);
    }
  }

  return { labels, clusterCount };
}

function assignFallenPoints(
  nodeId: number,
  cluster: number,
  lambda: number,
  n: number,
  children: number[][],
  pointCluster: Int32Array,
  pointLambdaOut: Float64Array,
): void {
  const stack: number[] = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current < n) {
      pointCluster[current] = cluster;
      pointLambdaOut[current] = lambda;
    } else {
      const kids = children[current];
      if (kids) {
        for (const child of kids) stack.push(child);
      }
    }
  }
}

function deselectSubtree(
  nodeId: number,
  condensedChildren: Map<number, number[]>,
  isSelected: Map<number, boolean>,
): void {
  const stack: number[] = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    isSelected.set(current, false);
    const kids = condensedChildren.get(current);
    if (kids) {
      for (const child of kids) stack.push(child);
    }
  }
}
