import type { ClusterLabel } from '@asterism/core';
import { hdbscan, nameClusters } from '@asterism/core';
import type { RepoEmbeddingRecord } from '@asterism/db';
import { useMemo } from 'react';

export interface StarMapCluster {
  clusterId: number;
  name: string;
  tokens: string[];
  repoIds: string[];
  /** Centroid in normalized [0,1]² canvas space (average of member points). */
  centroidX: number;
  centroidY: number;
}

export interface StarMapClusters {
  clusters: StarMapCluster[];
  clusterByRepo: Map<string, number>;
}

/**
 * Run HDBSCAN density clustering on the star-map projection and derive named clusters.
 *
 * ADR 0026 §8: pure vector density clustering, deterministic, no preset k.
 * Clusters in the projected 2D space rather than raw 384-dim vectors: e5
 * embeddings suffer from distance concentration in high dimension (the
 * condensed tree degenerates into a chain with no true splits → zero
 * clusters), while the deterministic PCA projection is still a pure-vector
 * derivation and keeps regions aligned with what the map actually shows.
 * Leaf selection surfaces fine-grained thematic areas instead of the two
 * macro halves EOM converges to on this data.
 */
export function useStarMapClusters(
  embeddings: RepoEmbeddingRecord[] | undefined,
  points: Array<{ repoId: string; x: number; y: number }>,
  repos: Array<{ repoId: string; fullName: string; description: string | null; topics: string[] }>,
): StarMapClusters {
  return useMemo(() => {
    if (!embeddings || embeddings.length === 0 || points.length === 0) {
      return { clusters: [], clusterByRepo: new Map() };
    }

    const vectors = points.map((p) => [p.x, p.y]);
    // 随集合规模缓升的最小簇容量：小库保留细粒度，大库避免碎片化。
    const minClusterSize = Math.min(25, Math.max(5, Math.floor(points.length / 64)));
    const { labels, clusterCount } = hdbscan(vectors, {
      minClusterSize,
      clusterSelection: 'leaf',
    });

    if (clusterCount === 0) {
      return { clusters: [], clusterByRepo: new Map() };
    }

    const repoById = new Map(repos.map((r) => [r.repoId, r]));
    const repoNameInputs = points.map((p) => {
      const repo = repoById.get(p.repoId);
      return {
        topics: repo?.topics ?? [],
        description: repo?.description ?? null,
        fullName: repo?.fullName ?? p.repoId,
      };
    });

    const clusterLabels: ClusterLabel[] = nameClusters(labels, clusterCount, repoNameInputs);

    const clusterRepoIds: string[][] = Array.from({ length: clusterCount }, () => []);
    const clusterByRepo = new Map<string, number>();

    for (let i = 0; i < points.length; i += 1) {
      const label = labels[i] ?? -1;
      if (label >= 0) {
        const repoId = points[i]?.repoId;
        if (repoId) {
          clusterRepoIds[label]?.push(repoId);
          clusterByRepo.set(repoId, label);
        }
      }
    }

    const pointByRepoId = new Map<string, { x: number; y: number }>();
    for (const p of points) {
      pointByRepoId.set(p.repoId, { x: p.x, y: p.y });
    }

    const clusters: StarMapCluster[] = clusterLabels.map((cl) => {
      const memberRepoIds = clusterRepoIds[cl.clusterId] ?? [];
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      for (const repoId of memberRepoIds) {
        const pt = pointByRepoId.get(repoId);
        if (pt) {
          sumX += pt.x;
          sumY += pt.y;
          count += 1;
        }
      }
      return {
        clusterId: cl.clusterId,
        name: cl.name,
        tokens: cl.tokens,
        repoIds: memberRepoIds,
        centroidX: count > 0 ? sumX / count : 0.5,
        centroidY: count > 0 ? sumY / count : 0.5,
      };
    });

    if (import.meta.env.DEV && typeof window !== 'undefined') {
      // 临时审计句柄：仅用于开发期簇纯度审查，随审计结束移除。
      Object.assign(window, {
        __asterismClusterAudit: clusters.map((c) => ({
          name: c.name,
          size: c.repoIds.length,
          members: c.repoIds.map((id) => {
            const repo = repoById.get(id);
            return {
              fullName: repo?.fullName ?? id,
              topics: repo?.topics ?? [],
              description: repo?.description ?? null,
            };
          }),
        })),
      });
    }

    return { clusters, clusterByRepo };
  }, [embeddings, points, repos]);
}
