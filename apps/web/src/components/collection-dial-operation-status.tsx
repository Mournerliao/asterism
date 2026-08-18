import type { BulkOperation, CollectionWithMeta } from '@asterism/db';
import { Button } from '@asterism/ui';
import { AlertTriangleIcon, LoaderCircleIcon, RotateCcwIcon, Undo2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const RECENT_RESULT_MS = 30_000;

function operationTargetId(operation: BulkOperation): string | undefined {
  return operation.items.find((item) => item.relationType === 'collection')?.targetId;
}

export function CollectionDialOperationStatus({
  operations,
  collections,
  queryError,
  busyOperationId,
  onResume,
  onRetry,
  onUndo,
  onRefresh,
}: {
  operations: readonly BulkOperation[];
  collections: readonly CollectionWithMeta[];
  queryError: boolean;
  busyOperationId?: string;
  onResume: (operation: BulkOperation) => void;
  onRetry: (operation: BulkOperation) => void;
  onUndo: (operation: BulkOperation) => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const collectionById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.name])),
    [collections],
  );
  const undoByOriginalId = useMemo(
    () =>
      new Map(
        operations.flatMap((operation) =>
          operation.interaction === 'collection_dial_undo' && operation.undoOfOperationId
            ? [[operation.undoOfOperationId, operation] as const]
            : [],
        ),
      ),
    [operations],
  );
  const visible = operations.filter((operation) => {
    if (operation.interaction !== 'collection_dial') return false;
    const undo = undoByOriginalId.get(operation.id);
    const undoHasRetryableItems = undo?.items.some((item) => item.status === 'retryable_failed');
    const undoHasPendingItems = undo?.items.some(
      (item) => item.status === 'pending' || item.status === 'running',
    );
    const undoSettled =
      !undo ||
      undo.status === 'completed' ||
      (undo.status === 'needs_attention' && !undoHasRetryableItems && !undoHasPendingItems);
    if (operation.status !== 'completed' || !undoSettled) return true;
    const expiry = operation.undoExpiresAt ? Date.parse(operation.undoExpiresAt) : 0;
    const resultAt = Date.parse(undo?.updatedAt ?? operation.updatedAt);
    return expiry > now || now - resultAt < RECENT_RESULT_MS;
  });

  if (queryError) {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
        <AlertTriangleIcon className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-caption text-foreground">
          {t('collectionDial.ledgerReadError')}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
          {t('collectionDial.readAgain')}
        </Button>
      </div>
    );
  }
  if (visible.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-label={t('collectionDial.recentOperations')}>
      {visible.map((operation) => {
        const undo = undoByOriginalId.get(operation.id);
        const undoHasRetryableItems = undo?.items.some(
          (item) => item.status === 'retryable_failed',
        );
        const undoHasPendingItems = undo?.items.some(
          (item) => item.status === 'pending' || item.status === 'running',
        );
        const undoHasTerminalItems = undo?.items.some((item) => item.status === 'terminal_failed');
        const targetId = operationTargetId(operation);
        const targetName = targetId ? collectionById.get(targetId) : undefined;
        const effectiveCount = operation.items.filter(
          (item) => item.status === 'succeeded' && item.effectiveChanged,
        ).length;
        const alreadyCount =
          operation.sourceRepoIds.length -
          operation.items.length +
          operation.items.filter((item) => item.status === 'succeeded' && !item.effectiveChanged)
            .length;
        const expired = !operation.undoExpiresAt || Date.parse(operation.undoExpiresAt) <= now;
        const busy =
          Boolean(busyOperationId) &&
          (busyOperationId === operation.id || busyOperationId === undo?.id);
        const retryableUndoItem = undo?.items.find(
          (item) => item.status === 'retryable_failed' && item.lastErrorCode,
        );
        let status = t('collectionDial.ledgerPending');
        if (undo) {
          status = undo.undoExpired
            ? t('collectionDial.undoExpired', { skippedCount: undo.undoSkippedCount })
            : undo.status === 'completed' ||
                (undoHasTerminalItems && !undoHasRetryableItems && !undoHasPendingItems)
              ? t('collectionDial.undoResult', {
                  removedCount: undo.items.filter((item) => item.status === 'succeeded').length,
                  skippedCount: undo.undoSkippedCount,
                  conflictCount:
                    undo.undoConflictCount +
                    undo.items.filter((item) => item.status === 'terminal_failed').length,
                })
              : retryableUndoItem
                ? `${t('collectionDial.undoPending')} ${t('collectionDial.undoRetryableDetail')}`
                : t('collectionDial.undoPending');
        } else if (operation.status === 'needs_attention') {
          status = t('collectionDial.ledgerNeedsAttention', { addedCount: effectiveCount });
        } else if (operation.status === 'completed' && effectiveCount === 0) {
          status = t('collectionDial.alreadyInCollection');
        } else if (operation.status === 'completed') {
          status = t('collectionDial.ledgerSuccess', {
            addedCount: effectiveCount,
            alreadyMemberCount: alreadyCount,
          });
        }
        return (
          <div
            key={operation.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2"
          >
            <p className="min-w-0 flex-1 truncate text-caption font-medium text-foreground">
              {t('collectionDial.ledgerPlacement', {
                count: operation.sourceRepoIds.length,
                collection: targetName ?? t('collectionDial.deletedCollection'),
              })}
            </p>
            <p className="text-micro text-muted-foreground" aria-live="polite">
              {status}
            </p>
            {busy ? (
              <LoaderCircleIcon
                className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
                aria-label={t('common.saving')}
              />
            ) : (
              <>
                {undo?.status === 'needs_attention' && undoHasRetryableItems ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onRetry(undo)}>
                    <RotateCcwIcon className="size-4" aria-hidden="true" />
                    {t('collectionDial.retryUndo')}
                  </Button>
                ) : null}
                {undo && undoHasPendingItems ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onResume(undo)}>
                    {t('collectionDial.resume')}
                  </Button>
                ) : null}
                {!undo && operation.status === 'needs_attention' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onRetry(operation)}
                  >
                    <RotateCcwIcon className="size-4" aria-hidden="true" />
                    {t('collectionDial.retry')}
                  </Button>
                ) : null}
                {!undo && (operation.status === 'pending' || operation.status === 'running') ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onResume(operation)}
                  >
                    {t('collectionDial.resume')}
                  </Button>
                ) : null}
                {!undo && effectiveCount > 0 && !expired ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onUndo(operation)}
                  >
                    <Undo2Icon className="size-4" aria-hidden="true" />
                    {t('collectionDial.undo')}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
