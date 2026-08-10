import { Button } from '@asterism/ui';
import { ArrowRightIcon, CheckIcon, GripVerticalIcon, RotateCcwIcon } from 'lucide-react';
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import './collection-dial-prototype.css';

type Repo = { id: string; name: string; description: string; collection?: string };
type Phase = 'ready' | 'pending' | 'success' | 'failure';
type Point = { x: number; y: number };
type VisibleFolderCount = 3 | 5 | 7;
type FolderPosition = { x: number; y: number; rotate: number; scale: number };

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
const COLLECTIONS = [
  'AI tooling',
  'Reading list',
  'UI systems',
  'Frontend',
  'Tooling',
  'Developer experience',
  'Data & storage',
];
const FOLDER_LAYOUTS: Record<VisibleFolderCount, readonly FolderPosition[]> = {
  3: [
    { x: -190, y: 13, rotate: -12, scale: 0.88 },
    { x: 0, y: 0, rotate: 0, scale: 1 },
    { x: 190, y: 13, rotate: 12, scale: 0.88 },
  ],
  5: [
    { x: -306, y: 52, rotate: -18, scale: 0.8 },
    { x: -164, y: 14, rotate: -9, scale: 0.92 },
    { x: 0, y: 0, rotate: 0, scale: 1 },
    { x: 164, y: 14, rotate: 9, scale: 0.92 },
    { x: 306, y: 52, rotate: 18, scale: 0.8 },
  ],
  7: [
    { x: -418, y: 76, rotate: -22, scale: 0.72 },
    { x: -292, y: 38, rotate: -15, scale: 0.8 },
    { x: -150, y: 10, rotate: -7, scale: 0.92 },
    { x: 0, y: 0, rotate: 0, scale: 1 },
    { x: 150, y: 10, rotate: 7, scale: 0.92 },
    { x: 292, y: 38, rotate: 15, scale: 0.8 },
    { x: 418, y: 76, rotate: 22, scale: 0.72 },
  ],
};

function getVisibleFolderCount(width: number): VisibleFolderCount {
  if (width >= 1120) return 7;
  if (width >= 560) return 5;
  return 3;
}

function getCenteredWindowStart(target: number, count: VisibleFolderCount) {
  const half = Math.floor(count / 2);
  return target - half;
}

function getFolderPosition(count: VisibleFolderCount, slot: number): FolderPosition {
  const layout = FOLDER_LAYOUTS[count];
  const first = layout[0] ?? { x: 0, y: 0, rotate: 0, scale: 1 };
  const last = layout.at(-1) ?? first;
  if (slot < 0) {
    return { x: first.x - 96, y: first.y + 24, rotate: first.rotate - 5, scale: 0.64 };
  }
  if (slot >= count) {
    return { x: last.x + 96, y: last.y + 24, rotate: last.rotate + 5, scale: 0.64 };
  }
  return layout[slot] ?? first;
}

