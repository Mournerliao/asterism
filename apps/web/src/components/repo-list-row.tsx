import type { Repo } from '@asterism/core';
import { Badge, Card, cn } from '@asterism/ui';
import { ArchiveIcon, GitForkIcon, StarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCompactNumber, formatRelativeTime } from '../lib/format';
import { languageColor } from '../lib/language-colors';

const MAX_TOPICS = 3;

export function RepoListRow({ repo }: { repo: Repo }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const updated = formatRelativeTime(repo.pushedAt, locale);
  const dotColor = languageColor(repo.language);
  const visibleTopics = repo.topics.slice(0, MAX_TOPICS);

  return (
    <Card className="flex flex-row items-center gap-4 px-4 py-3 transition-colors hover:border-ring/60">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
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
