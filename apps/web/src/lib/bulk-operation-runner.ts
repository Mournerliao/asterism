import type { BulkItemStatus, BulkOperation, BulkOperationRequest } from '@asterism/db';

type InvokeBulkOperation = (request: BulkOperationRequest) => Promise<BulkOperation>;

export async function runBulkOperationUntilSettled(
  operationId: string,
  action: 'execute' | 'retry',
  runnableStatus: Extract<BulkItemStatus, 'pending' | 'retryable_failed'>,
  invoke: InvokeBulkOperation,
): Promise<BulkOperation> {
  let current = await invoke({ action: 'get', operationId });
  for (let batch = 0; batch < 200; batch += 1) {
    const previousRunnable = current.items.filter((item) => item.status === runnableStatus).length;
    const hasRecoverableRunning =
      action === 'execute' && current.items.some((item) => item.status === 'running');
    if (previousRunnable === 0 && !hasRecoverableRunning) return current;

    const next = await invoke({ action, operationId });
    const nextRunnable = next.items.filter((item) => item.status === runnableStatus).length;
    current = next;
    if (nextRunnable >= previousRunnable && previousRunnable > 0) return current;
    if (previousRunnable === 0) return current;
  }
  return current;
}
