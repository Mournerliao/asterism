import { Archive, GitFork, Star, StickyNote } from 'lucide-react';
import { LANGUAGE_COLORS, type Repo, type Tag } from '@/data/mock';
import { useI18n } from '@/i18n';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import { TagDot } from './tag-pill';

export function LanguageDot({ language }: { language: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: LANGUAGE_COLORS[language] ?? 'var(--muted-foreground)' }}
      aria-hidden
    />
  );
}

interface RepoItemProps {
  repo: Repo;
  tags: Tag[];
  hasNote: boolean;
  onOpen: () => void;
}

export function RepoCard({ repo, tags, hasNote, onOpen }: RepoItemProps) {
  const { t, locale } = useI18n();

  return (
    <button
      onClick={onOpen}
      className="flex h-full w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left text-card-foreground shadow-xs transition-colors hover:border-ring/60 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-muted-foreground text-xs">{repo.owner}/</div>
          <div className="truncate font-mono font-semibold text-sm tracking-tight">{repo.name}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {hasNote ? <StickyNote className="size-3.5 text-muted-foreground" /> : null}
          {repo.archived ? <Archive className="size-3.5 text-muted-foreground" /> : null}
        </div>
      </div>

      <p className="line-clamp-2 flex-1 text-muted-foreground text-sm leading-relaxed">
        {repo.description}
      </p>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]"
            >
              <TagDot color={tag.color} />
              {tag.name}
            </span>
          ))}
          {tags.length > 3 ? (
            <span className="text-muted-foreground text-[11px]">+{tags.length - 3}</span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {repo.topics.slice(0, 3).map((topic) => (
          <span
            key={topic}
            className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
          >
            {topic}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t pt-2.5 text-muted-foreground text-xs">
        <span className="flex items-center gap-1">
          <LanguageDot language={repo.language} />
          {repo.language}
        </span>
        <span className="flex items-center gap-1">
          <Star className="size-3" />
          {formatNumber(repo.stargazers)}
        </span>
        <span className="ml-auto truncate">{timeAgo(repo.pushedAt, locale)}</span>
        {repo.archived ? <span className="sr-only">{t('repo.archived')}</span> : null}
      </div>
    </button>
  );
}

export function RepoRow({ repo, tags, hasNote, onOpen }: RepoItemProps) {
  const { locale, t } = useI18n();

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-md border bg-card px-4 py-3 text-left text-card-foreground shadow-xs transition-colors hover:border-ring/60 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono font-semibold text-sm">{repo.fullName}</span>
          {repo.archived ? (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Archive className="size-3" />
              {t('repo.archived')}
            </span>
          ) : null}
          {hasNote ? <StickyNote className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        </div>
        <p className="truncate text-muted-foreground text-xs">{repo.description}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-1 md:flex">
        {tags.slice(0, 2).map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]"
          >
            <TagDot color={tag.color} />
            {tag.name}
          </span>
        ))}
      </div>

      <div className="hidden w-28 shrink-0 items-center gap-1.5 text-muted-foreground text-xs sm:flex">
        <LanguageDot language={repo.language} />
        <span className="truncate">{repo.language}</span>
      </div>

      <div className="flex w-14 shrink-0 items-center justify-end gap-1 text-muted-foreground text-xs tabular-nums">
        <Star className="size-3" />
        {formatNumber(repo.stargazers)}
      </div>

      <div className="hidden w-14 shrink-0 items-center justify-end gap-1 text-muted-foreground text-xs tabular-nums lg:flex">
        <GitFork className="size-3" />
        {formatNumber(repo.forks)}
      </div>

      <div className="hidden w-20 shrink-0 text-right text-muted-foreground text-xs lg:block">
        {timeAgo(repo.pushedAt, locale)}
      </div>
    </button>
  );
}

export { cn };
