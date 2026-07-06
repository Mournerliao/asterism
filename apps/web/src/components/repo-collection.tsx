import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

function measureScrollMargin(element: HTMLElement, scrollElement: HTMLElement): number {
  const elementRect = element.getBoundingClientRect();
  const scrollRect = scrollElement.getBoundingClientRect();
  return elementRect.top - scrollRect.top + scrollElement.scrollTop;
}

export function RepoCollection({
  records,
  view,
  tagsByRepo,
  onSelect,
  scrollElement,
}: {
  records: StarredRepoRecord[];
  view: RepoViewMode;
  tagsByRepo?: Map<string, Tag[]>;
  onSelect?: (record: StarredRepoRecord) => void;
  scrollElement?: HTMLElement | null;
}) {
  const collectionRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const columns = useColumns(collectionRef, view);
  const rowCount = Math.ceil(records.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement ?? null,
    estimateSize: () => 210,
    overscan: 6,
    scrollMargin,
  });

  useLayoutEffect(() => {
    const element = collectionRef.current;
    if (!element || !scrollElement) {
      return;
    }
    setScrollMargin(measureScrollMargin(element, scrollElement));
  });

  useEffect(() => {
    const element = collectionRef.current;
    if (!element || !scrollElement) {
      return;
    }
    const update = () => setScrollMargin(measureScrollMargin(element, scrollElement));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(scrollElement);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [scrollElement]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: columns/view 改变即需重测
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, columns, view, records.length, scrollMargin]);

  if (view === 'list') {
    return (
      <div ref={collectionRef} className="w-full">
        <RepoTable records={records} tagsByRepo={tagsByRepo} onSelect={onSelect} />
      </div>
    );
  }

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
