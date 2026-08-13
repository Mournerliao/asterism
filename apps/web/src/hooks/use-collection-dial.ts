import {
  type CollectionDialState,
  collectionDialReducer,
  createCollectionDialPickup,
  rankCollectionDialTargets,
} from '@asterism/core';
import {
  type BulkOperation,
  type CollectionRepoLink,
  type CollectionWithMeta,
  invokeBulkOperation,
  listCollectionRepos,
  type StarredRepoRecord,
} from '@asterism/db';
import { useQueryClient } from '@tanstack/react-query';
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useSession } from '../auth/use-session';
import { collectionKeys, collectionRepoKeys } from '../data/keys';
import {
  type CollectionDialUnavailableReason,
  getCollectionDialUnavailableReason,
} from '../lib/collection-dial-availability';
import { runCollectionDialOperation } from '../lib/collection-dial-operation';
import {
  exceedsCollectionDialDragThreshold,
  findCollectionDialFocusTarget,
  shouldSuppressCollectionDialClick,
} from '../lib/collection-dial-pointer';
import { supabase } from '../lib/supabase';

let sessionMru: string[] = [];

function rememberTarget(targetId: string) {
  sessionMru = [targetId, ...sessionMru.filter((id) => id !== targetId)].slice(0, 7);
}

function targetAtPoint(point: { x: number; y: number }): string | null {
  const element = document.elementFromPoint(point.x, point.y);
  const target = element?.closest<HTMLElement>('[data-collection-dial-target]');
  if (!target || target.getAttribute('aria-hidden') === 'true' || target.hasAttribute('disabled')) {
    return null;
  }
  return target.dataset.collectionDialTarget ?? null;
}

type PointerSession = {
  pointerId: number;
  origin: { x: number; y: number };
  record: StarredRepoRecord;
  source: HTMLButtonElement;
  dragging: boolean;
};

