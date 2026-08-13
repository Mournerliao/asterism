import type { BulkOperation, BulkOperationRequest } from '@asterism/db';
import { runBulkOperationUntilSettled } from './bulk-operation-runner';

type InvokeBulkOperation = (request: BulkOperationRequest) => Promise<BulkOperation>;

export type CollectionDialOperationResult =
  | { kind: 'success'; operation: BulkOperation }
  | {
      kind: 'retryable_failure';
      reason: 'transport' | 'execution' | 'convergence';
      operation?: BulkOperation;
      message?: string;
    }
  | { kind: 'terminal_failure'; operation: BulkOperation; message?: string };

export async function runCollectionDialOperation(input: {
  repoId: string;
  targetId: string;
  clientRequestId: string;
  existingOperation?: BulkOperation;
  invoke: InvokeBulkOperation;
  converge: (repoId: string, targetId: string) => Promise<boolean>;
}): Promise<CollectionDialOperationResult> {
  let operation = input.existingOperation;
  try {
    if (!operation) {
      operation = await input.invoke({
        action: 'create',
        source: 'manual',
        interaction: 'collection_dial',
        clientRequestId: input.clientRequestId,
        repoIds: [input.repoId],
        changes: [{ relationType: 'collection', targetId: input.targetId, action: 'add' }],
      });
    }

    const initialItem = operation.items.find(
      (item) =>
        item.repoId === input.repoId &&
        item.relationType === 'collection' &&
        item.targetId === input.targetId &&
        item.action === 'add',
    );
    if (initialItem?.status === 'retryable_failed') {
      operation = await runBulkOperationUntilSettled(
        operation.id,
        'retry',
        'retryable_failed',
        input.invoke,
      );
    } else if (initialItem?.status === 'pending' || initialItem?.status === 'running') {
      operation = await runBulkOperationUntilSettled(
        operation.id,
        'execute',
        'pending',
        input.invoke,
      );
    }

    const item = operation.items.find(
      (candidate) =>
        candidate.repoId === input.repoId &&
        candidate.relationType === 'collection' &&
        candidate.targetId === input.targetId &&
        candidate.action === 'add',
    );
    if (!item || item.status === 'terminal_failed' || item.status === 'dismissed') {
      return {
        kind: 'terminal_failure',
        operation,
        message: item?.lastErrorMessage ?? undefined,
      };
    }
    if (item.status !== 'succeeded') {
      return {
        kind: 'retryable_failure',
        reason: 'execution',
        operation,
        message: item.lastErrorMessage ?? undefined,
      };
    }
    const converged = await input.converge(input.repoId, input.targetId);
    return converged
      ? { kind: 'success', operation }
      : { kind: 'retryable_failure', reason: 'convergence', operation };
  } catch (error) {
    return {
      kind: 'retryable_failure',
      reason: 'transport',
      operation,
      message: error instanceof Error ? error.message : undefined,
    };
  }
}
