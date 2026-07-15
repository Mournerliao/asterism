import type { TagWithCount } from '@asterism/db';
import { Button, Card, Input, Skeleton } from '@asterism/ui';
import { PencilIcon, PlusIcon, SearchIcon, TagIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/confirm-dialog';
import { EmptyState } from '../components/empty-state';
import { LoadingRegion } from '../components/loading-region';
import { PageHeader } from '../components/page-header';
import { TagGridSkeleton } from '../components/page-loading-states';
import { SearchInputIcon } from '../components/search-input-icon';
import { TagFormDialog } from '../components/tag-form-dialog';
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from '../data/use-tags';

export function TagsPage() {
  const { t, i18n } = useTranslation();
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TagWithCount | null>(null);
  const [deleting, setDeleting] = useState<TagWithCount | null>(null);

  const list = tags ?? [];
  const tagNames = list.map((tag) => tag.name);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter((tag) => tag.name.toLowerCase().includes(q));
  }, [list, query]);

  const subtitle = t('tags.subtitle', {
    total: new Intl.NumberFormat(i18n.language).format(list.length),
  });

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto">
      <PageHeader
        title={t('tags.title')}
        description={isLoading ? undefined : subtitle}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('tags.create')}
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-9 w-full max-w-md" />
      ) : list.length > 0 ? (
        <div className="relative max-w-md">
          <SearchInputIcon className="left-3" />
          <Input
            className="px-9"
            placeholder={t('tags.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      {isLoading ? (
        <LoadingRegion label={t('loading.tags')}>
          <TagGridSkeleton />
        </LoadingRegion>
      ) : list.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title={t('tags.emptyTitle')}
          description={t('tags.emptyDescription')}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              {t('tags.create')}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={SearchIcon} title={t('tags.noResults')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tag) => (
            <Card
              key={tag.id}
              className="flex h-[62px] items-center justify-between gap-2 rounded-lg px-4 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="size-3 shrink-0 rounded-md"
                  style={{ backgroundColor: tag.color ?? 'var(--muted-foreground)' }}
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium text-[13px] text-foreground">
                    {tag.name}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {t('tags.repoCount', { value: tag.repoCount })}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground sm:size-7"
                  aria-label={t('tags.edit')}
                  onClick={() => setEditing(tag)}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground hover:text-destructive sm:size-7"
                  aria-label={t('tags.delete')}
                  onClick={() => setDeleting(tag)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TagFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('tags.createTitle')}
        submitLabel={t('tags.create')}
        existingNames={tagNames}
        pending={createTag.isPending}
        onSubmit={(values) => {
          createTag.mutate(
            { name: values.name, color: values.color, seed: list.length },
            { onSuccess: () => setCreateOpen(false) },
          );
        }}
      />

      <TagFormDialog
        key={editing?.id ?? 'edit'}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        title={t('tags.editTitle')}
        submitLabel={t('common.save')}
        initialName={editing?.name ?? ''}
        initialColor={editing?.color ?? undefined}
        existingNames={tagNames}
        pending={updateTag.isPending}
        onSubmit={(values) => {
          if (!editing) {
            return;
          }
          updateTag.mutate(
            { id: editing.id, name: values.name, color: values.color },
            { onSuccess: () => setEditing(null) },
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        title={t('tags.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('tags.deleteDescription')}
        confirmLabel={t('tags.delete')}
        pending={deleteTag.isPending}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          deleteTag.mutate(deleting, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
