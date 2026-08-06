import { Button } from '@asterism/ui';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

type Variant = 'A' | 'B' | 'C';
type Repo = { id: string; name: string; description: string; collection?: string };

const REPOS: Repo[] = [
  {
    id: '1',
    name: 'vercel/ai',
    description: 'Build AI-powered products with TypeScript.',
    collection: 'AI tooling',
  },
  {
    id: '2',
    name: 'sindresorhus/awesome',
    description: 'Curated list of awesome lists.',
    collection: 'Reading list',
  },
  {
    id: '3',
    name: 'shadcn-ui/ui',
    description: 'Beautifully designed components built with Radix.',
    collection: 'UI systems',
  },
  {
    id: '4',
    name: 'TanStack/query',
    description: 'Powerful asynchronous state management for TS.',
    collection: 'Frontend',
  },
  {
    id: '5',
    name: 'oven-sh/bun',
    description: 'Incredibly fast JavaScript runtime.',
    collection: 'Tooling',
  },
  {
    id: '6',
    name: 'denoland/deno',
    description: 'The secure runtime for JavaScript and TypeScript.',
    collection: 'Tooling',
  },
  {
    id: '7',
    name: 'withastro/astro',
    description: 'The web framework for content-driven websites.',
    collection: 'Frontend',
  },
  {
    id: '8',
    name: 'vitest-dev/vitest',
    description: 'Blazing fast unit test framework powered by Vite.',
    collection: 'Tooling',
  },
  {
    id: '9',
    name: 'pnpm/pnpm',
    description: 'Fast, disk space efficient package manager.',
    collection: 'Tooling',
  },
  {
    id: '10',
    name: 'remix-run/react-router',
    description: 'Declarative routing for React.',
    collection: 'Frontend',
  },
];
const FIRST_REPO: Repo = REPOS[0] ?? { id: '1', name: 'vercel/ai', description: '' };
const COLLECTIONS = ['AI tooling', 'Reading list', 'UI systems', 'Frontend', 'Tooling'];
const VARIANTS: Record<Variant, string> = { A: '浅弧卡槽', B: 'Dock 纵深', C: '明显轮盘' };

