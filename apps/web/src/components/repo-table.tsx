import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@asterism/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { KeyboardEvent } from 'react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCompactNumber } from '../lib/format';
import { languageColor } from '../lib/language-colors';
import { findScrollParent, useScrollMargin } from '../lib/scroll-margin';
import { TagPill } from './tag-badge';

const MAX_TAGS = 3;
const ROW_HEIGHT = 56;

function formatStarredDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toISOString().slice(0, 10);
}

export const RepoTableRow = memo(function RepoTableRow({
  record,
  tags,
  onSelect,
}: {
  record: StarredRepoRecord;
  tags?: Tag[];
  onSelect?: (record: StarredRepoRecord) => void;
}) {
  const { repo, starredAt } = record;
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const dotColor = languageColor(repo.language);
  const visibleTags = tags?.slice(0, MAX_TAGS) ?? [];

  const handleOpen = onSelect ? () => onSelect(record) : undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (handleOpen && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleOpen();
    }
  };

  return (
    <TableRow
      role={handleOpen ? 'button' : undefined}
      tabIndex={handleOpen ? 0 : undefined}
      onClick={handleOpen}
      onKeyDown={handleOpen ? handleKeyDown : undefined}
      className={cn(
        'h-14 border-border/50 border-b transition-colors hover:bg-accent/30',
        handleOpen && 'cursor-pointer focus-visible:bg-accent/40 focus-visible:outline-none',
      )}
    >
      <TableCell className="px-4 py-0 align-middle">
        <div className="flex min-w-0 max-w-[340px] flex-col gap-0.5">
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            className="truncate font-semibold text-link text-[13px] hover:underline"
          >
            {repo.owner} / {repo.name}
          </a>
          {repo.description ? (
            <p className="truncate text-[13px] text-muted-foreground">{repo.description}</p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="hidden w-[100px] px-4 align-middle md:table-cell">
        {repo.language ? (
          <span className="flex items-center gap-1.5 text-caption text-foreground">
            <span
              aria-hidden="true"
              className={cn('size-2.5 rounded-full', !dotColor && 'bg-muted-foreground')}
              style={dotColor ? { backgroundColor: dotColor } : undefined}
            />
            {repo.language}
          </span>
        ) : (
          <span className="text-caption text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="w-20 px-4 align-middle font-mono text-caption text-foreground">
        {formatCompactNumber(repo.stargazers, locale)}
      </TableCell>
      <TableCell className="hidden w-[200px] px-4 align-middle lg:table-cell">
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </TableCell>
      <TableCell className="hidden w-[100px] px-4 align-middle font-mono text-caption text-muted-foreground sm:table-cell">
        {formatStarredDate(starredAt)}
      </TableCell>
    </TableRow>
  );
});

export const RepoTable = memo(function RepoTable({
  records,
  tagsByRepo,
  onSelect,
  scrollElement,
}: {
  records: StarredRepoRecord[];
  tagsByRepo?: Map<string, Tag[]>;
  onSelect?: (record: StarredRepoRecord) => void;
  scrollElement?: HTMLElement | null;
}) {
  const { t } = useTranslation();
  const tableRef = useRef<HTMLDivElement>(null);
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
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const firstItem = virtualItems[0];
  const lastItem = virtualItems.at(-1);
  const paddingTop = firstItem ? firstItem.start - scrollMargin : 0;
  const paddingBottom = lastItem ? virtualizer.getTotalSize() - (lastItem.end - scrollMargin) : 0;

  return (
    <div ref={tableRef} className="w-full rounded-lg border">
      <Table className="min-w-[640px] border-collapse text-left">
        <TableHeader>
          <TableRow className="sticky top-0 z-10 h-9 border-border border-b bg-background">
            <TableHead className="px-4 font-medium text-[11px] text-muted-foreground">
              {t('browse.table.repository')}
            </TableHead>
            <TableHead className="hidden px-4 font-medium text-[11px] text-muted-foreground md:table-cell">
              {t('browse.table.language')}
            </TableHead>
            <TableHead className="px-4 font-medium text-[11px] text-muted-foreground">
              {t('browse.table.stars')}
            </TableHead>
            <TableHead className="hidden px-4 font-medium text-[11px] text-muted-foreground lg:table-cell">
              {t('browse.table.tags')}
            </TableHead>
            <TableHead className="hidden px-4 font-medium text-[11px] text-muted-foreground sm:table-cell">
              {t('browse.table.starred')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paddingTop > 0 ? (
            <tr>
              <TableCell colSpan={5} style={{ height: paddingTop, padding: 0, border: 0 }} />
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
                onSelect={onSelect}
              />
            );
          })}
          {paddingBottom > 0 ? (
            <tr>
              <TableCell colSpan={5} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
});
