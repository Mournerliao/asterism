import type { BulkChange, BulkOperation, CollectionWithMeta, TagWithCount } from '@asterism/db';
import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@asterism/ui';
import { AlertTriangleIcon, CheckCircle2Icon, LoaderCircleIcon, RotateCwIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type ChangeChoice = 'none' | 'add' | 'remove';

function TargetRow({
  kind,
  id,
  name,
  value,
  onChange,
}: {
  kind: 'tag' | 'collection';
  id: string;
  name: string;
  value: ChangeChoice;
  onChange: (key: string, value: ChangeChoice) => void;
}) {
  const { t } = useTranslation();
  const key = `${kind}:${id}`;
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent/25">
      <span className="min-w-0 truncate text-body">{name}</span>
      <Select value={value} onValueChange={(next) => onChange(key, next as ChangeChoice)}>
        <SelectTrigger
          size="sm"
          className="w-32 shrink-0"
          aria-label={t('bulk.actionFor', { name })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t('bulk.noChange')}</SelectItem>
          <SelectItem value="add">{t('bulk.add')}</SelectItem>
          <SelectItem value="remove">{t('bulk.remove')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function BulkOrganizeDialog({
  open,
  onOpenChange,
  repoCount,
  tags,
  collections,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoCount: number;
  tags: TagWithCount[];
  collections: CollectionWithMeta[];
  pending: boolean;
  error: boolean;
  onConfirm: (changes: BulkChange[]) => void;
}) {
  const { t } = useTranslation();
  const [choices, setChoices] = useState<Record<string, ChangeChoice>>({});
  useEffect(() => {
    if (open) setChoices({});
  }, [open]);
  const changes = useMemo(() => {
    const result: BulkChange[] = [];
    for (const [key, action] of Object.entries(choices)) {
      if (action === 'none') continue;
      const [relationType, targetId] = key.split(':');
      if ((relationType === 'tag' || relationType === 'collection') && targetId) {
        result.push({ relationType, targetId, action });
      }
    }
    return result;
  }, [choices]);
  const updateChoice = (key: string, value: ChangeChoice) =>
    setChoices((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] sm:max-w-[36rem]" closeDisabled={pending}>
        <DialogHeader className="pr-10">
          <DialogTitle>{t('bulk.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('bulk.dialogDescription', { count: repoCount })}</DialogDescription>
          {error ? (
            <p role="alert" className="text-caption text-destructive">
              {t('bulk.createError')}
            </p>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto rounded-lg border bg-card p-2">
          <section aria-labelledby="bulk-tags-heading">
            <h3
              id="bulk-tags-heading"
              className="px-2 py-1 font-medium text-caption text-muted-foreground"
            >
              {t('bulk.tags')}
            </h3>
            {tags.length > 0 ? (
              tags.map((tag) => (
                <TargetRow
                  key={tag.id}
                  kind="tag"
                  id={tag.id}
                  name={tag.name}
                  value={choices[`tag:${tag.id}`] ?? 'none'}
                  onChange={updateChoice}
                />
              ))
            ) : (
              <p className="px-2 py-2 text-caption text-muted-foreground">{t('bulk.noTags')}</p>
            )}
          </section>
          <section aria-labelledby="bulk-collections-heading" className="mt-2 border-t pt-2">
            <h3
              id="bulk-collections-heading"
              className="px-2 py-1 font-medium text-caption text-muted-foreground"
            >
              {t('bulk.collections')}
            </h3>
            {collections.length > 0 ? (
              collections.map((collection) => (
                <TargetRow
                  key={collection.id}
                  kind="collection"
                  id={collection.id}
                  name={collection.name}
                  value={choices[`collection:${collection.id}`] ?? 'none'}
                  onChange={updateChoice}
                />
              ))
            ) : (
              <p className="px-2 py-2 text-caption text-muted-foreground">
                {t('bulk.noCollections')}
              </p>
            )}
          </section>
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
            type="button"
            size="sm"
            disabled={pending || changes.length === 0}
            onClick={() => onConfirm(changes)}
          >
            {pending ? (
              <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
            ) : null}
            {pending ? t('bulk.applying') : t('bulk.confirm', { count: repoCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkOperationBanner({
  operation,
  resuming,
  retrying,
  completing,
  onResume,
  onRetry,
  onComplete,
}: {
  operation: BulkOperation;
  resuming: boolean;
  retrying: boolean;
  completing: boolean;
  onResume: () => void;
  onRetry: () => void;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const counts = useMemo(() => {
    const result = { succeeded: 0, retryable: 0, terminal: 0, pending: 0 };
    for (const item of operation.items) {
      if (item.status === 'succeeded' || item.status === 'dismissed') result.succeeded += 1;
      else if (item.status === 'retryable_failed') result.retryable += 1;
      else if (item.status === 'terminal_failed') result.terminal += 1;
      else result.pending += 1;
    }
    return result;
  }, [operation.items]);
  const busy = counts.pending > 0;

  return (
    <section
      aria-live="polite"
      aria-busy={resuming || retrying || completing}
      className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        {busy ? (
          <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-info motion-reduce:animate-none" />
        ) : counts.retryable + counts.terminal > 0 ? (
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" />
        ) : (
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
        )}
        <div className="min-w-0">
          <p className="font-medium text-body">
            {busy ? t('bulk.status.running') : t('bulk.status.needsAttention')}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-caption text-muted-foreground">
            <Badge variant="secondary">
              {t('bulk.result.success', { count: counts.succeeded })}
            </Badge>
            {counts.pending > 0 ? (
              <Badge variant="secondary">
                {t('bulk.result.pending', { count: counts.pending })}
              </Badge>
            ) : null}
            {counts.retryable > 0 ? (
              <Badge variant="outline">
                {t('bulk.result.retryable', { count: counts.retryable })}
              </Badge>
            ) : null}
            {counts.terminal > 0 ? (
              <Badge variant="outline">
                {t('bulk.result.terminal', { count: counts.terminal })}
              </Badge>
            ) : null}
          </div>
          {counts.terminal > 0 ? (
            <p className="mt-1 text-caption text-muted-foreground">
              {t('bulk.terminalExplanation')}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        {busy ? (
          <Button
            size="sm"
            variant="outline"
            disabled={resuming || retrying || completing}
            onClick={onResume}
          >
            <RotateCwIcon
              className={cn('size-4', resuming && 'animate-spin motion-reduce:animate-none')}
            />
            {t('bulk.continue')}
          </Button>
        ) : null}
        {counts.retryable > 0 && counts.pending === 0 ? (
          <Button size="sm" variant="outline" disabled={retrying || completing} onClick={onRetry}>
            <RotateCwIcon
              className={cn('size-4', retrying && 'animate-spin motion-reduce:animate-none')}
            />
            {t('bulk.retry')}
          </Button>
        ) : null}
        {counts.terminal > 0 && counts.retryable === 0 && counts.pending === 0 ? (
          <Button size="sm" disabled={completing} onClick={onComplete}>
            {t('bulk.endOperation')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