export function useCollectionDial({
  collections,
  collectionRepos,
  preparePickup,
  onUnavailable,
  retryableMessage,
  terminalMessage,
  convergenceMessage,
}: {
  collections: readonly CollectionWithMeta[];
  collectionRepos: readonly CollectionRepoLink[];
  preparePickup: () => boolean;
  onUnavailable: (reason: CollectionDialUnavailableReason) => void;
  retryableMessage: string;
  terminalMessage: string;
  convergenceMessage: string;
}) {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(collectionDialReducer, { phase: 'idle' });
  const stateRef = useRef<CollectionDialState>(state);
  stateRef.current = state;
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const focusOnOpenRef = useRef(false);
  const sourceFocusRef = useRef<HTMLButtonElement | null>(null);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const suppressNextClickRef = useRef(false);
  const suppressClickSourceRef = useRef<HTMLButtonElement | null>(null);
  const suppressClickUntilRef = useRef(0);
  const skipNextProtectionRef = useRef(false);
  const operationRef = useRef<BulkOperation | undefined>(undefined);
  const clientRequestIdRef = useRef<string | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const restoreFocus = useCallback((repoId?: string) => {
    const source = sourceFocusRef.current;
    queueMicrotask(() => {
      if (!repoId) return;
      findCollectionDialFocusTarget(document, repoId, source)?.focus();
    });
  }, []);

  const cancel = useCallback(() => {
    const current = stateRef.current;
    const repoId = current.phase === 'active' ? current.pickup.repoIds[0] : undefined;
    dispatch({ type: 'cancel' });
    setDragPoint(null);
    setDropTargetId(null);
    operationRef.current = undefined;
    clientRequestIdRef.current = undefined;
    restoreFocus(repoId);
  }, [restoreFocus]);

  const startPickup = useCallback(
    (
      record: StarredRepoRecord,
      source: HTMLButtonElement,
      focusOnOpen: boolean,
      protectionAlreadyPassed: boolean,
    ) => {
      if (!protectionAlreadyPassed && !preparePickup()) return false;
      const targets = rankCollectionDialTargets({
        collections,
        collectionRepos,
        repoIds: [record.repoId],
        sessionMru,
      });
      if (targets.length === 0) {
        onUnavailable(getCollectionDialUnavailableReason(collections.length));
        return false;
      }
      sourceFocusRef.current = source;
      focusOnOpenRef.current = focusOnOpen;
      operationRef.current = undefined;
      clientRequestIdRef.current = crypto.randomUUID();
      dispatch({
        type: 'pickup',
        pickup: createCollectionDialPickup({
          repoIds: [record.repoId],
          repoLabel: record.repo.fullName,
          targets,
        }),
      });
      return true;
    },
    [collectionRepos, collections, onUnavailable, preparePickup],
  );

  const onGripPickup = useCallback(
    (record: StarredRepoRecord, event: ReactMouseEvent<HTMLButtonElement>) => {
      if (
        suppressNextClickRef.current &&
        shouldSuppressCollectionDialClick(
          suppressClickSourceRef.current === event.currentTarget,
          performance.now(),
          suppressClickUntilRef.current,
        )
      ) {
        suppressNextClickRef.current = false;
        suppressClickSourceRef.current = null;
        skipNextProtectionRef.current = false;
        return;
      }
      suppressNextClickRef.current = false;
      suppressClickSourceRef.current = null;
      const protectedAlready = skipNextProtectionRef.current;
      skipNextProtectionRef.current = false;
      startPickup(record, event.currentTarget, true, protectedAlready);
    },
    [startPickup],
  );

  const onGripPointerDown = useCallback(
    (record: StarredRepoRecord, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (!preparePickup()) {
        event.preventDefault();
        suppressNextClickRef.current = true;
        suppressClickSourceRef.current = event.currentTarget;
        suppressClickUntilRef.current = performance.now() + 500;
        return;
      }
      skipNextProtectionRef.current = true;
      pointerSessionRef.current = {
        pointerId: event.pointerId,
        origin: { x: event.clientX, y: event.clientY },
        record,
        source: event.currentTarget,
        dragging: false,
      };
    },
    [preparePickup],
  );

  const select = useCallback((targetId: string) => {
    const current = stateRef.current;
    if (current.phase !== 'active') return;
    const currentTarget = current.pickup.targets[current.activeIndex];
    if (currentTarget?.id !== targetId) {
      operationRef.current = undefined;
      clientRequestIdRef.current = crypto.randomUUID();
    }
    dispatch({ type: 'select', targetId });
  }, []);

  const converge = useCallback(
    async (repoId: string, targetId: string) => {
      if (!userId) return false;
      await queryClient.invalidateQueries({ queryKey: collectionRepoKeys.list(userId) });
      const links = await queryClient.fetchQuery({
        queryKey: collectionRepoKeys.list(userId),
        queryFn: () => listCollectionRepos(supabase, userId),
      });
      await queryClient.invalidateQueries({ queryKey: collectionKeys.list(userId) });
      return links.some((link) => link.repoId === repoId && link.collectionId === targetId);
    },
    [queryClient, userId],
  );

  const confirm = useCallback(
    async (explicitTargetId?: string) => {
      const current = stateRef.current;
      if (current.phase !== 'active' || current.status === 'submitting') return;
      const target = explicitTargetId
        ? current.pickup.targets.find((candidate) => candidate.id === explicitTargetId)
        : current.pickup.targets[current.activeIndex];
      const repoId = current.pickup.repoIds[0];
      if (!target || !repoId) return;
      if (explicitTargetId && target.id !== current.pickup.targets[current.activeIndex]?.id) {
        dispatch({ type: 'select', targetId: target.id });
        operationRef.current = undefined;
        clientRequestIdRef.current = crypto.randomUUID();
      }
      dispatch({ type: 'submit' });
      setDropTargetId(null);
      const result = await runCollectionDialOperation({
        repoId,
        targetId: target.id,
        clientRequestId: clientRequestIdRef.current ?? crypto.randomUUID(),
        existingOperation: operationRef.current,
        invoke: (request) => invokeBulkOperation(supabase, request),
        converge,
      });
      if (!mountedRef.current) return;
      operationRef.current = result.operation;
      if (result.kind === 'success') {
        rememberTarget(target.id);
        dispatch({ type: 'success', operationId: result.operation.id });
      } else if (result.kind === 'terminal_failure') {
        dispatch({
          type: 'failure',
          retryable: false,
          operationId: result.operation.id,
          message: terminalMessage,
        });
      } else {
        dispatch({
          type: 'failure',
          retryable: true,
          operationId: result.operation?.id,
          message: result.reason === 'convergence' ? convergenceMessage : retryableMessage,
        });
      }
    },
    [converge, convergenceMessage, retryableMessage, terminalMessage],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const pointer = pointerSessionRef.current;
      if (!pointer || pointer.pointerId !== event.pointerId) return;
      const point = { x: event.clientX, y: event.clientY };
      if (!pointer.dragging) {
        if (!exceedsCollectionDialDragThreshold(pointer.origin, point)) return;
        pointer.dragging = startPickup(pointer.record, pointer.source, false, true);
        if (!pointer.dragging) {
          pointerSessionRef.current = null;
          return;
        }
        suppressNextClickRef.current = true;
        suppressClickSourceRef.current = pointer.source;
        suppressClickUntilRef.current = performance.now() + 500;
      }
      event.preventDefault();
      setDragPoint(point);
      const targetId = targetAtPoint(point);
      setDropTargetId(targetId);
      if (targetId) select(targetId);
    };
    const finishPointer = (event: PointerEvent, canceled: boolean) => {
      const pointer = pointerSessionRef.current;
      if (!pointer || pointer.pointerId !== event.pointerId) return;
      pointerSessionRef.current = null;
      skipNextProtectionRef.current = false;
      if (!pointer.dragging) return;
      const point = { x: event.clientX, y: event.clientY };
      const targetId = canceled ? null : targetAtPoint(point);
      setDragPoint(null);
      setDropTargetId(null);
      if (targetId) void confirm(targetId);
      else cancel();
    };
    const onPointerUp = (event: PointerEvent) => finishPointer(event, false);
    const onPointerCancel = (event: PointerEvent) => finishPointer(event, true);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [cancel, confirm, select, startPickup]);

  return {
    state,
    dragPoint,
    dropTargetId,
    focusOnOpen: focusOnOpenRef.current,
    onGripPickup,
    onGripPointerDown,
    select,
    step: (direction: -1 | 1) => dispatch({ type: 'step', direction }),
    confirm: () => void confirm(),
    retry: () => void confirm(),
    cancel,
  };
}
