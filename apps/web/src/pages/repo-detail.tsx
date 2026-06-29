import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ExternalLinkIcon,
  FolderIcon,
  GitForkIcon,
  HashIcon,
  PencilIcon,
  StarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { LanguageDot } from '@/components/repo-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { formatStars, relativeTime } from '@/lib/mock-data';
import { TAG_COLOR_CLASSES, useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function RepoDetailPage() {
  const { id } = useParams();
  const { getRepo, tags, collections, toggleRepoTag, toggleRepoCollection, setNote } = useStore();
  const repo = getRepo(id ?? '');

  const [editingNote, setEditingNote] = useState(false);
  const [draft, setDraft] = useState('');

  if (!repo) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StarIcon />
            </EmptyMedia>
            <EmptyTitle>未找到该仓库</EmptyTitle>
            <EmptyDescription>它可能已从你的星标列表中移除。</EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="outline">
            <Link to="/app">
              <ArrowLeftIcon data-icon="inline-start" />
              返回浏览
            </Link>
          </Button>
        </Empty>
      </div>
    );
  }

  const repoTags = tags.filter((t) => repo.tagIds.includes(t.id));
  const repoCollections = collections.filter((c) => repo.collectionIds.includes(c.id));

  const startEdit = () => {
    setDraft(repo.note ?? '');
    setEditingNote(true);
  };
  const saveNote = () => {
    setNote(repo.id, draft.trim());
    setEditingNote(false);
    toast.success('笔记已保存');
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/app">
          <ArrowLeftIcon data-icon="inline-start" />
          返回浏览
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              <span className="text-muted-foreground">{repo.owner}/</span>
              {repo.name}
            </h1>
            <p className="max-w-2xl text-pretty text-muted-foreground leading-relaxed">
              {repo.description}
            </p>
          </div>
          <div className="flex gap-2">
            {repo.homepage && (
              <Button asChild variant="outline" size="sm">
                <a href={repo.homepage} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon data-icon="inline-start" />
                  主页
                </a>
              </Button>
            )}
            <Button asChild size="sm">
              <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <LanguageDot language={repo.language} />
            {repo.language}
          </span>
          <span className="flex items-center gap-1.5">
            <StarIcon className="size-4" />
            {formatStars(repo.stargazers)} stars
          </span>
          <span className="flex items-center gap-1.5">
            <GitForkIcon className="size-4" />
            {formatStars(repo.forks)} forks
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="size-4" />
            收藏于 {relativeTime(repo.starredAt)}
          </span>
          {repo.archived && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <ArchiveIcon className="size-3" />
              已归档
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {repo.topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="font-normal">
              {topic}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Notes — main column */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>笔记</CardTitle>
              {!editingNote && (
                <Button variant="ghost" size="sm" onClick={startEdit}>
                  <PencilIcon data-icon="inline-start" />
                  {repo.note ? '编辑' : '添加'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {editingNote ? (
              <>
                <Textarea
                  rows={8}
                  autoFocus
                  value={draft}
                  placeholder="写下你为什么收藏它、怎么用、踩过的坑……（支持 Markdown）"
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingNote(false)}>
                    取消
                  </Button>
                  <Button size="sm" onClick={saveNote}>
                    <CheckIcon data-icon="inline-start" />
                    保存
                  </Button>
                </div>
              </>
            ) : repo.note ? (
              <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed">{repo.note}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                还没有笔记。记录下你的想法，让这颗星更有意义。
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sidebar — tags & collections */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <HashIcon className="size-4" />
                  标签
                </CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      编辑
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-2">
                    <div className="flex flex-col gap-1">
                      {tags.map((t) => {
                        const active = repo.tagIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleRepoTag(repo.id, t.id)}
                            className={cn(
                              'flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                            )}
                          >
                            <span
                              className={cn(
                                'rounded-sm px-1.5 py-0.5 text-xs font-medium',
                                TAG_COLOR_CLASSES[t.color],
                              )}
                            >
                              {t.name}
                            </span>
                            {active && <CheckIcon className="size-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              {repoTags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {repoTags.map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 text-xs font-medium',
                        TAG_COLOR_CLASSES[t.color],
                      )}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">未打标签</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <FolderIcon className="size-4" />
                  集合
                </CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      编辑
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-2">
                    <div className="flex flex-col gap-1">
                      {collections.map((c) => {
                        const active = repo.collectionIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleRepoCollection(repo.id, c.id)}
                            className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                          >
                            {c.name}
                            {active && <CheckIcon className="size-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {repoCollections.length ? (
                repoCollections.map((c) => (
                  <Link
                    key={c.id}
                    to={`/app/collections/${c.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <FolderIcon className="size-4 text-muted-foreground" />
                    {c.name}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">未加入任何集合</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
