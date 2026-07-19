import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useEffect, useRef, useState } from 'react';
import type { BulkSelectionController } from '../lib/bulk-selection';
import { useScrollMargin } from '../lib/scroll-margin';
import type { RepoViewMode } from '../stores/browse-view';
import type { RepoOpenModality } from '../stores/repo-inspector';
import { RepoCard } from './repo-card';
import { RepoTable } from './repo-table';

const MIN_CARD_WIDTH = 370;
const CARD_GAP = 16;
const MAX_COLUMNS = 3;

type RepoCollectionProps = {
  records: StarredRepoRecord[];
  tagsByRepo?: Map<string, Tag[]>;
  collectionCountByRepo?: Map<string, number>;
  noteRepoIds?: Set<string>;
  selectedRepoId?: string;
  onSelect?: (record: StarredRepoRecord, modality: RepoOpenModality) => void;
  scrollElement?: HTMLElement | null;
  bulkSelection?: BulkSelectionController;
};

function useColumns(ref: React.RefObject<HTMLElement | null>): number {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const update = () => {
      const next = Math.max(
        1,
        Math.min(
          MAX_COLUMNS,
          Math.floor((el.clientWidth + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)),
        ),
      );
      setColumns(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return columns;
}

const RepoGridView = memo(function RepoGridView({
  records,
  tagsByRepo,
  collectionCountByRepo,
  noteRepoIds,
  selectedRepoId,
  onSelect,
  scrollElement,
  bulkSelection,
}: RepoCollectionProps) {
  const collectionRef = useRef<HTMLDivElement>(null);
  const scrollMargin = useScrollMargin(collectionRef, scrollElement);
  const columns = useColumns(collectionRef);
  const rowCount = Math.ceil(records.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement ?? null,
    estimateSize: () => 224,
    overscan: 6,
    scrollMargin,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: columns/records 改变即需重测
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, columns, records.length, scrollMargin]);

  useEffect(() => {
    if (!selectedRepoId || !scrollElement) {
      return;
    }
    const index = records.findIndex((record) => record.repoId === selectedRepoId);
    if (index >= 0) {
      virtualizer.scrollToIndex(Math.floor(index / columns), { align: 'auto' });
    }
  }, [columns, records, scrollElement, selectedRepoId, virtualizer]);

  return (
    <div ref={collectionRef} className="relative w-full">
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((row) => {
          const start = row.index * columns;
          const rowRecords = records.slice(start, start + columns);
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
            >
              <div
                className="grid gap-4 pb-4"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {rowRecords.map((record) => (
                  <RepoCard
                    key={record.repo.githubId}
                    record={record}
                    tags={tagsByRepo?.get(record.repoId)}
                    collectionCount={collectionCountByRepo?.get(record.repoId)}
                    hasNote={noteRepoIds?.has(record.repoId)}
                    selected={record.repoId === selectedRepoId}
                    onSelect={onSelect}
                    bulkSelection={bulkSelection}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const RepoListView = memo(function RepoListView({
  records,
  tagsByRepo,
  collectionCountByRepo,
  noteRepoIds,
  selectedRepoId,
  onSelect,
  scrollElement,
  bulkSelection,
}: RepoCollectionProps) {
  return (
    <RepoTable
      records={records}
      tagsByRepo={tagsByRepo}
      collectionCountByRepo={collectionCountByRepo}
      noteRepoIds={noteRepoIds}
      selectedRepoId={selectedRepoId}
      onSelect={onSelect}
      scrollElement={scrollElement}
      bulkSelection={bulkSelection}
    />
  );
});

// memo 让常驻挂载但当前不可见的那一侧在切换时跳过整棵子树的重渲染，
// 只有真正 props 变化(如 scrollElement 从 null 变为真实节点)的一侧才会重新渲染。
export const RepoCollection = memo(function RepoCollection({
  records,
  view,
  tagsByRepo,
  collectionCountByRepo,
  noteRepoIds,
  selectedRepoId,
  onSelect,
  scrollElement,
  bulkSelection,
}: RepoCollectionProps & { view: RepoViewMode }) {
  if (view === 'list') {
    return (
      <RepoListView
        records={records}
        tagsByRepo={tagsByRepo}
        collectionCountByRepo={collectionCountByRepo}
        noteRepoIds={noteRepoIds}
        selectedRepoId={selectedRepoId}
        onSelect={onSelect}
        scrollElement={scrollElement}
        bulkSelection={bulkSelection}
      />
    );
  }

  return (
    <RepoGridView
      records={records}
      tagsByRepo={tagsByRepo}
      collectionCountByRepo={collectionCountByRepo}
      noteRepoIds={noteRepoIds}
      selectedRepoId={selectedRepoId}
      onSelect={onSelect}
      scrollElement={scrollElement}
      bulkSelection={bulkSelection}
    />
  );
});
