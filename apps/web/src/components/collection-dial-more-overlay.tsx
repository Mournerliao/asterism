import type { CollectionDialSnapshotEntry } from '@asterism/core';
import { searchCollectionDialCatalog } from '@asterism/core';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@asterism/ui';
import { SearchIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../hooks/use-media-query';

export function CollectionDialMoreOverlay({
  open,
  catalog,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  catalog: readonly CollectionDialSnapshotEntry[];
  onOpenChange: (open: boolean) => void;
  onSelect: (target: CollectionDialSnapshotEntry) => void;
}) {
  const { t } = useTranslation();
  const desktop = useMediaQuery('(min-width: 640px)');
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCollectionDialCatalog(catalog, query), [catalog, query]);
  const title = t('collectionDial.moreTitle');
  const description = t('collectionDial.moreDescription');
  const restoreTrigger = (event: Event) => {
    event.preventDefault();
    queueMicrotask(() =>
      document.querySelector<HTMLButtonElement>('[data-collection-dial-more]')?.focus(),
    );
  };
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      queueMicrotask(() =>
        document.querySelector<HTMLButtonElement>('[data-collection-dial-more]')?.focus(),
      );
    }
    wasOpenRef.current = open;
  }, [open]);
  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-foreground/60"
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('collectionDial.moreSearchPlaceholder')}
          aria-label={t('collectionDial.moreSearchLabel')}
          className="pl-9"
        />
      </div>
      <div className="max-h-80 min-h-0 overflow-y-auto" role="listbox" aria-label={title}>
        {results.length > 0 ? (
          results.map((entry) => (
            <Button
              key={entry.id}
              type="button"
              variant="ghost"
              role="option"
              aria-selected="false"
              className="h-auto w-full justify-start px-3 py-2 text-left"
              onClick={() => onSelect(entry)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-caption font-medium text-foreground">
                  {entry.name}
                </span>
                <span className="block truncate text-micro text-muted-foreground">
                  {entry.description || t('collectionDial.moreNoDescription')}
                </span>
              </span>
              <span className="font-mono text-micro text-muted-foreground">
                {t('collectionDial.moreMissingCount', { count: entry.missingCount })}
              </span>
            </Button>
          ))
        ) : (
          <p className="px-3 py-8 text-center text-caption text-muted-foreground">
            {t('collectionDial.moreEmpty')}
          </p>
        )}
      </div>
    </div>
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          closeLabel={t('common.close')}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onCloseAutoFocus={restoreTrigger}
        >
          <DialogHeader className="pr-10">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] rounded-t-xl"
        closeLabel={t('common.close')}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        onCloseAutoFocus={restoreTrigger}
      >
        <SheetHeader className="pr-12">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 px-4 pb-4">{content}</div>
      </SheetContent>
    </Sheet>
  );
}