function DialState({
  active,
  target,
  phase,
  lastAction,
  onPrev,
  onNext,
  onDrop,
  onCancel,
  onRetry,
  onUndo,
}: {
  active: Repo;
  target: number;
  phase: 'ready' | 'pending' | 'success' | 'failure';
  lastAction: string;
  onPrev: () => void;
  onNext: () => void;
  onDrop: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 rounded-lg border border-primary/40 bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption text-muted-foreground">{t('collectionDial.activeRepo')}</p>
          <p className="font-semibold">{active.name}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          aria-label={t('collectionDial.cancel')}
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-caption text-muted-foreground">{t('collectionDial.dragHint')}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-md border p-2 hover:bg-accent"
          aria-label={t('collectionDial.previous')}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-caption text-muted-foreground">{t('collectionDial.target')}</p>
          <p className="truncate font-semibold text-primary">{COLLECTIONS[target]}</p>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md border p-2 hover:bg-accent"
          aria-label={t('collectionDial.next')}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      {phase === 'failure' ? (
        <div className="mt-3 rounded-md bg-destructive/10 p-2 text-caption text-destructive">
          {t('collectionDial.failure')}
        </div>
      ) : null}
      {phase === 'success' ? (
        <div className="mt-3 rounded-md bg-success/10 p-2 text-caption text-success">
          {lastAction}{' '}
          <button type="button" onClick={onUndo} className="ml-2 underline">
            {t('collectionDial.undo')}
          </button>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {phase === 'failure' ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcwIcon className="size-3.5" />
            {t('collectionDial.retry')}
          </Button>
        ) : null}
        {phase !== 'success' ? (
          <Button size="sm" onClick={onDrop} disabled={phase === 'pending'}>
            {phase === 'pending' ? t('collectionDial.pending') : t('collectionDial.drop')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RepoButton({ repo, onPick }: { repo: Repo; onPick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      draggable
      onClick={onPick}
      onDragStart={onPick}
      className="group flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{repo.name}</span>
        <span className="block truncate text-caption text-muted-foreground">
          {repo.description}
        </span>
      </span>
      <span className="shrink-0 text-micro text-muted-foreground">{t('collectionDial.pick')}</span>
    </button>
  );
}

export function CollectionDialPrototype() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const variant = (params.get('variant')?.toUpperCase() as Variant) || 'A';
  const safeVariant: Variant = variant in VARIANTS ? variant : 'A';
  const [activeId, setActiveId] = useState<string | null>(null);
  const [target, setTarget] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'pending' | 'success' | 'failure'>('ready');
  const [lastAction, setLastAction] = useState('');
  const [undoAvailable, setUndoAvailable] = useState(false);
  const active = REPOS.find((repo) => repo.id === activeId) ?? FIRST_REPO;
  const setVariant = useCallback(
    (next: Variant) => {
      setParams(
        (current) => {
          current.set('prototype', 'collection-dial');
          current.set('variant', next);
          return current;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const cycle = useCallback(
    (direction: number) => {
      const order: Variant[] = ['A', 'B', 'C'];
      const next = order[(order.indexOf(safeVariant) + direction + order.length) % order.length];
      setVariant(next ?? safeVariant);
    },
    [safeVariant, setVariant],
  );
  const rotate = useCallback(
    (direction: number) =>
      setTarget((current) => Math.max(0, Math.min(COLLECTIONS.length - 1, current + direction))),
    [],
  );
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (event.target as HTMLElement)?.isContentEditable)
        return;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'q') rotate(-1);
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'e') rotate(1);
      if (event.key === 'Escape') setActiveId(null);
      if (event.key === 'Enter' && activeId && phase === 'ready') {
        setPhase('pending');
        window.setTimeout(() => {
          if (activeId === '4') {
            setPhase('failure');
          } else {
            setPhase('success');
            setLastAction(t('collectionDial.success', { collection: COLLECTIONS[target] }));
            setUndoAvailable(true);
          }
        }, 500);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, phase, rotate, t, target]);
  const pick = (repo: Repo) => {
    setActiveId(repo.id);
    setPhase('ready');
    setUndoAvailable(false);
  };
  const drop = () => {
    setPhase('pending');
    window.setTimeout(() => {
      if (active.id === '4') setPhase('failure');
      else {
        setPhase('success');
        setLastAction(t('collectionDial.success', { collection: COLLECTIONS[target] }));
        setUndoAvailable(true);
      }
    }, 500);
  };
  const reset = () => {
    setActiveId(null);
    setPhase('ready');
    setUndoAvailable(false);
  };
  const dial = activeId ? (
    <DialState
      active={active}
      target={target}
      phase={phase}
      lastAction={lastAction}
      onPrev={() => rotate(-1)}
      onNext={() => rotate(1)}
      onDrop={drop}
      onCancel={reset}
      onRetry={drop}
      onUndo={() => {
        setUndoAvailable(false);
        setLastAction(t('collectionDial.undone'));
      }}
    />
  ) : null;
  const repoList = (
    <div className="grid gap-2 sm:grid-cols-2">
      {REPOS.map((repo) => (
        <RepoButton key={repo.id} repo={repo} onPick={() => pick(repo)} />
      ))}
    </div>
  );
  return (
    <div className="-m-6 min-h-full overflow-y-auto bg-background px-6 py-6 pb-28">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-caption font-medium text-primary">PROTOTYPE · collection dial</p>
            <h1 className="mt-1 text-xl font-semibold">{t('collectionDial.title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t('collectionDial.description')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveId(null);
              setPhase('ready');
              setUndoAvailable(false);
            }}
          >
            {t('collectionDial.reset')}
          </Button>
        </div>
        {safeVariant === 'A' ? (
          <div className="rounded-xl border bg-muted/35 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{t('collectionDial.browseSurface')}</h2>
              <span className="text-caption text-muted-foreground">
                {t('collectionDial.continuousHint')}
              </span>
            </div>
            {repoList}
            {dial}
          </div>
        ) : null}
        {safeVariant === 'B' ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{t('collectionDial.browseSurface')}</h2>
                <span className="text-caption text-muted-foreground">
                  {t('collectionDial.continuousHint')}
                </span>
              </div>
              {repoList}
            </section>
            <aside className="rounded-xl border bg-card p-4 lg:sticky lg:top-4 lg:h-fit">
              <p className="text-caption font-medium text-muted-foreground">
                {t('collectionDial.dockTitle')}
              </p>
              <p className="mt-1 text-sm">{t('collectionDial.dockDescription')}</p>
              {dial ?? (
                <p className="mt-8 text-center text-caption text-muted-foreground">
                  {t('collectionDial.emptyDial')}
                </p>
              )}
            </aside>
          </div>
        ) : null}
        {safeVariant === 'C' ? (
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold">{t('collectionDial.browseSurface')}</h2>
              <span className="text-caption text-muted-foreground">
                {t('collectionDial.continuousHint')}
              </span>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="grid gap-2 sm:grid-cols-2">
                {REPOS.map((repo) => (
                  <RepoButton key={repo.id} repo={repo} onPick={() => pick(repo)} />
                ))}
              </div>
              <div className="flex min-h-[360px] items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-primary/5 p-8">
                <div className="w-full max-w-[280px] text-center">
                  <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow-sm">
                    <span className="text-2xl font-semibold">{activeId ? '1' : '—'}</span>
                  </div>
                  {activeId ? (
                    dial
                  ) : (
                    <p className="text-caption text-muted-foreground">
                      {t('collectionDial.emptyDial')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <nav
        aria-label={t('collectionDial.variantNav')}
        className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-2 rounded-full border bg-card/95 p-2 shadow-sm backdrop-blur"
      >
        <button
          type="button"
          onClick={() => cycle(-1)}
          className="rounded-full p-2 hover:bg-accent"
          aria-label={t('collectionDial.previousVariant')}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <div className="min-w-[150px] text-center text-caption">
          <span className="font-semibold text-primary">{safeVariant}</span>
          <span className="mx-1 text-muted-foreground">—</span>
          {VARIANTS[safeVariant]}
        </div>
        <button
          type="button"
          onClick={() => cycle(1)}
          className="rounded-full p-2 hover:bg-accent"
          aria-label={t('collectionDial.nextVariant')}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </nav>
      {undoAvailable ? (
        <div className="fixed right-4 bottom-20 rounded-lg border bg-card p-3 text-caption shadow-sm">
          <CheckIcon className="mr-1 inline size-3.5 text-success" />
          {lastAction}
        </div>
      ) : null}
    </div>
  );
}
