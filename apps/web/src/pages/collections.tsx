import type { CollectionWithMeta } from '@asterism/db';
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@asterism/ui';
import { FolderIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CollectionFormDialog } from '../components/collection-form-dialog';
import { ConfirmDialog } from '../components/confirm-dialog';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useUpdateCollection,
} from '../data/use-collections';
import { formatRelativeTime } from '../lib/format';

const SKELETON_KEYS = ['a', 'b', 'c'];

export function CollectionsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: collections, isLoading } = useCollections();
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionWithMeta | null>(null);
  const [deleting, setDeleting] = useState<CollectionWithMeta | null>(null);

  const list = collections ?? [];
  const collectionNames = list.map((item) => item.name);
  const subtitle = t('collections.subtitle', {
    total: new Intl.NumberFormat(i18n.language).format(list.length),
  });

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto">
      <PageHeader
        title={t('collections.title')}
        description={subtitle}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('collections.create')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKELETON_KEYS.map((key) => (
            <Card key={key} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={FolderIcon}
          title={t('collections.emptyTitle')}
          description={t('collections.emptyDescription')}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              {t('collections.create')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((collection) => (
            <Card
              key={collection.id}
              className="flex min-h-[130px] cursor-pointer flex-col gap-3 rounded-lg p-5 py-5 transition-colors hover:bg-accent/50"
              onClick={() => navigate(`/collections/${collection.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 truncate font-semibold text-base text-foreground">
                  {collection.name}
                </h2>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge
                    variant="secondary"
                    className="rounded-[10px] bg-secondary font-normal text-caption text-muted-foreground"
                  >
                    {t('collections.repoCount', { value: collection.repoCount })}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground"
                        aria-label={t('common.actions')}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => setEditing(collection)}>
                        <PencilIcon className="size-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleting(collection)}
                      >
                        <Trash2Icon className="size-4" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {collection.description ? (
                <p className="line-clamp-2 text-[13px] text-muted-foreground leading-5">
                  {collection.description}
                </p>
              ) : null}
              <p className="mt-auto text-caption text-muted-foreground">
                {t('browse.updated', {
                  time: formatRelativeTime(collection.updatedAt, i18n.language) ?? '',
                })}
              </p>
            </Card>
          ))}
        </div>
      )}

      <CollectionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('collections.createTitle')}
        submitLabel={t('collections.create')}
        existingNames={collectionNames}
        pending={createCollection.isPending}
        onSubmit={(values) => {
          createCollection.mutate(values, { onSuccess: () => setCreateOpen(false) });
        }}
      />

      <CollectionFormDialog
        key={editing?.id ?? 'edit'}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        title={t('collections.editTitle')}
        submitLabel={t('common.save')}
        initialName={editing?.name ?? ''}
        initialDescription={editing?.description ?? ''}
        existingNames={collectionNames}
        pending={updateCollection.isPending}
        onSubmit={(values) => {
          if (!editing) {
            return;
          }
          updateCollection.mutate(
            { id: editing.id, name: values.name, description: values.description },
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
        title={t('collections.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('collections.deleteDescription')}
        confirmLabel={t('common.delete')}
        pending={deleteCollection.isPending}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          deleteCollection.mutate(deleting, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
