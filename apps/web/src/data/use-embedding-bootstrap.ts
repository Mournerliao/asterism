import { DEFAULT_EMBEDDING_MODEL, repoContentHash } from '@asterism/core';
import { listReposToEmbed, type StarredRepoRecord, upsertRepoEmbedding } from '@asterism/db';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../auth/use-session';
import {
  embeddingOptInStorageKey,
  runRepositoryEmbeddingBootstrap,
} from '../lib/embedding-bootstrap';
import type { EmbeddingRuntimeBackend } from '../lib/embedding-runtime';
import { supabase } from '../lib/supabase';

export type EmbeddingBootstrapPhase =
  | 'idle'
  | 'checking'
  | 'loading-model'
  | 'backfilling'
  | 'ready'
  | 'degraded';

export interface EmbeddingBootstrapState {
  phase: EmbeddingBootstrapPhase;
  modelProgress: number;
  completed: number;
  total: number;
  backend: EmbeddingRuntimeBackend | null;
  error: string | null;
}

const INITIAL_STATE: EmbeddingBootstrapState = {
  phase: 'idle',
  modelProgress: 0,
  completed: 0,
  total: 0,
  backend: null,
  error: null,
};

function readOptIn(userId: string) {
  try {
    return localStorage.getItem(embeddingOptInStorageKey(userId)) === 'enabled';
  } catch {
    return false;
  }
}

function saveOptIn(userId: string) {
  try {
    localStorage.setItem(embeddingOptInStorageKey(userId), 'enabled');
  } catch {
    // Cache / storage restrictions must not block keyword search.
  }
}

export function useEmbeddingBootstrap(records: readonly StarredRepoRecord[]) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [optedIn, setOptedIn] = useState(false);
  const [state, setState] = useState<EmbeddingBootstrapState>(INITIAL_STATE);
  const [rerunRequested, setRerunRequested] = useState(false);
  const activeUserRef = useRef(userId);
  activeUserRef.current = userId;
  const consentedUserRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const runningRef = useRef<{
    generation: number;
    promise: Promise<void>;
    userId: string;
  } | null>(null);
  const completedSignatureRef = useRef<string | null>(null);
  const signature = useMemo(
    () => records.map((record) => `${record.repoId}:${repoContentHash(record.repo)}`).join('|'),
    [records],
  );
  const signatureRef = useRef(signature);
  signatureRef.current = signature;

  useEffect(() => {
    generationRef.current += 1;
    runningRef.current = null;
    completedSignatureRef.current = null;
    setRerunRequested(false);
    setState(INITIAL_STATE);
    if (!userId) {
      consentedUserRef.current = null;
      setOptedIn(false);
      return;
    }
    const hasConsent = readOptIn(userId);
    consentedUserRef.current = hasConsent ? userId : null;
    setOptedIn(hasConsent);
  }, [userId]);

  const run = useCallback(
    (rememberChoice: boolean) => {
      if (!(userId && records.length > 0)) {
        return Promise.resolve();
      }
      if (rememberChoice) {
        saveOptIn(userId);
        consentedUserRef.current = userId;
        setOptedIn(true);
      }
      const generation = generationRef.current;
      const running = runningRef.current;
      if (running?.userId === userId && running.generation === generation) {
        return running.promise;
      }

      const currentSignature = signature;
      const isCurrent = () =>
        activeUserRef.current === userId && generationRef.current === generation;
      const updateState = (
        updater: (current: EmbeddingBootstrapState) => EmbeddingBootstrapState,
      ) => {
        if (isCurrent()) {
          setState(updater);
        }
      };
      const task = (async () => {
        updateState(() => ({ ...INITIAL_STATE, phase: 'checking' }));
        try {
          let runtime: Awaited<
            ReturnType<typeof import('../lib/embedding-runtime')['getEmbeddingRuntime']>
          > | null = null;
          const result = await runRepositoryEmbeddingBootstrap({
            records,
            listPending: (desired) =>
              listReposToEmbed(supabase, {
                userId,
                model: DEFAULT_EMBEDDING_MODEL,
                desired,
              }),
            prepare: async (onProgress) => {
              const runtimeModule = await import('../lib/embedding-runtime');
              runtime = runtimeModule.getEmbeddingRuntime();
              return runtime.prepare(onProgress);
            },
            embedBatch: (inputs) => {
              if (!runtime) {
                throw new Error('Embedding runtime was not prepared');
              }
              return runtime.embed(inputs);
            },
            persist: (write) => upsertRepoEmbedding(supabase, { userId, ...write }),
            onPending: (total) =>
              updateState((current) => ({
                ...current,
                phase: total === 0 ? 'ready' : 'loading-model',
                total,
              })),
            onModelProgress: (modelProgress) =>
              updateState((current) => ({ ...current, modelProgress })),
            onPrepared: (backend, total) =>
              updateState((current) => ({
                ...current,
                phase: 'backfilling',
                backend,
                total,
              })),
            onBackfillProgress: ({ completed, total }) =>
              updateState((current) => ({ ...current, completed, total })),
          });
          if (isCurrent()) {
            completedSignatureRef.current = currentSignature;
          }
          updateState((current) => ({
            ...current,
            phase: 'ready',
            backend: result.backend ?? current.backend,
            completed: result.completed,
            total: result.total,
            modelProgress: result.total > 0 ? 100 : current.modelProgress,
            error: null,
          }));
        } catch (error) {
          updateState((current) => ({
            ...current,
            phase: 'degraded',
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      })().finally(() => {
        if (runningRef.current?.promise === task) {
          runningRef.current = null;
        }
        if (isCurrent() && signatureRef.current !== currentSignature) {
          setRerunRequested(true);
        }
      });
      runningRef.current = { generation, promise: task, userId };
      return task;
    },
    [records, signature, userId],
  );

  useEffect(() => {
    if (
      optedIn &&
      consentedUserRef.current === userId &&
      state.phase !== 'degraded' &&
      records.length > 0 &&
      (rerunRequested || completedSignatureRef.current !== signature) &&
      !(
        runningRef.current?.userId === userId &&
        runningRef.current.generation === generationRef.current
      )
    ) {
      setRerunRequested(false);
      void run(false);
    }
  }, [optedIn, records.length, rerunRequested, run, signature, state.phase, userId]);

  return {
    ...state,
    optedIn,
    start: () => run(true),
    retry: () => run(false),
  };
}
