import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { Badge, cn } from '@asterism/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArchiveIcon, FolderIcon, NotebookPenIcon, StarIcon } from 'lucide-react';
import { type KeyboardEvent, type MouseEvent, memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCompactNumber, formatCompactRelativeTime, formatRelativeTime } from '../lib/format';
import { languageColor } from '../lib/language-colors';
import { findScrollParent, useScrollMargin } from '../lib/scroll-margin';
import { OverflowChipRow } from './overflow-chip-row';
import { TagPill } from './tag-badge';

const DESKTOP_ROW_HEIGHT = 64;
const TABLE_GRID_CLASS =
  'grid grid-cols-[auto_auto_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_5rem_9rem] lg:grid-cols-[minmax(0,1fr)_9rem_5rem_8rem]';
const RESPONSIVE_LANGUAGE_CLASS =
  'sm:absolute sm:h-px sm:w-px sm:overflow-hidden sm:whitespace-nowrap sm:[clip-path:inset(50%)] lg:static lg:h-auto lg:w-auto lg:overflow-visible lg:whitespace-normal lg:[clip-path:none]';

function ActivityValue({
  compact,
  full,
  label,
}: {
  compact: string | null;
  full: string | null;
  label: (time: string) => string;
}) {
  if (!compact || !full) {
    return null;
  }

  return (
    <span title={label(full)}>
      <span aria-hidden="true">{label(compact)}</span>
      <span className="sr-only">{label(full)}</span>
    </span>
  );
}

