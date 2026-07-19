import type { BulkItemStatus, BulkOperation, BulkOperationItem } from './handler';

export type BulkExecutionResult = {
  status: Extract<BulkItemStatus, 'succeeded' | 'retryable_failed' | 'terminal_failed'>;
  errorCode: string | null;
  errorMessage: string | null;
};

export interface BulkExecutionStore {
  claimItems: (
    userId: string,
    operationId: string,
    statuses: BulkItemStatus[],
  ) => Promise<BulkOperationItem[]>;
  applyItem: (userId: string, item: BulkOperationItem) => Promise<void>;
  recordItemResult: (userId: string, itemId: string, result: BulkExecutionResult) => Promise<void>;
  refreshOperation: (userId: string, operationId: string) => Promise<BulkOperation | null>;
}

export class BulkExecutionError extends Error {
  constructor(
    readonly kind: 'retryable' | 'terminal',
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BulkExecutionError';
  }
}

function failureResult(error: unknown): BulkExecutionResult {
  if (error instanceof BulkExecutionError) {
    return {
      status: error.kind === 'terminal' ? 'terminal_failed' : 'retryable_failed',
      errorCode: error.code,
      errorMessage: error.message,
    };
  }
  return {
    status: 'retryable_failed',
    errorCode: 'temporary_failure',
    errorMessage: 'The relationship could not be updated. Try again.',
  };
}

export async function executeBulkOperation(
  store: BulkExecutionStore,
  userId: string,
  operationId: string,
  mode: 'pending' | 'retryable',
): Promise<BulkOperation | null> {
  const statuses: BulkItemStatus[] = mode === 'pending' ? ['pending'] : ['retryable_failed'];
  const items = await store.claimItems(userId, operationId, statuses);

  for (const item of items) {
    let result: BulkExecutionResult = {
      status: 'succeeded',
      errorCode: null,
      errorMessage: null,
    };
    try {
      await store.applyItem(userId, item);
    } catch (error) {
      result = failureResult(error);
    }
    await store.recordItemResult(userId, item.id, result);
  }

  return store.refreshOperation(userId, operationId);
}
