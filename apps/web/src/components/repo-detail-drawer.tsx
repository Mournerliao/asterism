import { repoFullName } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@asterism/ui';
import {
  ArchiveIcon,
  CheckIcon,
  ExternalLinkIcon,
  GitForkIcon,
  PlusIcon,
  StarIcon,
  XIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollectionRepos, useToggleCollectionRepo } from '../data/use-collection-repos';
import { useCollections } from '../data/use-collections';
import { useNote, useSaveNote } from '../data/use-note';
import { useRepoTags, useToggleRepoTag } from '../data/use-repo-tags';
import { useCreateTag, useTags } from '../data/use-tags';
import { formatCompactNumber, formatRelativeTime } from '../lib/format';
import { languageColor } from '../lib/language-colors';
import { useRepoDrawer } from '../stores/repo-drawer';
import { TagBadge } from './tag-badge';
import { TagFormDialog } from './tag-form-dialog';

export function RepoDetailDrawer() {
  const record = useRepoDrawer((state) => state.record);
  const close = useRepoDrawer((state) => state.close);

  return (
    <Sheet
      open={Boolean(record)}
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-[480px] [&>button.absolute]:hidden"
      >
        {record ? <DrawerBody record={record} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-[13px] text-foreground">{children}</h3>;
}

function DrawerBody({ record }: { record: StarredRepoRecord }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const { repo, repoId } = record;
  const dotColor = languageColor(repo.language);
  const updated = formatRelativeTime(repo.pushedAt, locale);

  return (
    <>
      <SheetHeader className="flex-row items-center justify-between border-b px-6 py-6">
        <SheetTitle className="font-semibold text-drawer-title">{t('drawer.title')}</SheetTitle>
        <button
          type="button"
          onClick={() => useRepoDrawer.getState().close()}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t('common.cancel')}
        >
          <XIcon className="size-4" />
        </button>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-6 py-5">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">{repo.owner}</span>
          <h2 className="font-bold text-repo-name text-foreground">{repo.name}</h2>
          {repo.description ? (
            <p className="text-[13px] text-muted-foreground leading-5">{repo.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
            {repo.language ? (
              <span className="flex items-center gap-1.5 text-foreground">
                <span
                  aria-hidden="true"
                  className={cn('size-2.5 rounded-full', !dotColor && 'bg-muted-foreground')}
                  style={dotColor ? { backgroundColor: dotColor } : undefined}
                />
                {repo.language}
              </span>
            ) : null}
            <span className="flex items-center gap-1 font-mono">
              <StarIcon className="size-3.5" aria-hidden="true" />
              {t('drawer.stars', { value: formatCompactNumber(repo.stargazers, locale) })}
            </span>
            {repo.forks != null ? (
              <span className="flex items-center gap-1 font-mono">
                <GitForkIcon className="size-3.5" aria-hidden="true" />
                {t('drawer.forks', { value: formatCompactNumber(repo.forks, locale) })}
              </span>
            ) : null}
            {updated ? <span>{t('browse.updated', { time: updated })}</span> : null}
            {repo.archived ? (
              <span className="flex items-center gap-1">
                <ArchiveIcon className="size-3.5" aria-hidden="true" />
                {t('browse.archived')}
              </span>
            ) : null}
          </div>
        </div>

        <TagsSection repoId={repoId} />
        <CollectionsSection repoId={repoId} />
        <NotesSection repoId={repoId} />
      </div>

      <div className="border-t px-6 py-4">
        <Button asChild variant="outline" className="h-9 w-full">
          <a
            href={`https://github.com/${repoFullName(repo)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLinkIcon className="size-4" />
            {t('drawer.openOnGitHub')}
          </a>
        </Button>
      </div>
    </>
  );
}

function TagsSection({ repoId }: { repoId: string }) {
  const { t } = useTranslation();
  const { data: tags = [] } = useTags();
  const { data: links = [] } = useRepoTags();
  const toggle = useToggleRepoTag();
  const createTag = useCreateTag();
  const [createOpen, setCreateOpen] = useState(false);

  const assignedIds = useMemo(
    () => new Set(links.filter((link) => link.repoId === repoId).map((link) => link.tagId)),
    [links, repoId],
  );
  const assignedTags = tags.filter((tag) => assignedIds.has(tag.id));

  const handleCreate = async (values: { name: string; color: string }) => {
    const created = await createTag.mutateAsync({
      name: values.name,
      color: values.color,
      seed: tags.length,
    });
    await toggle.mutateAsync({ repoId, tagId: created.id, assigned: false });
    setCreateOpen(false);
  };

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{t('drawer.tags')}</SectionLabel>
      <div className="flex flex-wrap items-center gap-1.5">
        {assignedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            removeLabel={t('drawer.removeTag', { name: tag.name })}
            onRemove={() => toggle.mutate({ repoId, tagId: tag.id, assigned: true })}
          />
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 gap-1 rounded-sm px-2 text-caption">
              <PlusIcon className="size-3" />
              {t('drawer.addTag')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-auto">
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={assignedIds.has(tag.id)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() =>
                  toggle.mutate({ repoId, tagId: tag.id, assigned: assignedIds.has(tag.id) })
                }
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: tag.color ?? 'var(--muted-foreground)' }}
                />
                {tag.name}
              </DropdownMenuCheckboxItem>
            ))}
            {tags.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              {t('drawer.createTag')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TagFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('tags.createTitle')}
        submitLabel={t('tags.create')}
        existingNames={tags.map((tag) => tag.name)}
        pending={createTag.isPending}
        onSubmit={handleCreate}
      />
    </section>
  );
}

function CollectionsSection({ repoId }: { repoId: string }) {
  const { t } = useTranslation();
  const { data: collections = [] } = useCollections();
  const { data: links = [] } = useCollectionRepos();
  const toggle = useToggleCollectionRepo();

  const memberIds = useMemo(
    () => new Set(links.filter((link) => link.repoId === repoId).map((link) => link.collectionId)),
    [links, repoId],
  );

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{t('drawer.collections')}</SectionLabel>
      {collections.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{t('drawer.noCollections')}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {collections.map((collection) => {
            const member = memberIds.has(collection.id);
            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => toggle.mutate({ collectionId: collection.id, repoId, member })}
                className={cn(
                  'flex h-8 items-center justify-between rounded-sm px-2 text-left text-[13px] transition-colors',
                  member
                    ? 'bg-background text-foreground'
                    : 'bg-background/50 text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="truncate">{collection.name}</span>
                {member ? <CheckIcon className="size-4 shrink-0 text-link" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NotesSection({ repoId }: { repoId: string }) {
  const { t } = useTranslation();
  const { data: serverBody = '' } = useNote(repoId);
  const save = useSaveNote();
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setBody(serverBody);
    setEditing(false);
  }, [serverBody]);

  const dirty = body !== serverBody;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionLabel>{t('drawer.notes')}</SectionLabel>
        {!editing && serverBody ? (
          <button
            type="button"
            className="text-caption text-link hover:underline"
            onClick={() => setEditing(true)}
          >
            {t('common.edit')}
          </button>
        ) : null}
      </div>
      {editing || !serverBody ? (
        <>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('drawer.notesPlaceholder')}
            rows={4}
            className="min-h-16 rounded-md bg-background text-[13px] leading-5"
          />
          {dirty ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBody(serverBody);
                  setEditing(false);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={save.isPending}
                onClick={() => {
                  save.mutate({ repoId, body });
                  setEditing(false);
                }}
              >
                {t('drawer.saveNote')}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-md bg-background p-3 text-[13px] text-muted-foreground leading-5">
          {serverBody}
        </div>
      )}
    </section>
  );
}
