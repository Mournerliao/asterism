import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { repos } from '@/data/mock';

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'failed';

interface AppStateValue {
  signedIn: boolean;
  signIn: () => void;
  signOut: () => void;
  user: { login: string; name: string; avatarColor: string };
  syncStatus: SyncStatus;
  syncPage: number;
  syncProgress: number; // 0..1
  lastSyncedAt: string | null;
  startSync: (incremental?: boolean) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const TOTAL_PAGES = 7;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncPage, setSyncPage] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const startSync = useCallback((incremental = false) => {
    if (timer.current) window.clearInterval(timer.current);
    setSyncStatus('syncing');
    setSyncPage(0);
    const pages = incremental ? 2 : TOTAL_PAGES;
    let page = 0;
    timer.current = window.setInterval(() => {
      page += 1;
      setSyncPage(page);
      if (page >= pages) {
        if (timer.current) window.clearInterval(timer.current);
        // Simulate one ret--able failure occasionally is omitted for determinism.
        setSyncStatus('done');
        setLastSyncedAt(new Date().toISOString());
        window.setTimeout(() => setSyncStatus('idle'), 2500);
      }
    }, 480);
  }, []);

  const signIn = useCallback(() => {
    setSignedIn(true);
    // kick off the first full sync right after login
    window.setTimeout(() => startSync(false), 400);
  }, [startSync]);

  const signOut = useCallback(() => {
    setSignedIn(false);
    setSyncStatus('idle');
    setLastSyncedAt(null);
  }, []);

  const syncProgress = useMemo(() => {
    if (syncStatus !== 'syncing') return syncStatus === 'done' ? 1 : 0;
    return Math.min(1, syncPage / TOTAL_PAGES);
  }, [syncStatus, syncPage]);

  const value = useMemo<AppStateValue>(
    () => ({
      signedIn,
      signIn,
      signOut,
      user: { login: 'stargazer', name: 'Stargazer', avatarColor: 'var(--chart-1)' },
      syncStatus,
      syncPage,
      syncProgress,
      lastSyncedAt,
      startSync,
    }),
    [signedIn, signIn, signOut, syncStatus, syncPage, syncProgress, lastSyncedAt, startSync],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

export const totalRepoCount = repos.length;
