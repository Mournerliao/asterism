// @vitest-environment happy-dom

import type { BulkOperation } from '@asterism/db';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { CollectionDialOperationStatus } from './collection-dial-operation-status';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function operation(overrides: Partial<BulkOperation> = {}): BulkOperation {
  return {
    id: 'operation-1',
    source: 'manual',
    interaction: 'collection_dial',
    clientRequestId: '11111111-1111-4111-8111-111111111111',
    undoOfOperationId: null,
    undoExpiresAt: new Date(Date.now() + 30_000).toISOString(),
    undoEligibleCount: 0,
    undoSkippedCount: 0,
    undoConflictCount: 0,
    undoExpired: false,
    sourceRepoIds: ['repo-1', 'repo-2'],
    status: 'needs_attention',
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        repoId: 'repo-1',
        relationType: 'collection',
        targetId: 'collection-1',
        action: 'add',
        status: 'succeeded',
        attemptCount: 1,
        lastErrorCode: null,
        lastErrorMessage: null,
        effectiveChanged: true,
        effectiveMutationId: 'mutation-1',
        effectiveRelationVersion: 1,
      },
      {
        id: 'item-2',
        repoId: 'repo-2',
        relationType: 'collection',
        targetId: 'collection-1',
        action: 'add',
        status: 'retryable_failed',
        attemptCount: 1,
        lastErrorCode: 'temporary_failure',
        lastErrorMessage: 'Try again',
        effectiveChanged: false,
        effectiveMutationId: null,
        effectiveRelationVersion: null,
      },
    ],
    ...overrides,
  };
}

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('durable Collection Dial operation status', () => {
  it('offers independent Retry and Undo for a partial success', () => {
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const onRetry = vi.fn();
    const onUndo = vi.fn();
    act(() => {
      root?.render(
        <CollectionDialOperationStatus
          operations={[operation()]}
          collections={[
            {
              id: 'collection-1',
              name: 'Systems',
              description: null,
              repoCount: 0,
              updatedAt: new Date().toISOString(),
            },
          ]}
          queryError={false}
          onResume={vi.fn()}
          onRetry={onRetry}
          onUndo={onUndo}
          onRefresh={vi.fn()}
        />,
      );
    });

    const retry = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Retry'),
    );
    const undo = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Undo'),
    );
    expect(retry).toBeTruthy();
    expect(undo).toBeTruthy();
    act(() => undo?.click());
    expect(onUndo).toHaveBeenCalledWith(expect.objectContaining({ id: 'operation-1' }));
  });

  it('does not offer fake Undo when the operation changed no relationship', () => {
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => {
      root?.render(
        <CollectionDialOperationStatus
          operations={[
            operation({
              status: 'completed',
              completedAt: new Date().toISOString(),
              undoExpiresAt: null,
              items: [],
              sourceRepoIds: ['repo-1'],
            }),
          ]}
          collections={[]}
          queryError={false}
          onResume={vi.fn()}
          onRetry={vi.fn()}
          onUndo={vi.fn()}
          onRefresh={vi.fn()}
        />,
      );
    });

    expect(document.body.textContent).toContain('Already in collection');
    expect(
      [...document.querySelectorAll('button')].some((button) => button.textContent === 'Undo'),
    ).toBe(false);
  });

  it('resumes a pending Undo recovered from the durable ledger', () => {
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const original = operation({ status: 'completed', completedAt: new Date().toISOString() });
    const [originalItem] = original.items;
    if (!originalItem) throw new Error('fixture item is required');
    const undo = operation({
      id: 'undo-1',
      interaction: 'collection_dial_undo',
      undoOfOperationId: original.id,
      undoEligibleCount: 1,
      status: 'pending',
      items: [
        {
          ...originalItem,
          id: 'undo-item-1',
          action: 'remove',
          status: 'pending',
          effectiveChanged: false,
          effectiveMutationId: null,
          effectiveRelationVersion: null,
        },
      ],
    });
    const onResume = vi.fn();
    act(() => {
      root?.render(
        <CollectionDialOperationStatus
          operations={[undo, original]}
          collections={[]}
          queryError={false}
          onResume={onResume}
          onRetry={vi.fn()}
          onUndo={vi.fn()}
          onRefresh={vi.fn()}
        />,
      );
    });

    const resume = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Resume'),
    );
    act(() => resume?.click());
    expect(onResume).toHaveBeenCalledWith(expect.objectContaining({ id: 'undo-1' }));
  });

  it('reports terminal Undo conflicts without offering a no-op Retry', () => {
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const original = operation({ status: 'completed', completedAt: new Date().toISOString() });
    const [originalItem] = original.items;
    if (!originalItem) throw new Error('fixture item is required');
    const undo = operation({
      id: 'undo-1',
      interaction: 'collection_dial_undo',
      undoOfOperationId: original.id,
      undoEligibleCount: 1,
      status: 'needs_attention',
      items: [
        {
          ...originalItem,
          id: 'undo-item-1',
          action: 'remove',
          status: 'terminal_failed',
          lastErrorCode: 'undo_conflict',
          effectiveChanged: false,
          effectiveMutationId: null,
          effectiveRelationVersion: null,
        },
      ],
    });
    act(() => {
      root?.render(
        <CollectionDialOperationStatus
          operations={[undo, original]}
          collections={[]}
          queryError={false}
          onResume={vi.fn()}
          onRetry={vi.fn()}
          onUndo={vi.fn()}
          onRefresh={vi.fn()}
        />,
      );
    });

    expect(document.body.textContent).toContain('Conflicts 1');
    expect(
      [...document.querySelectorAll('button')].some((button) =>
        button.textContent?.includes('Retry Undo'),
      ),
    ).toBe(false);

    const [undoItem] = undo.items;
    if (!undoItem) throw new Error('Undo fixture item is required');
    const retryableItem = {
      ...undoItem,
      id: 'undo-item-2',
      status: 'retryable_failed' as const,
      lastErrorCode: 'temporary_failure',
    };
    const pendingItem = {
      ...undoItem,
      id: 'undo-item-3',
      status: 'pending' as const,
      lastErrorCode: null,
    };
    act(() => {
      root?.render(
        <CollectionDialOperationStatus
          operations={[{ ...undo, items: [...undo.items, retryableItem, pendingItem] }, original]}
          collections={[]}
          queryError={false}
          onResume={vi.fn()}
          onRetry={vi.fn()}
          onUndo={vi.fn()}
          onRefresh={vi.fn()}
        />,
      );
    });

    expect(document.body.textContent).toContain('Undo is still in progress');
    expect(
      [...document.querySelectorAll('button')].some((button) =>
        button.textContent?.includes('Retry Undo'),
      ),
    ).toBe(true);
    expect(
      [...document.querySelectorAll('button')].some((button) =>
        button.textContent?.includes('Resume'),
      ),
    ).toBe(true);
  });
});
