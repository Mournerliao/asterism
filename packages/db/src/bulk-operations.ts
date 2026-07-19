import type { SupabaseClient } from './client';
import type { Tables } from './database.types';

export type BulkRelationType = 'tag' | 'collection';
export type BulkRelationAction = 'add' | 'remove';
export type BulkItemStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'retryable_failed'
  | 'terminal_failed'
  | 'dismissed';
export type BulkOperationStatus = 'pending' | 'running' | 'needs_attention' | 'completed';

export interface BulkChange {
  relationType: BulkRelationType;
  targetId: string;
  action: BulkRelationAction;
}

export interface BulkOperationItem extends BulkChange {
  id: string;
  repoId: string;
  status: BulkItemStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface BulkOperation {
  id: string;
  source: 'manual' | 'ai_draft';
  sourceRepoIds: string[];
  status: BulkOperationStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: BulkOperationItem[];
}

export type BulkOperationRequest =
  | {
      action: 'create';
      source: 'manual' | 'ai_draft';
      repoIds: string[];
      changes: BulkChange[];
    }
  | { action: 'get' | 'execute' | 'retry' | 'complete'; operationId: string };

const operationStatuses = new Set<BulkOperationStatus>([
  'pending',
  'running',
  'needs_attention',
  'completed',
]);
const itemStatuses = new Set<BulkItemStatus>([
  'pending',
  'running',
  'succeeded',
  'retryable_failed',
  'terminal_failed',
  'dismissed',
]);

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isBulkItem(value: unknown): value is BulkOperationItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.repoId === 'string' &&
    (item.relationType === 'tag' || item.relationType === 'collection') &&
    typeof item.targetId === 'string' &&
    (item.action === 'add' || item.action === 'remove') &&
    itemStatuses.has(item.status as BulkItemStatus) &&
    typeof item.attemptCount === 'number' &&
    isStringOrNull(item.lastErrorCode) &&
    isStringOrNull(item.lastErrorMessage)
  );
}

function isBulkOperation(value: unknown): value is BulkOperation {
  if (!value || typeof value !== 'object') return false;
  const operation = value as Record<string, unknown>;
  return (
    typeof operation.id === 'string' &&
    (operation.source === 'manual' || operation.source === 'ai_draft') &&
    Array.isArray(operation.sourceRepoIds) &&
    operation.sourceRepoIds.every((id) => typeof id === 'string') &&
    operationStatuses.has(operation.status as BulkOperationStatus) &&
    isStringOrNull(operation.completedAt) &&
    typeof operation.createdAt === 'string' &&
    typeof operation.updatedAt === 'string' &&
    Array.isArray(operation.items) &&
    operation.items.every(isBulkItem)
  );
}

function mapItem(row: Tables<'bulk_operation_items'>): BulkOperationItem {
  return {
    id: row.id,
    repoId: row.repo_id,
    relationType: row.relation_type,
    targetId: row.target_id,
    action: row.action,
    status: row.status,
    attemptCount: row.attempt_count,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
  };
}

export async function invokeBulkOperation(
  client: SupabaseClient,
  request: BulkOperationRequest,
): Promise<BulkOperation> {
  const { data, error } = await client.functions.invoke<unknown>('bulk-organize', {
    body: request,
  });
  if (error) throw error;
  const operation = (data as { operation?: unknown } | null)?.operation;
  if (!isBulkOperation(operation)) {
    throw new Error('bulk-organize returned an invalid response');
  }
  return operation;
}

export async function listBulkOperations(
  client: SupabaseClient,
  userId: string,
): Promise<BulkOperation[]> {
  const { data: operations, error: operationsError } = await client
    .from('bulk_operations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (operationsError) throw operationsError;
  const operationIds = (operations ?? []).map((operation) => operation.id);
  if (operationIds.length === 0) return [];

  const { data: items, error: itemsError } = await client
    .from('bulk_operation_items')
    .select('*')
    .eq('user_id', userId)
    .in('operation_id', operationIds)
    .order('created_at');
  if (itemsError) throw itemsError;
  const itemsByOperation = new Map<string, BulkOperationItem[]>();
  for (const row of items ?? []) {
    const mapped = mapItem(row);
    const current = itemsByOperation.get(row.operation_id);
    if (current) current.push(mapped);
    else itemsByOperation.set(row.operation_id, [mapped]);
  }

  return (operations ?? []).map((row) => ({
    id: row.id,
    source: row.source,
    sourceRepoIds: row.source_repo_ids,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: itemsByOperation.get(row.id) ?? [],
  }));
}
