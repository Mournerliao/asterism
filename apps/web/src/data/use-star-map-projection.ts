import { DEFAULT_EMBEDDING_DIMENSIONS, projectAndNormalize } from '@asterism/core';
import { listRepoEmbeddings } from '@asterism/db';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { embeddingKeys } from './keys';

export interface StarMapPoint {
  repoId: string;
  x: number;
  y: number;
}

export interface StarMapProjection {
  points: StarMapPoint[];
  repoIdToIndex: Map<string, number>;
  isLoading: boolean;
}

/**
 * Fetches all user embeddings and deterministically projects them to 2D using PCA.
 * The projection is cached (staleTime 10min) and reused across view switches.
 * Only enabled when the user has opted-in and embedding backend is ready.
 */
export function useStarMapProjection(options: { enabled: boolean }): StarMapProjection {
  const { session } = useSession();
  const userId = session?.user.id;
  const enabled = options.enabled && Boolean(userId);

  const { data: embeddings, isLoading } = useQuery({
    queryKey: embeddingKeys.starMap(userId ?? 'anon'),
    enabled,
    staleTime: 10 * 60 * 1_000,
    queryFn: async () => {
      const records = await listRepoEmbeddings(supabase, userId!);
      return records;
    },
  });

  const result = useMemo((): { points: StarMapPoint[]; repoIdToIndex: Map<string, number> } => {
    if (!embeddings || embeddings.length === 0) {
      return { points: [], repoIdToIndex: new Map() };
    }

    const vectors = embeddings.map((r) => r.embedding);
    const normalized = projectAndNormalize(vectors, DEFAULT_EMBEDDING_DIMENSIONS);

    const points: StarMapPoint[] = [];
    const repoIdToIndex = new Map<string, number>();

    for (let i = 0; i < embeddings.length; i += 1) {
      const record = embeddings[i]!;
      const point = normalized[i]!;
      points.push({ repoId: record.repoId, x: point.x, y: point.y });
      repoIdToIndex.set(record.repoId, i);
    }

    return { points, repoIdToIndex };
  }, [embeddings]);

  return { ...result, isLoading: enabled && isLoading };
}
