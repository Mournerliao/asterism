import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  toast,
} from '@asterism/ui';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../hooks/use-media-query';
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
  errorMessage,
  descriptionText,
  returnFocusSelector,
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
  errorMessage?: string;
  descriptionText?: string;
  returnFocusSelector?: string;
  onSubmit: (values: { name: string; description: string }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [nameError, setNameError] = useState<string | null>(null);
  const desktop = useMediaQuery('(min-width: 640px)');
  const wasOpenRef = useRef(open);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setNameError(null);
    }
  }, [open, initialName, initialDescription]);

  useEffect(() => {
    if (wasOpenRef.current && !open && returnFocusSelector) {
      queueMicrotask(() => document.querySelector<HTMLElement>(returnFocusSelector)?.focus());
    }
    wasOpenRef.current = open;
  }, [open, returnFocusSelector]);

  const restoreFocus = (event: Event) => {
    if (!returnFocusSelector) return;
    event.preventDefault();
    queueMicrotask(() => document.querySelector<HTMLElement>(returnFocusSelector)?.focus());
  };

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

  const handleOpenChange = (nextOpen: boolean) => {
    if (!pending) onOpenChange(nextOpen);
  };
  const renderForm = (header: ReactNode) => (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={pending}>
      {header}
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
          disabled={pending}
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
          disabled={pending}
        />
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          size="sm"
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
  );

  const error = errorMessage ? (
    <p role="alert" className="text-caption text-destructive">
      {errorMessage}
    </p>
  ) : null;

  if (!desktop) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-xl p-4"
          closeLabel={t('common.close')}
          closeDisabled={pending}
          onCloseAutoFocus={restoreFocus}
        >
          {renderForm(
            <SheetHeader className="p-0 pr-10">
              <SheetTitle>{title}</SheetTitle>
              {descriptionText ? <SheetDescription>{descriptionText}</SheetDescription> : null}
              {error}
            </SheetHeader>,
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        closeLabel={t('common.close')}
        closeDisabled={pending}
        onCloseAutoFocus={restoreFocus}
      >
        {renderForm(
          <DialogHeader className="pr-10">
            <DialogTitle>{title}</DialogTitle>
            {descriptionText ? (
              <p className="text-sm text-muted-foreground">{descriptionText}</p>
            ) : null}
            {error}
          </DialogHeader>,
        )}
      </DialogContent>
    </Dialog>
  );
}