function RepoContext({
  tags,
  collectionCount,
  hasNote,
}: {
  tags: readonly Tag[];
  collectionCount: number;
  hasNote: boolean;
}) {
  const { t } = useTranslation();
  const hasContext = tags.length > 0 || collectionCount > 0 || hasNote;

  if (!hasContext) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        {tags.length > 0 ? (
          <OverflowChipRow
            items={tags}
            getKey={(tag) => tag.id}
            getItemLabel={(tag) => tag.name}
            overflowLabel={(count) => t('browse.moreTagsLabel', { count })}
            renderChip={(tag) => <TagPill tag={tag} />}
            renderOverflowChip={(count) => (
              <Badge variant="secondary" className="h-[22px] font-normal text-muted-foreground">
                +{count}
              </Badge>
            )}
            renderTooltipItem={(tag) => <TagPill tag={tag} />}
          />
        ) : null}
      </div>
      <span className="flex shrink-0 items-center gap-2 text-caption text-muted-foreground">
        {collectionCount > 0 ? (
          <span
            role="img"
            className="inline-flex items-center gap-1"
            aria-label={t('browse.inCollections', { count: collectionCount })}
            title={t('browse.inCollections', { count: collectionCount })}
          >
            <FolderIcon className="size-3.5" aria-hidden="true" />
            <span aria-hidden="true">{collectionCount}</span>
          </span>
        ) : null}
        {hasNote ? (
          <span role="img" aria-label={t('browse.hasNote')} title={t('browse.hasNote')}>
            <NotebookPenIcon className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </span>
    </div>
  );
}

export const RepoTableRow = memo(function RepoTableRow({
  record,
  tags = [],
  collectionCount = 0,
  hasNote = false,
  onSelect,
  rowIndex,
  measureElement,
}: {
  record: StarredRepoRecord;
  tags?: Tag[];
  collectionCount?: number;
  hasNote?: boolean;
  onSelect?: (record: StarredRepoRecord) => void;
  rowIndex: number;
  measureElement: (element: HTMLTableRowElement | null) => void;
}) {
  const { repo, starredAt } = record;
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const dotColor = languageColor(repo.language);
  const updated = formatRelativeTime(repo.pushedAt, locale);
  const compactUpdated = formatCompactRelativeTime(repo.pushedAt, locale);
  const starred = formatRelativeTime(starredAt, locale);
  const compactStarred = formatCompactRelativeTime(starredAt, locale);
  const handleOpen = onSelect ? () => onSelect(record) : undefined;
  const handleRowClick = handleOpen
    ? (event: MouseEvent<HTMLTableRowElement>) => {
        const target = event.target as Element;
        if (target.closest('a, button, [role="button"]')) {
          return;
        }
        handleOpen();
      }
    : undefined;
  const handleRowKeyDown = handleOpen
    ? (event: KeyboardEvent<HTMLTableRowElement>) => {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
          return;
        }
        event.preventDefault();
        handleOpen();
      }
    : undefined;

  return (
    <tr
      ref={measureElement}
      data-index={rowIndex - 2}
      aria-rowindex={rowIndex}
      aria-label={handleOpen ? t('browse.openDetails', { repo: repo.fullName }) : undefined}
      tabIndex={handleOpen ? 0 : undefined}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={cn(
        TABLE_GRID_CLASS,
        'group min-h-[104px] gap-x-3 gap-y-2 border-border/50 border-b px-3 py-3 transition-colors hover:bg-accent/20 focus-visible:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:h-16 sm:min-h-16 sm:gap-0 sm:px-0 sm:py-0',
        handleOpen && 'cursor-pointer',
      )}
    >
      <td className="col-span-3 flex min-w-0 flex-col justify-center gap-0.5 sm:col-span-1 sm:px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t('browse.openOnGitHub', { repo: repo.fullName })}
            className="group/link min-w-0 truncate rounded-sm text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-medium text-muted-foreground">{repo.owner}</span>
            <span className="text-muted-foreground"> / </span>
            <span className="font-semibold text-link group-hover/link:underline">{repo.name}</span>
          </a>
          {repo.archived ? (
            <Badge
              variant="outline"
              className="h-5 shrink-0 gap-1 px-1.5 text-[11px] text-muted-foreground"
            >
              <ArchiveIcon className="size-3" aria-hidden="true" />
              {t('browse.archived')}
            </Badge>
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-3">
          {repo.description ? (
            <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
              {repo.description}
            </p>
          ) : null}
          <div className="hidden min-w-0 max-w-[45%] flex-[0_1_18rem] sm:block">
            <RepoContext tags={tags} collectionCount={collectionCount} hasNote={hasNote} />
          </div>
        </div>
        <div className="mt-1 min-w-0 sm:hidden">
          <RepoContext tags={tags} collectionCount={collectionCount} hasNote={hasNote} />
        </div>
      </td>

      <td
        className={`${RESPONSIVE_LANGUAGE_CLASS} flex min-w-0 items-center text-caption text-foreground lg:px-3`}
      >
        {repo.language ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('size-2.5 shrink-0 rounded-full', !dotColor && 'bg-muted-foreground')}
              style={dotColor ? { backgroundColor: dotColor } : undefined}
            />
            <span className="truncate">{repo.language}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      <td className="flex items-center gap-1 self-center font-mono text-caption text-foreground sm:px-3">
        <StarIcon className="size-3.5 sm:hidden" aria-hidden="true" />
        {formatCompactNumber(repo.stargazers, locale)}
      </td>

      <td className="flex min-w-0 flex-col items-end justify-center self-center whitespace-nowrap text-caption text-muted-foreground sm:items-start sm:px-3">
        <ActivityValue
          compact={compactUpdated}
          full={updated}
          label={(time) => t('browse.updated', { time })}
        />
        <ActivityValue
          compact={compactStarred}
          full={starred}
          label={(time) => t('browse.starred', { time })}
        />
        {!compactUpdated && !compactStarred ? <span>—</span> : null}
      </td>
    </tr>
  );
});

function TableHeader() {
  const { t } = useTranslation();
  const className = 'px-3 text-left font-semibold text-caption text-foreground/75';
  return (
    <thead className="sr-only sm:not-sr-only sm:block">
      <tr
        className={cn(
          TABLE_GRID_CLASS,
          'sticky top-0 z-10 h-10 items-center border-border border-b bg-muted/55',
        )}
      >
        <th scope="col" className={className}>
          {t('browse.table.repository')}
        </th>
        <th scope="col" className={`${RESPONSIVE_LANGUAGE_CLASS} ${className}`}>
          {t('browse.table.language')}
        </th>
        <th scope="col" className={className}>
          {t('browse.table.stars')}
        </th>
        <th scope="col" className={className}>
          {t('browse.table.activity')}
        </th>
      </tr>
    </thead>
  );
}

export const RepoTable = memo(function RepoTable({
  records,
  tagsByRepo,
  collectionCountByRepo,
  noteRepoIds,
  onSelect,
  scrollElement,
}: {
  records: StarredRepoRecord[];
  tagsByRepo?: Map<string, Tag[]>;
  collectionCountByRepo?: Map<string, number>;
  noteRepoIds?: Set<string>;
  onSelect?: (record: StarredRepoRecord) => void;
  scrollElement?: HTMLElement | null;
}) {
  const { t } = useTranslation();
  const tableRef = useRef<HTMLTableElement>(null);
  const [resolvedScroll, setResolvedScroll] = useState<HTMLElement | null>(scrollElement ?? null);
  const scrollMargin = useScrollMargin(tableRef, resolvedScroll);

  useEffect(() => {
    if (scrollElement) {
      setResolvedScroll(scrollElement);
      return;
    }
    setResolvedScroll(findScrollParent(tableRef.current));
  }, [scrollElement]);

  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => resolvedScroll,
    estimateSize: () => DESKTOP_ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const firstItem = virtualItems[0];
  const lastItem = virtualItems.at(-1);
  const paddingTop = firstItem ? firstItem.start - scrollMargin : 0;
  const paddingBottom = lastItem ? virtualizer.getTotalSize() - (lastItem.end - scrollMargin) : 0;

  return (
    <table
      ref={tableRef}
      aria-label={t('browse.table.label')}
      aria-colcount={4}
      aria-rowcount={records.length + 1}
      className="block w-full overflow-clip rounded-lg border bg-card text-card-foreground"
    >
      <TableHeader />
      <tbody className="block">
        {paddingTop > 0 ? (
          <tr className="block">
            <td
              aria-hidden="true"
              colSpan={4}
              className="block p-0"
              style={{ height: paddingTop }}
            />
          </tr>
        ) : null}
        {virtualItems.map((virtualRow) => {
          const record = records[virtualRow.index];
          if (!record) {
            return null;
          }
          return (
            <RepoTableRow
              key={record.repo.githubId}
              record={record}
              tags={tagsByRepo?.get(record.repoId)}
              collectionCount={collectionCountByRepo?.get(record.repoId)}
              hasNote={noteRepoIds?.has(record.repoId)}
              onSelect={onSelect}
              rowIndex={virtualRow.index + 2}
              measureElement={virtualizer.measureElement}
            />
          );
        })}
        {paddingBottom > 0 ? (
          <tr className="block">
            <td
              aria-hidden="true"
              colSpan={4}
              className="block p-0"
              style={{ height: paddingBottom }}
            />
          </tr>
        ) : null}
      </tbody>
    </table>
  );
});
