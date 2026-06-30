import type { Repo } from '@asterism/core';
import { Badge, Card, cn } from '@asterism/ui';
import { ArchiveIcon, GitForkIcon, StarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCompactNumber, formatRelativeTime } from '../lib/format';
import { languageColor } from '../lib/language-colors';

const MAX_TOPICS = 4;

export function RepoCard({ repo, starredAt }: { repo: Repo; starredAt?: string | null }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const updated = formatRelativeTime(repo.pushedAt, locale);
  const dotColor = languageColor(repo.language);
  const visibleTopics = repo.topics.slice(0, MAX_TOPICS);
  const extraTopics = repo.topics.length - visibleTopics.length;

  return (
    <Card className="flex h-full flex-col gap-3 p-5 transition-colors hover:border-ring/60">
      <div className="flex items-start justify-between gap-2">
        <a
          href={`https://github.com/${repo.fullName}`}
          target="_blank"
          rel="noreferrer noopener"
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
          <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
            <ArchiveIcon className="size-3" aria-hidden="true" />
            {t('browse.archived')}
          </Badge>
        ) : null}
      </div>

      {repo.description ? (
        <p className="line-clamp-2 text-muted-foreground text-sm">{repo.description}</p>
      ) : null}

      {visibleTopics.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {visibleTopics.map((topic) => (
            <Badge key={topic} variant="secondary" className="font-normal">
              {topic}
            </Badge>
          ))}
          {extraTopics > 0 ? (
            <Badge variant="secondary" className="font-normal text-muted-foreground">
              +{extraTopics}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
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
}
