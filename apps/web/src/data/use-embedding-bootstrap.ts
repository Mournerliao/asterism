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
  const runningRef = useRef<Promise<void> | null>(null);
  const completedSignatureRef = useRef<string | null>(null);
  const signature = useMemo(
    () => records.map((record) => `${record.repoId}:${repoContentHash(record.repo)}`).join('|'),
    [records],
  );

  useEffect(() => {
    if (!userId) {
      setOptedIn(false);
      setState(INITIAL_STATE);
      completedSignatureRef.current = null;
      return;
    }
    setOptedIn(readOptIn(userId));
  }, [userId]);

  const run = useCallback(
    (rememberChoice: boolean) => {
      if (!(userId && records.length > 0)) {
        return Promise.resolve();
      }
      if (rememberChoice) {
        saveOptIn(userId);
        setOptedIn(true);
      }
      if (runningRef.current) {
        return runningRef.current;
      }

      const currentSignature = signature;
      const task = (async () => {
        setState({ ...INITIAL_STATE, phase: 'checking' });
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
              setState((current) => ({
                ...current,
                phase: total === 0 ? 'ready' : 'loading-model',
                total,
              })),
            onModelProgress: (modelProgress) =>
              setState((current) => ({ ...current, modelProgress })),
            onPrepared: (backend, total) =>
              setState((current) => ({
                ...current,
                phase: 'backfilling',
                backend,
                total,
              })),
            onBackfillProgress: ({ completed, total }) =>
              setState((current) => ({ ...current, completed, total })),
          });
          completedSignatureRef.current = currentSignature;
          setState((current) => ({
            ...current,
            phase: 'ready',
            backend: result.backend ?? current.backend,
            completed: result.completed,
            total: result.total,
            modelProgress: result.total > 0 ? 100 : current.modelProgress,
            error: null,
          }));
        } catch (error) {
          setState((current) => ({
            ...current,
            phase: 'degraded',
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      })().finally(() => {
        runningRef.current = null;
      });
      runningRef.current = task;
      return task;
    },
    [records, signature, userId],
  );

  useEffect(() => {
    if (
      optedIn &&
      state.phase !== 'degraded' &&
      records.length > 0 &&
      completedSignatureRef.current !== signature &&
      !runningRef.current
    ) {
      void run(false);
    }
  }, [optedIn, records.length, run, signature, state.phase]);

  return {
    ...state,
    optedIn,
    start: () => run(true),
    retry: () => run(false),
  };
}
