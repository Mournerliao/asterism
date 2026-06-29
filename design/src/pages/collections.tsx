import { FolderGit2, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays';
import { Input, Label, Textarea } from '@/components/ui/primitives';
import { useStore } from '@/data/store';
import { useI18n } from '@/i18n';

export function CollectionsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { collections, createCollection, renameCollection, deleteCollection } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const openNew = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setDialogOpen(true);
  };

  const openEdit = (id: string, n: string, d?: string) => {
    setEditId(id);
    setName(n);
    setDescription(d ?? '');
    setDialogOpen(true);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editId) renameCollection(editId, trimmed, description.trim() || undefined);
    else createCollection(trimmed, description.trim() || undefined);
    setDialogOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-xl tracking-tight">{t('collections.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('collections.subtitle')}</p>
          </div>
          <Button onClick={openNew}>
            <FolderPlus className="size-4" />
            {t('collections.new')}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <div
              key={col.id}
              className="group flex flex-col gap-3 rounded-lg border bg-card p-5 text-card-foreground transition-colors hover:border-ring/60"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-9 items-center justify-center rounded-md bg-accent text-foreground">
                  <FolderGit2 className="size-4.5" />
                </div>
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(col.id, col.name, col.description)}
                    aria-label={t('tags.rename')}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteCollection(col.id)}
                    aria-label={t('tags.delete')}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <button onClick={() => navigate(`/collections/${col.id}`)} className="text-left">
                <div className="font-semibold tracking-tight">{col.name}</div>
                {col.description ? (
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground text-sm">
                    {col.description}
                  </p>
                ) : null}
              </button>
              <div className="mt-auto flex items-center justify-between pt-1">
                <span className="text-muted-foreground text-xs">
                  {t('collections.count', { count: col.repoIds.length })}
                </span>
                <Button variant="link" size="sm" onClick={() => navigate(`/collections/${col.id}`)}>
                  {t('collections.open')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editId ? t('tags.rename') : t('collections.new')}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="col-name">{t('collections.name')}</Label>
            <Input
              id="col-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="col-desc">{t('collections.description')}</Label>
            <Textarea
              id="col-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              {editId ? t('actions.save') : t('collections.create')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
