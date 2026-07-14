import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { memo, useEffect, useState } from 'react';
import type { RepoViewMode } from '../stores/browse-view';
import { RepoCollection } from './repo-collection';

const VIEW_MODES = ['grid', 'list'] as const satisfies readonly RepoViewMode[];

export const BrowseRepoList = memo(function BrowseRepoList({
  view,
  records,
  tagsByRepo,
  collectionCountByRepo,
  noteRepoIds,
  onSelect,
  scrollElement,
}: {
  view: RepoViewMode;
  records: StarredRepoRecord[];
  tagsByRepo?: Map<string, Tag[]>;
  collectionCountByRepo?: Map<string, number>;
  noteRepoIds?: Set<string>;
  onSelect?: (record: StarredRepoRecord) => void;
  scrollElement?: HTMLElement | null;
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
              onSelect={onSelect}
              scrollElement={mode === view ? scrollElement : null}
            />
          </div>
        ) : null,
      )}
    </div>
  );
});
