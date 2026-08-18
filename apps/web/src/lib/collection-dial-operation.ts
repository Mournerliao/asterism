import type { BulkOperation, BulkOperationItem, BulkOperationRequest } from '@asterism/db';
import { runBulkOperationUntilSettled } from './bulk-operation-runner';

type InvokeBulkOperation = (
  request: Exclude<BulkOperationRequest, { action: 'undo' }>,
) => Promise<BulkOperation>;

export type CollectionDialOperationResult =
  | { kind: 'success'; operation: BulkOperation }
  | {
      kind: 'retryable_failure';
      reason: 'transport' | 'execution' | 'convergence';
      operation?: BulkOperation;
      message?: string;
    }
  | { kind: 'terminal_failure'; operation: BulkOperation; message?: string };

export function mergeBulkOperationIntoList(
  current: readonly BulkOperation[] | undefined,
  operation: BulkOperation,
): BulkOperation[] {
  return [operation, ...(current ?? []).filter((item) => item.id !== operation.id)];
}

export function mergeCollectionRepoLinks(
  current: readonly { collectionId: string; repoId: string }[] | undefined,
  targetId: string,
  repoIds: readonly string[],
): { collectionId: string; repoId: string }[] {
  const links = current ?? [];
  const seen = new Set(links.map((link) => `${link.collectionId}:${link.repoId}`));
  const additions = repoIds.flatMap((repoId) =>
    seen.has(`${targetId}:${repoId}`) ? [] : [{ collectionId: targetId, repoId }],
  );
  return additions.length === 0 ? [...links] : [...links, ...additions];
}

export function summarizeCollectionDialCounts(input: {
  alreadyMemberCount: number;
  missingCount: number;
  items: readonly BulkOperationItem[];
}) {
  const addedCount = input.items.filter(
    (item) => item.status === 'succeeded' && item.effectiveChanged,
  ).length;
  const becameAlreadyMemberCount = input.items.filter(
    (item) => item.status === 'succeeded' && !item.effectiveChanged,
  ).length;
  const terminalCount = input.items.filter(
    (item) => item.status === 'terminal_failed' || item.status === 'dismissed',
  ).length;
  const explicitlyRetryableCount = input.items.filter(
    (item) =>
      item.status === 'pending' || item.status === 'running' || item.status === 'retryable_failed',
  ).length;
  const unreportedMissingCount = Math.max(0, input.missingCount - input.items.length);
  return {
    addedCount,
    alreadyMemberCount: input.alreadyMemberCount + becameAlreadyMemberCount,
    retryableCount: explicitlyRetryableCount + unreportedMissingCount,
    terminalCount,
  };
}

export async function runCollectionDialOperation(input: {
  repoIds: readonly string[];
  itemRepoIds: readonly string[];
  targetId: string;
  clientRequestId: string;
  existingOperation?: BulkOperation;
  invoke: InvokeBulkOperation;
  converge: (repoIds: readonly string[], targetId: string) => Promise<boolean>;
  onWriteCommitted?: (repoIds: readonly string[], targetId: string) => void;
}): Promise<CollectionDialOperationResult> {
  let operation = input.existingOperation;
  try {
    if (!operation) {
      operation = await input.invoke({
        action: 'create',
        source: 'manual',
        interaction: 'collection_dial',
        clientRequestId: input.clientRequestId,
        repoIds: [...input.repoIds],
        itemRepoIds: [...input.itemRepoIds],
        changes: [{ relationType: 'collection', targetId: input.targetId, action: 'add' }],
      });
    }

    const relevantItems = () =>
      operation?.items.filter(
        (item) =>
          input.repoIds.includes(item.repoId) &&
          item.relationType === 'collection' &&
          item.targetId === input.targetId &&
          item.action === 'add',
      ) ?? [];
    if (relevantItems().some((item) => item.status === 'retryable_failed')) {
      operation = await runBulkOperationUntilSettled(
        operation.id,
        'retry',
        'retryable_failed',
        input.invoke,
      );
    } else if (
      relevantItems().some((item) => item.status === 'pending' || item.status === 'running')
    ) {
      operation = await runBulkOperationUntilSettled(
        operation.id,
        'execute',
        'pending',
        input.invoke,
      );
    }

    const items = relevantItems();
    const terminalItem = items.find(
      (item) => item.status === 'terminal_failed' || item.status === 'dismissed',
    );
    if (items.length === 0) {
      const converged = await input.converge(input.repoIds, input.targetId);
      return converged
        ? { kind: 'success', operation }
        : { kind: 'retryable_failure', reason: 'convergence', operation };
    }
    if (terminalItem) {
      return {
        kind: 'terminal_failure',
        operation,
        message: terminalItem?.lastErrorMessage ?? undefined,
      };
    }
    const unsettledItem = items.find((item) => item.status !== 'succeeded');
    if (unsettledItem) {
      return {
        kind: 'retryable_failure',
        reason: 'execution',
        operation,
        message: unsettledItem.lastErrorMessage ?? undefined,
      };
    }
    input.onWriteCommitted?.(input.repoIds, input.targetId);
    void input.converge(input.repoIds, input.targetId);
    return { kind: 'success', operation };
  } catch (error) {
    return {
      kind: 'retryable_failure',
      reason: 'transport',
      operation,
      message: error instanceof Error ? error.message : undefined,
    };
  }
}
