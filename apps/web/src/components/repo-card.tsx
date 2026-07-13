import type { Tag } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import { Badge, Card, cn } from '@asterism/ui';
import { ArchiveIcon, GitForkIcon, StarIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCompactNumber, formatRelativeTime } from '../lib/format';
import { languageColor } from '../lib/language-colors';
import { OverflowChipRow } from './overflow-chip-row';
import { TagBadge } from './tag-badge';

export const RepoCard = memo(function RepoCard({
  record,
  tags,
  onSelect,
}: {
  record: StarredRepoRecord;
  tags?: Tag[];
  onSelect?: (record: StarredRepoRecord) => void;
}) {
  const { repo, starredAt } = record;
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const updated = formatRelativeTime(repo.pushedAt, locale);
  const dotColor = languageColor(repo.language);
  const handleOpen = onSelect ? () => onSelect(record) : undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen?.();
    }
  };

  return (
    <Card
      role={handleOpen ? 'button' : undefined}
      tabIndex={handleOpen ? 0 : undefined}
      onClick={handleOpen}
      onKeyDown={handleOpen ? handleKeyDown : undefined}
      className={cn(
        'flex h-full flex-col gap-3 rounded-lg p-4 py-4 transition-[border-color,box-shadow,filter] duration-150 [transition-timing-function:var(--ease-out-quart)] hover:border-ring/50 hover:shadow-[0_2px_6px_rgba(22,26,34,0.08)] active:brightness-[0.98] dark:hover:shadow-none',
        handleOpen && 'cursor-pointer focus-visible:border-ring focus-visible:outline-none',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <a
          href={`https://github.com/${repo.fullName}`}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(event) => event.stopPropagation()}
          className="flex min-w-0 items-center gap-2 font-semibold text-link text-[13px] hover:underline"
        >
          <span
            aria-hidden="true"
            className={cn('size-2.5 shrink-0 rounded-full', !dotColor && 'bg-muted-foreground')}
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
          <span className="truncate">
            {repo.owner} / {repo.name}
          </span>
        </a>
        {repo.archived ? (
          <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
            <ArchiveIcon className="size-3" aria-hidden="true" />
            {t('browse.archived')}
          </Badge>
        ) : null}
      </div>

      {repo.description ? (
        <p className="line-clamp-2 text-[13px] text-muted-foreground leading-5">
          {repo.description}
        </p>
      ) : null}

      {repo.topics.length > 0 ? (
        <OverflowChipRow
          items={repo.topics}
          getKey={(topic) => topic}
          getItemLabel={(topic) => topic}
          overflowLabel={(count) => t('browse.moreTopicsLabel', { count })}
          renderChip={(topic) => (
            <Badge variant="secondary" className="h-[22px] font-normal">
              {topic}
            </Badge>
          )}
          renderOverflowChip={(count) => (
            <Badge variant="secondary" className="h-[22px] font-normal text-muted-foreground">
              +{count}
            </Badge>
          )}
        />
      ) : null}

      {tags && tags.length > 0 ? (
        <OverflowChipRow
          items={tags}
          getKey={(tag) => tag.id}
          getItemLabel={(tag) => tag.name}
          overflowLabel={(count) => t('browse.moreTagsLabel', { count })}
          renderChip={(tag) => <TagBadge name={tag.name} color={tag.color} />}
          renderOverflowChip={(count) => (
            <span className="inline-flex h-6 items-center rounded-sm bg-secondary px-2 text-caption text-muted-foreground">
              +{count}
            </span>
          )}
        />
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
        <span className="flex items-center gap-1" title={t('browse.stars')}>
          <StarIcon className="size-3.5" aria-hidden="true" />
          {formatCompactNumber(repo.stargazers, locale)}
        </span>
        {repo.forks != null ? (
          <span className="flex items-center gap-1" title={t('browse.forks')}>
            <GitForkIcon className="size-3.5" aria-hidden="true" />
            {formatCompactNumber(repo.forks, locale)}
          </span>
        ) : null}
        {updated ? <span>{t('browse.updated', { time: updated })}</span> : null}
        {starredAt ? (
          <span className="hidden sm:inline">
            {t('browse.starred', { time: formatRelativeTime(starredAt, locale) ?? '' })}
          </span>
        ) : null}
      </div>
    </Card>
  );
});
