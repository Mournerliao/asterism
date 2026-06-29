import { Archive, Check, ExternalLink, GitFork, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/overlays';
import { Separator, Textarea } from '@/components/ui/primitives';
import type { Repo } from '@/data/mock';
import { useStore } from '@/data/store';
import { useI18n } from '@/i18n';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import { LanguageDot } from './repo-item';
import { TagDot } from './tag-pill';

export function RepoDetailSheet({
  repo,
  open,
  onClose,
}: {
  repo: Repo | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const {
    tags,
    collections,
    repoTags,
    notes,
    toggleRepoTag,
    toggleRepoInCollection,
    saveNote,
    deleteNote,
  } = useStore();

  const [noteDraft, setNoteDraft] = useState('');
  const [editingNote, setEditingNote] = useState(false);

  const repoId = repo?.id ?? '';
  const note = notes[repoId];

  useEffect(() => {
    setNoteDraft(note?.body ?? '');
    setEditingNote(false);
  }, [note?.body, repoId]);

  const currentTagIds = repoTags[repoId] ?? [];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        repo ? (
          <div className="min-w-0 pr-2">
            <div className="truncate text-muted-foreground text-xs">{repo.owner}/</div>
            <div className="truncate font-mono font-semibold text-sm">{repo.name}</div>
          </div>
        ) : null
      }
    >
      {repo ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-5 p-5">
            {/* Description + meta */}
            <div className="space-y-3">
              <p className="text-pretty text-sm leading-relaxed">{repo.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-xs">
                <span className="flex items-center gap-1.5">
                  <LanguageDot language={repo.language} />
                  {repo.language}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="size-3.5" />
                  {formatNumber(repo.stargazers)} {t('repo.stars')}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="size-3.5" />
                  {formatNumber(repo.forks)} {t('repo.forks')}
                </span>
                {repo.archived ? (
                  <span className="flex items-center gap-1">
                    <Archive className="size-3.5" />
                    {t('repo.archived')}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 text-muted-foreground text-xs">
                <span>{t('repo.updated', { time: timeAgo(repo.pushedAt, locale) })}</span>
                <span>{t('repo.starred', { time: timeAgo(repo.starredAt, locale) })}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => undefined}>
                <ExternalLink className="size-3.5" />
                {t('repo.openGithub')}
              </Button>
            </div>

            <Separator />

            {/* Topics */}
            <section className="space-y-2">
              <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                {t('repo.topics')}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {repo.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </section>

            <Separator />

            {/* Tags */}
            <section className="space-y-2">
              <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                {t('repo.tags')}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = currentTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleRepoTag(repoId, tag.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors',
                        active
                          ? 'border-ring bg-accent font-medium'
                          : 'text-muted-foreground hover:bg-accent/60',
                      )}
                    >
                      <TagDot color={tag.color} />
                      {tag.name}
                      {active ? <Check className="size-3" /> : <Plus className="size-3" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* Collections */}
            <section className="space-y-2">
              <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                {t('repo.collections')}
              </h4>
              <div className="flex flex-col gap-1">
                {collections.map((col) => {
                  const active = col.repoIds.includes(repoId);
                  return (
                    <button
                      key={col.id}
                      onClick={() => toggleRepoInCollection(col.id, repoId)}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60"
                    >
                      <span
                        className={cn(
                          'flex size-4 items-center justify-center rounded border',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input',
                        )}
                      >
                        {active ? <Check className="size-3" /> : null}
                      </span>
                      <span className="flex-1 text-left">{col.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* Note */}
            <section className="space-y-2">
              <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                {t('repo.note')}
              </h4>
              {editingNote ? (
                <div className="space-y-2">
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder={t('repo.notePlaceholder')}
                    className="min-h-28"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNoteDraft(note?.body ?? '');
                        setEditingNote(false);
                      }}
                    >
                      {t('actions.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        saveNote(repoId, noteDraft.trim());
                        setEditingNote(false);
                      }}
                      disabled={!noteDraft.trim()}
                    >
                      {t('repo.saveNote')}
                    </Button>
                  </div>
                </div>
              ) : note ? (
                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed">
                    {note.body}
                  </p>
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>{timeAgo(note.updatedAt, locale)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingNote(true)}>
                        {t('tags.rename')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteNote(repoId)}
                      >
                        <Trash2 className="size-3.5" />
                        {t('repo.deleteNote')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingNote(true)}
                  className="w-full rounded-md border border-dashed px-3 py-4 text-center text-muted-foreground text-sm hover:bg-accent/40"
                >
                  {t('repo.noteEmpty')}
                </button>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
