import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { memo, useEffect, useState } from 'react';
import type { StarMapCluster } from '../data/use-star-map-clusters';
import type { StarMapPoint } from '../data/use-star-map-projection';
import type { BulkSelectionController } from '../lib/bulk-selection';
import type { RepoViewMode } from '../stores/browse-view';
import type { RepoOpenModality } from '../stores/repo-inspector';
import { RepoCollection } from './repo-collection';
import { StarMapView } from './star-map-view';

const LIST_VIEW_MODES = ['grid', 'list'] as const satisfies readonly RepoViewMode[];

export const BrowseRepoList = memo(function BrowseRepoList({
  view,
  records,
  semanticStartIndex,
  tagsByRepo,
  collectionCountByRepo,
  noteRepoIds,
  selectedRepoId,
  onSelect,
  scrollElement,
  bulkSelection,
  starMapPoints,
  starMapRepoIdToIndex,
  starMapLoading,
  starMapEmbeddingReady,
  starMapHitRepoIds,
  starMapNeighborRepoIds,
  onStarMapSelectRepo,
  starMapClusters,
  starMapClusterByRepo,
  onStarMapPromoteCluster,
}: {
  view: RepoViewMode;
  records: StarredRepoRecord[];
  semanticStartIndex?: number | null;
  tagsByRepo?: Map<string, Tag[]>;
  collectionCountByRepo?: Map<string, number>;
  noteRepoIds?: Set<string>;
  selectedRepoId?: string;
  onSelect?: (record: StarredRepoRecord, modality: RepoOpenModality) => void;
  scrollElement?: HTMLElement | null;
  bulkSelection?: BulkSelectionController;
  starMapPoints: StarMapPoint[];
  starMapRepoIdToIndex: Map<string, number>;
  starMapLoading: boolean;
  starMapEmbeddingReady: boolean;
  starMapHitRepoIds: Set<string>;
  starMapNeighborRepoIds: Set<string>;
  onStarMapSelectRepo?: (repoId: string | null) => void;
  starMapClusters: StarMapCluster[];
  starMapClusterByRepo: Map<string, number>;
  onStarMapPromoteCluster?: (cluster: StarMapCluster) => void;
}) {
  // 访问过的视图保持挂载，后续切换只做显隐，避开虚拟列表重建成本。
  const [mountedViews, setMountedViews] = useState<ReadonlySet<RepoViewMode>>(
    () => new Set([view]),
  );

  useEffect(() => {
    setMountedViews((prev) => (prev.has(view) ? prev : new Set(prev).add(view)));
  }, [view]);

  return (
    <div className="relative min-h-[280px] w-full">
      {LIST_VIEW_MODES.map((mode) =>
        mountedViews.has(mode) ? (
          <div key={mode} className={mode === view ? undefined : 'hidden'}>
            <RepoCollection
              records={records}
              semanticStartIndex={semanticStartIndex}
              view={mode}
              tagsByRepo={tagsByRepo}
              collectionCountByRepo={collectionCountByRepo}
              noteRepoIds={noteRepoIds}
              selectedRepoId={selectedRepoId}
              onSelect={onSelect}
              scrollElement={mode === view ? scrollElement : null}
              bulkSelection={bulkSelection}
            />
          </div>
        ) : null,
      )}
      {mountedViews.has('star-map') ? (
        <div className={view === 'star-map' ? 'h-[calc(100svh-220px)] min-h-[400px]' : 'hidden'}>
          <StarMapView
            points={starMapPoints}
            repoIdToIndex={starMapRepoIdToIndex}
            isLoading={starMapLoading}
            hitRepoIds={starMapHitRepoIds}
            neighborRepoIds={starMapNeighborRepoIds}
            selectedRepoId={selectedRepoId}
            onSelectRepo={onStarMapSelectRepo}
            embeddingReady={starMapEmbeddingReady}
            active={view === 'star-map'}
            clusters={starMapClusters}
            clusterByRepo={starMapClusterByRepo}
            onPromoteCluster={onStarMapPromoteCluster}
          />
        </div>
      ) : null}
    </div>
  );
});