function RepoButton({
  repo,
  active,
  onPick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  repo: Repo;
  active: boolean;
  onPick: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="collection-dial-repo"
      data-active={active || undefined}
      onClick={onPick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      aria-pressed={active}
    >
      <span className="collection-dial-repo__grip" aria-hidden="true">
        <GripVerticalIcon />
      </span>
      <span className="collection-dial-repo__copy">
        <span className="collection-dial-repo__name">{repo.name}</span>
        <span className="collection-dial-repo__description">{repo.description}</span>
      </span>
      <span className="collection-dial-repo__action">{t('collectionDial.pick')}</span>
    </button>
  );
}

function CollectionFolder({
  index,
  slot,
  visibleCount,
  visible,
  name,
  selected,
  open,
  pending,
  onSelect,
}: {
  index: number;
  slot: number;
  visibleCount: VisibleFolderCount;
  visible: boolean;
  name: string;
  selected: boolean;
  open: boolean;
  pending: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const position = getFolderPosition(visibleCount, slot);
  const centerSlot = Math.floor(visibleCount / 2);
  const style = {
    '--folder-x': position.x,
    '--folder-y': position.y,
    '--folder-rotate': `${position.rotate}deg`,
    '--folder-scale': position.scale,
    '--folder-depth': Math.max(0, visibleCount - Math.abs(slot - centerSlot)),
  } as CSSProperties;

  return (
    <div className="collection-folder-position" data-visible={visible || undefined} style={style}>
      <button
        type="button"
        className="collection-folder"
        data-collection-index={index}
        data-selected={selected || undefined}
        data-open={open || undefined}
        data-pending={pending || undefined}
        onClick={onSelect}
        tabIndex={visible ? 0 : -1}
        aria-hidden={visible ? undefined : true}
        aria-label={t('collectionDial.selectCollection', { collection: name })}
        aria-pressed={selected}
      >
        <span className="collection-folder__shadow" aria-hidden="true" />
        <span className="collection-folder__back" aria-hidden="true">
          <span className="collection-folder__tab" />
          <span className="collection-folder__paper collection-folder__paper--rear" />
          <span className="collection-folder__paper collection-folder__paper--front" />
        </span>
        <span className="collection-folder__mouth" aria-hidden="true" />
        <span className="collection-folder__front" aria-hidden="true">
          <span className="collection-folder__shine" />
        </span>
      </button>
      <span className="collection-folder__label" aria-hidden="true">
        {name}
      </span>
    </div>
  );
}

export function CollectionDialPrototype() {
  const { t } = useTranslation();
  const prototypeRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [target, setTarget] = useState(3);
  const [visibleFolderCount, setVisibleFolderCount] = useState<VisibleFolderCount>(5);
  const [hoveredTarget, setHoveredTarget] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [lastAction, setLastAction] = useState('');
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [dropVector, setDropVector] = useState<Point | null>(null);
  const active = REPOS.find((repo) => repo.id === activeId) ?? FIRST_REPO;

  const pointerSessionRef = useRef<{
    pointerId: number;
    repo: Repo;
    origin: Point;
    dragging: boolean;
  } | null>(null);
  const dragPointRef = useRef<Point | null>(null);
  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const failedRepoIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const element = prototypeRef.current;
    if (!element) return;

    const update = (width: number) => {
      const next = getVisibleFolderCount(width);
      setVisibleFolderCount((current) => (current === next ? current : next));
    };
    update(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      update(entry?.contentRect.width ?? element.clientWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const selectTarget = useCallback(
    (index: number) => {
      if (phase === 'pending') return;
      setTarget(Math.max(0, Math.min(COLLECTIONS.length - 1, index)));
      setHoveredTarget(null);
      setPhase('ready');
      setUndoAvailable(false);
    },
    [phase],
  );

  const rotate = useCallback(
    (direction: number) => {
      if (phase === 'pending') return;
      setTarget((current) => Math.max(0, Math.min(COLLECTIONS.length - 1, current + direction)));
      setHoveredTarget(null);
      setPhase('ready');
      setUndoAvailable(false);
    },
    [phase],
  );

  const reset = useCallback(() => {
    clearTimers();
    pointerSessionRef.current = null;
    dragPointRef.current = null;
    setActiveId(null);
    setTarget(3);
    setHoveredTarget(null);
    setPhase('ready');
    setDragging(false);
    setDragPoint(null);
    setDropVector(null);
    setUndoAvailable(false);
    failedRepoIdsRef.current.clear();
  }, [clearTimers]);

  const pick = useCallback((repo: Repo) => {
    if (suppressClickRef.current) return;
    setActiveId(repo.id);
    setPhase('ready');
    setUndoAvailable(false);
    setDropVector(null);
  }, []);

  const updateDragOverlay = useCallback((point: Point) => {
    dragPointRef.current = point;
    dragOverlayRef.current?.style.setProperty('--drag-x', `${point.x}px`);
    dragOverlayRef.current?.style.setProperty('--drag-y', `${point.y}px`);
  }, []);

  const resolveHoveredFolder = useCallback((point: Point) => {
    const element = document.elementFromPoint(point.x, point.y);
    const folder = element?.closest<HTMLElement>('[data-collection-index]');
    const index = folder ? Number(folder.dataset.collectionIndex) : Number.NaN;
    if (Number.isInteger(index)) {
      setHoveredTarget(index);
      setTarget(index);
      return;
    }
    setHoveredTarget(null);
  }, []);

  const finishDrop = useCallback(
    (collectionIndex: number, point?: Point | null) => {
      if (phase === 'pending') return;

      const folder = document.querySelector<HTMLElement>(
        `[data-collection-index="${collectionIndex}"]`,
      );
      const folderRect = folder?.getBoundingClientRect();
      const currentPoint = point ?? dragPointRef.current;
      if (folderRect && currentPoint) {
        setDropVector({
          x: folderRect.left + folderRect.width / 2 - currentPoint.x,
          y: folderRect.top + folderRect.height * 0.52 - currentPoint.y,
        });
      }

      setTarget(collectionIndex);
      setHoveredTarget(collectionIndex);
      setPhase('pending');
      setDragging(false);

      const timer = window.setTimeout(() => {
        setDragPoint(null);
        setDropVector(null);
        setHoveredTarget(null);
        if (active.id === '4' && !failedRepoIdsRef.current.has(active.id)) {
          failedRepoIdsRef.current.add(active.id);
          setPhase('failure');
          return;
        }
        setPhase('success');
        setLastAction(t('collectionDial.success', { collection: COLLECTIONS[collectionIndex] }));
        setUndoAvailable(true);
      }, 240);
      timersRef.current.push(timer);
    },
    [active.id, phase, t],
  );

  const startPointerSession = useCallback(
    (repo: Repo, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || phase === 'pending') return;
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerSessionRef.current = {
        pointerId: event.pointerId,
        repo,
        origin: { x: event.clientX, y: event.clientY },
        dragging: false,
      };
    },
    [phase],
  );

  const movePointerSession = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = pointerSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const point = { x: event.clientX, y: event.clientY };

      if (!session.dragging) {
        const distance = Math.hypot(point.x - session.origin.x, point.y - session.origin.y);
        if (distance < 7) return;
        session.dragging = true;
        suppressClickRef.current = true;
        setActiveId(session.repo.id);
        setPhase('ready');
        setUndoAvailable(false);
        setDragging(true);
        setDragPoint(point);
      }

      event.preventDefault();
      updateDragOverlay(point);
      resolveHoveredFolder(point);
    },
    [resolveHoveredFolder, updateDragOverlay],
  );

  const finishPointerSession = useCallback(
    (pointerId: number, point: Point) => {
      const session = pointerSessionRef.current;
      if (!session || session.pointerId !== pointerId) return;
      pointerSessionRef.current = null;

      if (session.dragging) {
        const element = document.elementFromPoint(point.x, point.y);
        const folder = element?.closest<HTMLElement>('[data-collection-index]');
        const index = folder ? Number(folder.dataset.collectionIndex) : Number.NaN;
        if (Number.isInteger(index)) {
          finishDrop(index, point);
        } else {
          setDragging(false);
          setDragPoint(null);
          setHoveredTarget(null);
        }
        const timer = window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        timersRef.current.push(timer);
      }
    },
    [finishDrop],
  );

  const endPointerSession = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      finishPointerSession(event.pointerId, { x: event.clientX, y: event.clientY });
    },
    [finishPointerSession],
  );

  useEffect(() => {
    const onPointerUp = (event: PointerEvent) => {
      finishPointerSession(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    window.addEventListener('pointerup', onPointerUp);
    return () => window.removeEventListener('pointerup', onPointerUp);
  }, [finishPointerSession]);

  const cancelPointerSession = useCallback(() => {
    pointerSessionRef.current = null;
    setDragging(false);
    setDragPoint(null);
    setHoveredTarget(null);
    suppressClickRef.current = false;
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const targetElement = event.target as HTMLElement | null;
      const tag = targetElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || targetElement?.isContentEditable) return;

      if (activeId && (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'q')) {
        event.preventDefault();
        rotate(-1);
      }
      if (activeId && (event.key === 'ArrowRight' || event.key.toLowerCase() === 'e')) {
        event.preventDefault();
        rotate(1);
      }
      if (
        event.key === 'Enter' &&
        activeId &&
        phase === 'ready' &&
        targetElement?.closest('.collection-dial-repo')
      ) {
        event.preventDefault();
        finishDrop(target);
      }
      if (event.key === 'Escape') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, finishDrop, phase, reset, rotate, target]);

  const overlayStyle = dragPoint
    ? ({
        '--drag-x': `${dragPoint.x}px`,
        '--drag-y': `${dragPoint.y}px`,
        '--drop-x': `${dropVector?.x ?? 0}px`,
        '--drop-y': `${dropVector?.y ?? 0}px`,
      } as CSSProperties)
    : undefined;
  const visibleWindowStart = getCenteredWindowStart(target, visibleFolderCount);

  return (
    <div
      ref={prototypeRef}
      className="collection-dial-prototype"
      data-dial-visible={activeId ? true : undefined}
      data-visible-folders={visibleFolderCount}
    >
      <header className="collection-dial-prototype__header">
        <div>
          <h1>{t('collectionDial.title')}</h1>
          <p>{t('collectionDial.description')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          {t('collectionDial.reset')}
        </Button>
      </header>

      <section
        className="collection-dial-prototype__browse"
        aria-label={t('collectionDial.browseSurface')}
      >
        <div className="collection-dial-prototype__section-heading">
          <h2>{t('collectionDial.browseSurface')}</h2>
          <span>{t('collectionDial.continuousHint')}</span>
        </div>
        <div className="collection-dial-prototype__repos">
          {REPOS.map((repo) => (
            <RepoButton
              key={repo.id}
              repo={repo}
              active={repo.id === activeId}
              onPick={() => pick(repo)}
              onPointerDown={(event) => startPointerSession(repo, event)}
              onPointerMove={movePointerSession}
              onPointerUp={endPointerSession}
              onPointerCancel={cancelPointerSession}
            />
          ))}
        </div>
      </section>

      {activeId ? (
        <section className="collection-dial-tray" aria-label={t('collectionDial.dialLabel')}>
          <div className="collection-dial-tray__scrim" aria-hidden="true" />
          <div className="collection-dial-tray__shell">
            <div className="collection-dial-tray__context">
              <div className="collection-dial-tray__placement">
                <span className="collection-dial-tray__repo">{active.name}</span>
                <ArrowRightIcon aria-hidden="true" />
                <span className="collection-dial-tray__target">{COLLECTIONS[target]}</span>
                <span className="collection-dial-tray__position">
                  {t('collectionDial.position', {
                    current: target + 1,
                    total: COLLECTIONS.length,
                  })}
                </span>
                <span className="collection-dial-tray__key-hint" aria-hidden="true">
                  <kbd>Q</kbd>
                  <kbd>E</kbd>
                  <span>{t('collectionDial.switchHint')}</span>
                </span>
              </div>
              <p
                id="collection-dial-status"
                className="collection-dial-tray__status"
                data-error={phase === 'failure' || undefined}
                role="status"
                aria-live="polite"
              >
                {phase === 'failure'
                  ? t('collectionDial.failureShort')
                  : phase === 'pending'
                    ? t('collectionDial.pending')
                    : phase === 'success'
                      ? lastAction
                      : t('collectionDial.selectionHint')}
              </p>
              <div className="collection-dial-tray__actions">
                <Button size="sm" variant="ghost" onClick={reset} disabled={phase === 'pending'}>
                  {t('collectionDial.cancel')}
                </Button>
                {phase === 'failure' ? (
                  <Button size="sm" onClick={() => finishDrop(target)}>
                    <RotateCcwIcon className="size-3.5" />
                    {t('collectionDial.retry')}
                  </Button>
                ) : phase !== 'success' ? (
                  <Button
                    size="sm"
                    onClick={() => finishDrop(target)}
                    disabled={phase === 'pending'}
                    aria-describedby="collection-dial-status"
                    aria-keyshortcuts="Enter"
                  >
                    {phase === 'pending'
                      ? t('collectionDial.pending')
                      : t('collectionDial.addToCollection', {
                          collection: COLLECTIONS[target],
                        })}
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="collection-dial-tray__folders">
              {COLLECTIONS.map((collection, index) => {
                const slot = index - visibleWindowStart;
                const visible = slot >= 0 && slot < visibleFolderCount;
                return (
                  <CollectionFolder
                    key={collection}
                    index={index}
                    slot={slot}
                    visibleCount={visibleFolderCount}
                    visible={visible}
                    name={collection}
                    selected={target === index}
                    open={
                      (dragging && hoveredTarget === index) ||
                      (phase === 'pending' && target === index)
                    }
                    pending={phase === 'pending' && target === index}
                    onSelect={() => selectTarget(index)}
                  />
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {dragPoint ? (
        <div
          ref={dragOverlayRef}
          className="collection-drag-object"
          data-committing={phase === 'pending' || undefined}
          style={overlayStyle}
          aria-hidden="true"
        >
          <GripVerticalIcon />
          <span>{active.name}</span>
        </div>
      ) : null}

      {undoAvailable ? (
        <div className="collection-dial-toast" role="status">
          <CheckIcon aria-hidden="true" />
          <span>{lastAction}</span>
          <button
            type="button"
            onClick={() => {
              setUndoAvailable(false);
              setLastAction(t('collectionDial.undone'));
              setPhase('ready');
            }}
          >
            {t('collectionDial.undo')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
