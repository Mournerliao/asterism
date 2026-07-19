import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { memo, useEffect, useState } from 'react';
import type { BulkSelectionController } from '../lib/bulk-selection';
import type { RepoViewMode } from '../stores/browse-view';
import type { RepoOpenModality } from '../stores/repo-inspector';
import { RepoCollection } from './repo-collection';

const VIEW_MODES = ['grid', 'list'] as const satisfies readonly RepoViewMode[];

export const BrowseRepoList = memo(function BrowseRepoList({
  view,
  records,
  tagsByRepo,
  collectionCountByRepo,
  noteRepoIds,
  selectedRepoId,
  onSelect,
  scrollElement,
  bulkSelection,
}: {
  view: RepoViewMode;
  records: StarredRepoRecord[];
  tagsByRepo?: Map<string, Tag[]>;
  collectionCountByRepo?: Map<string, number>;
  noteRepoIds?: Set<string>;
  selectedRepoId?: string;
  onSelect?: (record: StarredRepoRecord, modality: RepoOpenModality) => void;
  scrollElement?: HTMLElement | null;
  bulkSelection?: BulkSelectionController;
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
      {VIEW_MODES.map((mode) =>
        mountedViews.has(mode) ? (
          <div key={mode} className={mode === view ? undefined : 'hidden'}>
            <RepoCollection
              records={records}
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
    </div>
  );
});
