import type { Repo, Tag } from '@asterism/core';
import { Badge, Card, cn } from '@asterism/ui';
import { ArchiveIcon, GitForkIcon, StarIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCompactNumber, formatRelativeTime } from '../lib/format';
import { languageColor } from '../lib/language-colors';

const MAX_TOPICS = 3;
const MAX_TAG_DOTS = 3;

export function RepoListRow({
  repo,
  tags,
  onOpen,
}: {
  repo: Repo;
  tags?: Tag[];
  onOpen?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const updated = formatRelativeTime(repo.pushedAt, locale);
  const dotColor = languageColor(repo.language);
  const visibleTopics = repo.topics.slice(0, MAX_TOPICS);
  const tagDots = tags?.slice(0, MAX_TAG_DOTS) ?? [];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen?.();
    }
  };

  return (
    <Card
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? handleKeyDown : undefined}
      className={cn(
        'flex flex-row items-center gap-4 px-4 py-3 transition-colors hover:border-ring/60',
        onOpen && 'cursor-pointer focus-visible:border-ring focus-visible:outline-none',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            className="flex min-w-0 items-center gap-2 font-semibold text-link text-sm hover:underline"
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
            <ArchiveIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label={t('browse.archived')}
            />
          ) : null}
        </div>
        {repo.description ? (
          <p className="truncate text-muted-foreground text-sm">{repo.description}</p>
        ) : null}
      </div>

      {tagDots.length > 0 ? (
        <div className="hidden shrink-0 items-center md:flex" aria-hidden="true">
          {tagDots.map((tag, index) => (
            <span
              key={tag.id}
              className="-ml-1 size-2.5 rounded-full border border-background first:ml-0"
              style={{
                backgroundColor: tag.color ?? 'var(--muted-foreground)',
                zIndex: tagDots.length - index,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="hidden shrink-0 flex-wrap items-center gap-1.5 md:flex">
        {visibleTopics.map((topic) => (
          <Badge key={topic} variant="secondary" className="font-normal">
            {topic}
          </Badge>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-4 text-muted-foreground text-xs">
        <span className="flex items-center gap-1" title={t('browse.stars')}>
          <StarIcon className="size-3.5" aria-hidden="true" />
          {formatCompactNumber(repo.stargazers, locale)}
        </span>
        {repo.forks != null ? (
          <span className="hidden items-center gap-1 sm:flex" title={t('browse.forks')}>
            <GitForkIcon className="size-3.5" aria-hidden="true" />
            {formatCompactNumber(repo.forks, locale)}
          </span>
        ) : null}
        {updated ? (
          <span className="hidden lg:inline">{t('browse.updated', { time: updated })}</span>
        ) : null}
      </div>
    </Card>
  );
}
