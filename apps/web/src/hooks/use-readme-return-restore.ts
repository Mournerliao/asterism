import type { StarredRepoRecord } from '@asterism/db';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  consumePendingReadmeReturn,
  type PendingReadmeReturn,
  resolveReturnVisibility,
} from '../lib/readme-return-coordinator';
import type { RepoInspectorContext } from '../stores/repo-inspector';

type UseReadmeReturnRestoreOptions = {
  sourceKey: string;
  records: readonly StarredRepoRecord[];
  scrollElement: HTMLElement | null;
  inspectorContext: RepoInspectorContext;
  requestOpen: (
    record: StarredRepoRecord,
    context: RepoInspectorContext,
    modality?: 'keyboard' | 'pointer',
  ) => void;
  /** False while the source list is still loading. */
  ready: boolean;
  /** When the originating collection no longer exists, fall back to Browse. */
  collectionMissing?: boolean;
};

/**
 * Consumes a pending README return once the source list and scroll element are ready.
 * Reopens Quick Look and restores scroll only when the repository remains visible.
 */
export function useReadmeReturnRestore({
  sourceKey,
  records,
  scrollElement,
  inspectorContext,
  requestOpen,
  ready,
  collectionMissing = false,
}: UseReadmeReturnRestoreOptions) {
  const navigate = useNavigate();
  const pendingRef = useRef<PendingReadmeReturn | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (settledRef.current) {
      return;
    }
    if (!pendingRef.current) {
      pendingRef.current = consumePendingReadmeReturn(sourceKey);
    }
    const pending = pendingRef.current;
    if (!pending) {
      return;
    }

    if (collectionMissing) {
      settledRef.current = true;
      pendingRef.current = null;
      void navigate('/', { replace: true });
      return;
    }

    if (!ready || !scrollElement) {
      return;
    }

    settledRef.current = true;
    pendingRef.current = null;

    const record = pending.reopenRepoId
      ? (records.find((item) => item.repoId === pending.reopenRepoId) ?? null)
      : null;
    const visibility = resolveReturnVisibility(pending, Boolean(record));
    if (visibility.scrollTop != null) {
      scrollElement.scrollTop = visibility.scrollTop;
    }
    if (record && visibility.reopenRepoId) {
      requestOpen(record, inspectorContext, 'pointer');
    }
  }, [
    collectionMissing,
    inspectorContext,
    navigate,
    ready,
    records,
    requestOpen,
    scrollElement,
    sourceKey,
  ]);
}
