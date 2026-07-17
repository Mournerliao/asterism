import type { StarredRepoRecord } from '@asterism/db';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { useSaveNote } from '../data/use-note';
import type { ReadmeRouteState } from '../lib/readme-navigation';
import { finalizeReadmeDeparture } from '../lib/readme-return-coordinator';
import {
  adjacentRepo,
  type RepoOpenModality,
  type RepoInspectorContext as SelectionContext,
  useRepoInspectorStore,
} from '../stores/repo-inspector';

const readmePath = /^\/repos\/([^/]+)\/([^/]+)\/readme\/?$/;

function parseReadmePath(pathname: string) {
  const match = pathname.match(readmePath);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return {
    owner: decodeURIComponent(match[1]),
    name: decodeURIComponent(match[2]),
  };
}

type DeferredIntent =
  | { type: 'select'; record: StarredRepoRecord; context: SelectionContext }
  | { type: 'navigate'; direction: -1 | 1 }
  | { type: 'close' }
  | { type: 'route'; to: string; state: ReadmeRouteState };

type NoteDraft = {
  repoId: string;
  serverBody: string;
  body: string;
  editing: boolean;
};

type RepoInspectorController = {
  requestOpen: (
    record: StarredRepoRecord,
    context: SelectionContext,
    modality?: RepoOpenModality,
  ) => void;
  registerContext: (context: SelectionContext) => void;
  requestNavigate: (direction: -1 | 1) => void;
  requestClose: () => void;
  requestRoute: (to: string, state: ReadmeRouteState) => void;
  syncNote: (repoId: string, serverBody: string) => void;
  noteDraft: NoteDraft | null;
  setNoteBody: (body: string) => void;
  setNoteEditing: (editing: boolean) => void;
  saveNote: () => Promise<void>;
  discardNote: () => void;
  dirty: boolean;
  openModality: RepoOpenModality;
  closeSignal: number;
  confirmOpen: boolean;
  confirmPending: boolean;
  confirmError: boolean;
  saveAndContinue: () => Promise<void>;
  discardAndContinue: () => void;
  continueEditing: () => void;
};

const RepoInspectorContext = createContext<RepoInspectorController | null>(null);

