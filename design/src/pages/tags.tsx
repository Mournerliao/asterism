import { Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TagDot } from '@/components/app/tag-pill';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays';
import { Input, Label } from '@/components/ui/primitives';
import { useStore } from '@/data/store';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const TAG_COLORS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

export function TagsPage() {
  const { t } = useI18n();
  const { tags, repoTags, createTag, renameTag, deleteTag } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ids of Object.values(repoTags)) {
      for (const id of ids) map[id] = (map[id] ?? 0) + 1;
    }
    return map;
  }, [repoTags]);

  const openNew = () => {
    setEditId(null);
    setName('');
    setColor(TAG_COLORS[tags.length % TAG_COLORS.length]);
    setDialogOpen(true);
  };

  const openEdit = (id: string, currentName: string, currentColor: string) => {
    setEditId(id);
    setName(currentName);
    setColor(currentColor);
    setDialogOpen(true);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editId) renameTag(editId, trimmed);
    else createTag(trimmed, color);
    setDialogOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-xl tracking-tight">{t('tags.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('tags.subtitle')}</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="size-4" />
            {t('tags.new')}
          </Button>
        </div>

        {tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
            <TagIcon className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t('tags.empty')}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground"
              >
                <TagDot color={tag.color} className="size-3" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{tag.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {t('tags.count', { count: counts[tag.id] ?? 0 })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(tag.id, tag.name, tag.color)}
                  aria-label={t('tags.rename')}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteTag(tag.id)}
                  aria-label={t('tags.delete')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editId ? t('tags.rename') : t('tags.new')}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">{t('tags.name')}</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          {!editId ? (
            <div className="space-y-1.5">
              <Label>{t('tags.color')}</Label>
              <div className="flex gap-2">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full border-2 transition-colors',
                      color === c ? 'border-ring' : 'border-transparent',
                    )}
                    aria-label={c}
                  >
                    <span
                      className="size-5 rounded-full"
                      style={{ backgroundColor: `var(--${c})` }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              {editId ? t('actions.save') : t('tags.create')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
