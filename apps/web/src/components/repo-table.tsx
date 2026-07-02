import type { Repo, Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { cn } from '@asterism/ui';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCompactNumber } from '../lib/format';
import { languageColor } from '../lib/language-colors';
import { TagPill } from './tag-badge';

const MAX_TAGS = 3;

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

export function RepoTableRow({
  repo,
  starredAt,
  tags,
  onOpen,
}: {
  repo: Repo;
  starredAt?: string | null;
  tags?: Tag[];
  onOpen?: () => void;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const dotColor = languageColor(repo.language);
  const visibleTags = tags?.slice(0, MAX_TAGS) ?? [];

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (onOpen && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <tr
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? handleKeyDown : undefined}
      className={cn(
        'h-14 border-border/50 border-b transition-colors hover:bg-accent/30',
        onOpen && 'cursor-pointer focus-visible:bg-accent/40 focus-visible:outline-none',
      )}
    >
      <td className="px-4 py-0 align-middle">
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
      </td>
      <td className="hidden w-[100px] px-4 align-middle md:table-cell">
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
      </td>
      <td className="w-20 px-4 align-middle font-mono text-caption text-foreground">
        {formatCompactNumber(repo.stargazers, locale)}
      </td>
      <td className="hidden w-[200px] px-4 align-middle lg:table-cell">
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </td>
      <td className="hidden w-[100px] px-4 align-middle font-mono text-caption text-muted-foreground sm:table-cell">
        {formatStarredDate(starredAt)}
      </td>
    </tr>
  );
}

export function RepoTable({
  records,
  tagsByRepo,
  onSelect,
}: {
  records: StarredRepoRecord[];
  tagsByRepo?: Map<string, Tag[]>;
  onSelect?: (record: StarredRepoRecord) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="h-9 border-border border-b">
            <th className="px-4 font-medium text-[11px] text-muted-foreground">
              {t('browse.table.repository')}
            </th>
            <th className="hidden px-4 font-medium text-[11px] text-muted-foreground md:table-cell">
              {t('browse.table.language')}
            </th>
            <th className="px-4 font-medium text-[11px] text-muted-foreground">
              {t('browse.table.stars')}
            </th>
            <th className="hidden px-4 font-medium text-[11px] text-muted-foreground lg:table-cell">
              {t('browse.table.tags')}
            </th>
            <th className="hidden px-4 font-medium text-[11px] text-muted-foreground sm:table-cell">
              {t('browse.table.starred')}
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <RepoTableRow
              key={record.repo.githubId}
              repo={record.repo}
              starredAt={record.starredAt}
              tags={tagsByRepo?.get(record.repoId)}
              onOpen={onSelect ? () => onSelect(record) : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