export function RepoInspectorProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const record = useRepoInspectorStore((state) => state.record);
  const context = useRepoInspectorStore((state) => state.context);
  const setSelection = useRepoInspectorStore((state) => state.setSelection);
  const setContext = useRepoInspectorStore((state) => state.setContext);
  const close = useRepoInspectorStore((state) => state.close);
  const saveMutation = useSaveNote();
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [deferred, setDeferred] = useState<DeferredIntent | null>(null);
  const [confirmError, setConfirmError] = useState(false);
  const [openModality, setOpenModality] = useState<RepoOpenModality>('pointer');
  const [closeSignal, setCloseSignal] = useState(0);
  const previousPath = useRef(location.pathname);
  const allowRouteRef = useRef(false);
  const dirty = Boolean(draft && draft.body !== draft.serverBody);
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        dirty && !allowRouteRef.current && currentLocation.pathname !== nextLocation.pathname,
      [dirty],
    ),
  );

  const perform = useCallback(
    (intent: DeferredIntent) => {
      switch (intent.type) {
        case 'select':
          setSelection(intent.record, intent.context);
          setDraft(null);
          break;
        case 'navigate': {
          const next = adjacentRepo(context, record?.repoId, intent.direction);
          if (next && context) {
            setSelection(next, context);
            setDraft(null);
          }
          break;
        }
        case 'close':
          close();
          setDraft(null);
          break;
        case 'route':
          allowRouteRef.current = true;
          close();
          setDraft(null);
          navigate(intent.to, { state: intent.state });
          break;
      }
    },
    [close, context, navigate, record?.repoId, setSelection],
  );

  const request = useCallback(
    (intent: DeferredIntent) => {
      if (dirty) {
        setConfirmError(false);
        setDeferred(intent);
        return;
      }
      perform(intent);
    },
    [dirty, perform],
  );

  const requestOpen = useCallback(
    (
      nextRecord: StarredRepoRecord,
      nextContext: SelectionContext,
      modality: RepoOpenModality = 'pointer',
    ) => {
      if (nextRecord.repoId === record?.repoId) {
        setCloseSignal((value) => value + 1);
        return;
      }
      setOpenModality(modality);
      request({ type: 'select', record: nextRecord, context: nextContext });
    },
    [record?.repoId, request],
  );

  const registerContext = useCallback(
    (nextContext: SelectionContext) => {
      if (record) {
        setContext(nextContext);
      }
    },
    [record, setContext],
  );

  const requestNavigate = useCallback(
    (direction: -1 | 1) => request({ type: 'navigate', direction }),
    [request],
  );
  const requestClose = useCallback(() => request({ type: 'close' }), [request]);
  const requestRoute = useCallback(
    (to: string, state: ReadmeRouteState) => request({ type: 'route', to, state }),
    [request],
  );

  const syncNote = useCallback((repoId: string, serverBody: string) => {
    setDraft((current) => {
      if (!current || current.repoId !== repoId) {
        return { repoId, serverBody, body: serverBody, editing: !serverBody };
      }
      if (current.body === current.serverBody && current.serverBody !== serverBody) {
        return { ...current, serverBody, body: serverBody };
      }
      return current;
    });
  }, []);

  const setNoteBody = useCallback((body: string) => {
    setDraft((current) => (current ? { ...current, body } : current));
  }, []);
  const setNoteEditing = useCallback((editing: boolean) => {
    setDraft((current) => (current ? { ...current, editing } : current));
  }, []);

  const saveNote = useCallback(async () => {
    if (!draft) {
      return;
    }
    await saveMutation.mutateAsync({ repoId: draft.repoId, body: draft.body });
    setDraft((current) =>
      current ? { ...current, serverBody: current.body, editing: false } : current,
    );
  }, [draft, saveMutation]);

  const discardNote = useCallback(() => {
    setDraft((current) =>
      current
        ? { ...current, body: current.serverBody, editing: Boolean(!current.serverBody) }
        : current,
    );
  }, []);

  const finishDeferred = useCallback(() => {
    if (deferred) {
      perform(deferred);
      setDeferred(null);
    }
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker, deferred, perform]);

  const saveAndContinue = useCallback(async () => {
    try {
      await saveNote();
      setConfirmError(false);
      finishDeferred();
    } catch {
      setConfirmError(true);
    }
  }, [finishDeferred, saveNote]);

  const discardAndContinue = useCallback(() => {
    discardNote();
    finishDeferred();
  }, [discardNote, finishDeferred]);

  const continueEditing = useCallback(() => {
    setDeferred(null);
    setConfirmError(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    const previous = previousPath.current;
    const changed = previous !== location.pathname;
    previousPath.current = location.pathname;
    allowRouteRef.current = false;
    if (!changed) {
      return;
    }

    const leftReadme = parseReadmePath(previous);
    if (leftReadme && !parseReadmePath(location.pathname)) {
      finalizeReadmeDeparture({
        nextPathname: location.pathname,
        owner: leftReadme.owner,
        name: leftReadme.name,
      });
    }

    if (!record) {
      return;
    }
    close();
    setDraft(null);
  }, [close, location.pathname, record]);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const value = useMemo<RepoInspectorController>(
    () => ({
      requestOpen,
      registerContext,
      requestNavigate,
      requestClose,
      requestRoute,
      syncNote,
      noteDraft: draft,
      setNoteBody,
      setNoteEditing,
      saveNote,
      discardNote,
      dirty,
      openModality,
      closeSignal,
      confirmOpen: Boolean(deferred) || blocker.state === 'blocked',
      confirmPending: saveMutation.isPending,
      confirmError,
      saveAndContinue,
      discardAndContinue,
      continueEditing,
    }),
    [
      blocker.state,
      closeSignal,
      confirmError,
      continueEditing,
      deferred,
      dirty,
      discardAndContinue,
      discardNote,
      draft,
      openModality,
      registerContext,
      requestClose,
      requestRoute,
      requestNavigate,
      requestOpen,
      saveAndContinue,
      saveMutation.isPending,
      saveNote,
      setNoteBody,
      setNoteEditing,
      syncNote,
    ],
  );

  return <RepoInspectorContext.Provider value={value}>{children}</RepoInspectorContext.Provider>;
}

export function useRepoInspector() {
  const value = useContext(RepoInspectorContext);
  if (!value) {
    throw new Error('useRepoInspector must be used inside RepoInspectorProvider');
  }
  return value;
}
