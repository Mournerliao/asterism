import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toast,
} from '@asterism/ui';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function isDuplicateName(name: string, existingNames: string[], excludeName?: string): boolean {
  const normalized = name.trim().toLowerCase();
  const exclude = excludeName?.trim().toLowerCase();
  return existingNames.some((existing) => {
    const candidate = existing.trim().toLowerCase();
    if (exclude && candidate === exclude) {
      return false;
    }
    return candidate === normalized;
  });
}

/** 集合新建 / 编辑对话框（受控、纯表单），由父级注入提交逻辑。 */
export function CollectionFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initialName = '',
  initialDescription = '',
  existingNames = [],
  pending = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialDescription?: string;
  existingNames?: string[];
  pending?: boolean;
  onSubmit: (values: { name: string; description: string }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setNameError(null);
    }
  }, [open, initialName, initialDescription]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    if (isDuplicateName(trimmed, existingNames, initialName)) {
      const message = t('collections.duplicateName');
      setNameError(message);
      toast.error(message);
      return;
    }
    setNameError(null);
    onSubmit({ name: trimmed, description });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="collection-name">{t('collections.nameLabel')}</Label>
            <Input
              id="collection-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
              }}
              placeholder={t('collections.namePlaceholder')}
              autoFocus
              maxLength={80}
              aria-invalid={Boolean(nameError)}
            />
            {nameError ? <p className="text-destructive text-sm">{nameError}</p> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="collection-description">{t('collections.descriptionLabel')}</Label>
            <Textarea
              id="collection-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('collections.descriptionPlaceholder')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={pending || name.trim().length === 0}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
