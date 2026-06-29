import { Archive, GitFork, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatStars, LANGUAGE_COLORS, type Repo, relativeTime } from '@/lib/mock-data';
import { type Tag, TAG_COLOR_CLASSES } from '@/lib/store';
import { cn } from '@/lib/utils';

export function LanguageDot({ language }: { language: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: LANGUAGE_COLORS[language] ?? 'var(--muted-foreground)' }}
      aria-hidden
    />
  );
}

export function TagPill({ tag, className }: { tag: Tag; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium text-xs',
        TAG_COLOR_CLASSES[tag.color] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {tag.name}
    </span>
  );
}

interface RepoItemProps {
  repo: Repo;
  tags: Tag[];
}

export function RepoCard({ repo, tags }: RepoItemProps) {
  const repoTags = tags.filter((t) => repo.tagIds.includes(t.id));
  return (
    <Card className="group flex h-full flex-col transition-colors hover:border-ring">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/app/repo/${repo.id}`}
            className="min-w-0 font-mono font-medium text-sm hover:underline"
          >
            <span className="text-muted-foreground">{repo.owner}/</span>
            <span className="break-all">{repo.name}</span>
          </Link>
          {repo.archived && (
            <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
              <Archive className="size-3" />
              已归档
            </Badge>
          )}
        </div>
        <p className="line-clamp-2 text-muted-foreground text-sm leading-relaxed">
          {repo.description}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-3">
        {repoTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {repoTags.map((t) => (
              <TagPill key={t.id} tag={t} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 3).map((topic) => (
            <Badge key={topic} variant="secondary" className="font-normal">
              {topic}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center gap-4 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <LanguageDot language={repo.language} />
          {repo.language}
        </span>
        <span className="flex items-center gap-1">
          <Star className="size-3.5" />
          {formatStars(repo.stargazers)}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="size-3.5" />
          {formatStars(repo.forks)}
        </span>
        <span className="ml-auto">更新于 {relativeTime(repo.pushedAt)}</span>
      </CardFooter>
    </Card>
  );
}

export function RepoRow({ repo, tags }: RepoItemProps) {
  const repoTags = tags.filter((t) => repo.tagIds.includes(t.id));
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3 transition-colors hover:bg-accent/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            to={`/app/repo/${repo.id}`}
            className="truncate font-mono font-medium text-sm hover:underline"
          >
            <span className="text-muted-foreground">{repo.owner}/</span>
            {repo.name}
          </Link>
          {repo.archived && <Archive className="size-3.5 shrink-0 text-muted-foreground" />}
          {repoTags.map((t) => (
            <TagPill key={t.id} tag={t} className="hidden sm:inline-flex" />
          ))}
        </div>
        <p className="mt-0.5 truncate text-muted-foreground text-sm">{repo.description}</p>
      </div>
      <div className="hidden items-center gap-1.5 text-muted-foreground text-xs md:flex">
        <LanguageDot language={repo.language} />
        <span className="w-20 truncate">{repo.language}</span>
      </div>
      <span className="hidden w-16 items-center gap-1 text-muted-foreground text-xs sm:flex">
        <Star className="size-3.5" />
        {formatStars(repo.stargazers)}
      </span>
      <span className="hidden w-20 shrink-0 text-right text-muted-foreground text-xs lg:block">
        {relativeTime(repo.pushedAt)}
      </span>
    </div>
  );
}
