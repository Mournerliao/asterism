import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';
import type { RepoViewMode } from '../stores/browse-view';
import { RepoCard } from './repo-card';
import { RepoTable } from './repo-table';

const MIN_CARD_WIDTH = 370;
const MAX_COLUMNS = 3;

function useColumns(ref: React.RefObject<HTMLElement | null>, view: RepoViewMode): number {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (view === 'list') {
      setColumns(1);
      return;
    }
    const update = () => {
      const next = Math.max(1, Math.min(MAX_COLUMNS, Math.floor(el.clientWidth / MIN_CARD_WIDTH)));
      setColumns(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, view]);

  return columns;
}

export function RepoCollection({
  records,
  view,
  tagsByRepo,
  onSelect,
}: {
  records: StarredRepoRecord[];
  view: RepoViewMode;
  tagsByRepo?: Map<string, Tag[]>;
  onSelect?: (record: StarredRepoRecord) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = useColumns(scrollRef, view);
  const rowCount = Math.ceil(records.length / columns);

  const virtualizer = useVirtualizer({
    count: view === 'list' ? 1 : rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (view === 'grid' ? 210 : records.length * 56 + 40),
    overscan: 6,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: columns/view 改变即需重测
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, columns, view, records.length]);

  if (view === 'list') {
    return (
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <RepoTable records={records} tagsByRepo={tagsByRepo} onSelect={onSelect} />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
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
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <div
                className="grid gap-4 pb-4"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {rowRecords.map((record) => (
                  <RepoCard
                    key={record.repo.githubId}
                    repo={record.repo}
                    starredAt={record.starredAt}
                    tags={tagsByRepo?.get(record.repoId)}
                    onOpen={onSelect ? () => onSelect(record) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
