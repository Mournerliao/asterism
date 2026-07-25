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
 * Run HDBSCAN density clustering on embedding vectors and derive named clusters.
 *
 * ADR 0026 §8: pure vector density clustering, deterministic, no preset k.
 * Operates on the full 384-dim embedding vectors (not the 2D projection).
 * Cluster centroids are computed in the projected 2D space for rendering.
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

    const vectors = embeddings.map((e) => e.embedding);
    const { labels, clusterCount } = hdbscan(vectors, { minClusterSize: 5 });

    if (clusterCount === 0) {
      return { clusters: [], clusterByRepo: new Map() };
    }

    const repoNameInputs = embeddings.map((e) => {
      const repo = repos.find((r) => r.repoId === e.repoId);
      return {
        topics: repo?.topics ?? [],
        description: repo?.description ?? null,
        fullName: repo?.fullName ?? e.repoId,
      };
    });

    const clusterLabels: ClusterLabel[] = nameClusters(labels, clusterCount, repoNameInputs);

    const pointByRepoId = new Map<string, { x: number; y: number }>();
    for (const p of points) {
      pointByRepoId.set(p.repoId, { x: p.x, y: p.y });
    }

    const clusterRepoIds: string[][] = Array.from({ length: clusterCount }, () => []);
    const clusterByRepo = new Map<string, number>();

    for (let i = 0; i < embeddings.length; i += 1) {
      const label = labels[i] ?? -1;
      if (label >= 0) {
        const repoId = embeddings[i]?.repoId;
        if (repoId) {
          clusterRepoIds[label]?.push(repoId);
          clusterByRepo.set(repoId, label);
        }
      }
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

    return { clusters, clusterByRepo };
  }, [embeddings, points, repos]);
}
