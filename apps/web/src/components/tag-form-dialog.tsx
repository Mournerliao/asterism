import { TAG_COLORS } from '@asterism/core';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from '@asterism/ui';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PendingActionContent } from './pending-action-content';

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

/** 标签新建 / 编辑对话框（受控、纯表单），由父级注入提交逻辑。 */
export function TagFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initialName = '',
  initialColor = TAG_COLORS[0],
  existingNames = [],
  pending = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialColor?: string;
  existingNames?: string[];
  pending?: boolean;
  onSubmit: (values: { name: string; color: string }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setColor(initialColor);
      setNameError(null);
    }
  }, [open, initialName, initialColor]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    if (isDuplicateName(trimmed, existingNames, initialName)) {
      const message = t('tags.duplicateName');
      setNameError(message);
      toast.error(message);
      return;
    }
    setNameError(null);
    onSubmit({ name: trimmed, color });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={pending}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tag-name">{t('tags.nameLabel')}</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
              }}
              placeholder={t('tags.namePlaceholder')}
              autoFocus
              maxLength={50}
              aria-invalid={Boolean(nameError)}
              disabled={pending}
            />
            {nameError ? <p className="text-destructive text-sm">{nameError}</p> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('tags.colorLabel')}</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((swatch, index) => (
                /* 色板交互不适合原生 button，按用户要求使用 div 承载 role=button */
                /* biome-ignore lint/a11y/useSemanticElements: 交互形态不适合原生 button，按用户要求使用 div */
                <div
                  key={swatch}
                  role="button"
                  tabIndex={pending ? -1 : 0}
                  aria-disabled={pending}
                  aria-label={`${t('tags.colorLabel')} ${index + 1}`}
                  aria-pressed={color === swatch}
                  onClick={() => {
                    if (!pending) {
                      setColor(swatch);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!pending && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setColor(swatch);
                    }
                  }}
                  className={cn(
                    'size-11 cursor-pointer rounded-full border-2 transition-transform sm:size-7',
                    color === swatch
                      ? 'scale-110 border-foreground'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={pending || name.trim().length === 0}
              aria-busy={pending}
            >
              <PendingActionContent
                pending={pending}
                idleLabel={submitLabel}
                pendingLabel={t('common.saving')}
              />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
