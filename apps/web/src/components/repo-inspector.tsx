import { repoFullName } from '@asterism/core';
import type { StarredRepoRecord } from '@asterism/db';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTitle,
  Skeleton,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@asterism/ui';
import {
  ArchiveIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GitForkIcon,
  PlusIcon,
  StarIcon,
  XIcon,
} from 'lucide-react';
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useRepoInspector } from '../contexts/repo-inspector-context';
import { useCollectionRepos, useToggleCollectionRepo } from '../data/use-collection-repos';
import { useCollections } from '../data/use-collections';
import { useNote } from '../data/use-note';
import { useRepoTags, useToggleRepoTag } from '../data/use-repo-tags';
import { useCreateTag, useTags } from '../data/use-tags';
import { useMediaQuery } from '../hooks/use-media-query';
import { formatCompactNumber, formatCompactRelativeTime, formatRelativeTime } from '../lib/format';
import { languageColor } from '../lib/language-colors';
import { createBrowseSourceSnapshot, createReadmeDestination } from '../lib/readme-navigation';
import { rememberReadmeEntry } from '../lib/readme-return-coordinator';
import { useBrowseFilters } from '../stores/browse-filters';
import { getBrowseView } from '../stores/browse-view';
import { useListScrollStore } from '../stores/list-scroll';
import { adjacentRepo, findRepoIndex, useRepoInspectorStore } from '../stores/repo-inspector';
import { PendingActionContent } from './pending-action-content';
import { TagBadge } from './tag-badge';
import { TagFormDialog } from './tag-form-dialog';

function ControlButton({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}

const TRIGGER_ATTRIBUTE = 'data-repo-quick-look-trigger';
const FLOATING_MARGIN = 12;

type FloatingPosition = { left: number; top: number };

type DragState = {
  active: boolean;
  pointerId: number;
  surface: HTMLDivElement;
  pointerX: number;
  pointerY: number;
  originLeft: number;
  originTop: number;
  next: FloatingPosition;
};

function clampFloatingPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): FloatingPosition {
  return {
    left: Math.min(
      Math.max(left, FLOATING_MARGIN),
      Math.max(FLOATING_MARGIN, window.innerWidth - width - FLOATING_MARGIN),
    ),
    top: Math.min(
      Math.max(top, FLOATING_MARGIN),
      Math.max(FLOATING_MARGIN, window.innerHeight - height - FLOATING_MARGIN),
    ),
  };
}

function setFloatingPosition(frame: HTMLDivElement, position: FloatingPosition) {
  Object.assign(frame.style, {
    bottom: 'auto',
    left: `${position.left}px`,
    right: 'auto',
    top: `${position.top}px`,
    transform: 'none',
  });
}

function visibleTrigger(repoId: string): HTMLElement | null {
  const selector = `[${TRIGGER_ATTRIBUTE}="${CSS.escape(repoId)}"]`;
  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return element;
    }
  }
  return null;
}

function sourceTransform(source: HTMLElement | null, target: HTMLElement): string {
  if (!source) {
    return 'none';
  }
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const x = sourceRect.left + sourceRect.width / 2 - (targetRect.left + targetRect.width / 2);
  const y = sourceRect.top + sourceRect.height / 2 - (targetRect.top + targetRect.height / 2);
  return `translate3d(${x}px, ${y}px, 0) scale(0.96)`;
}

export function RepoInspector() {
  const { t } = useTranslation();
  const floating = useMediaQuery('(min-width: 768px)');
  const record = useRepoInspectorStore((state) => state.record);
  const context = useRepoInspectorStore((state) => state.context);
  const {
    requestNavigate,
    requestClose,
    requestRoute,
    dirty,
    confirmOpen,
    openModality,
    closeSignal,
  } = useRepoInspector();
  const index = findRepoIndex(context, record?.repoId);
  const previous = adjacentRepo(context, record?.repoId, -1);
  const next = adjacentRepo(context, record?.repoId, 1);
  const readReadme = useCallback(() => {
    if (!record) return;
    const sourcePath = context?.sourceKey.startsWith('collection:')
      ? `/collections/${context.sourceKey.slice('collection:'.length)}`
      : '/';
    const scrollTop = useListScrollStore.getState().getScrollTop(context?.sourceKey ?? 'browse');
    const filters = useBrowseFilters.getState();
    const destination = createReadmeDestination(
      record.repo.owner,
      record.repo.name,
      record.repoId,
      sourcePath,
      context?.sourceKey.startsWith('collection:')
        ? { collectionName: context.sourceName, scrollTop }
        : {
            browseSnapshot: createBrowseSourceSnapshot(
              {
                query: filters.query,
                language: filters.language,
                topic: filters.topic,
                tagIds: filters.tagIds,
                minStars: filters.minStars,
                pushedWithinDays: filters.pushedWithinDays,
                status: filters.status,
                sort: filters.sort,
              },
              getBrowseView(),
              scrollTop,
            ),
          },
    );
    rememberReadmeEntry(destination.state.readme);
    requestRoute(destination.to, destination.state);
  }, [context?.sourceKey, context?.sourceName, record, requestRoute]);

  useEffect(() => {
    if (!record || floating) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as Element | null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"], [role="menu"]') ||
        target?.closest('[role="dialog"]:not(#repo-inspector)')
      ) {
        return;
      }
      if (event.key.toLowerCase() === 'j' && next) {
        event.preventDefault();
        requestNavigate(1);
      } else if (event.key.toLowerCase() === 'k' && previous) {
        event.preventDefault();
        requestNavigate(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [floating, next, previous, record, requestNavigate]);

  const handledMobileCloseSignal = useRef(closeSignal);
  useEffect(() => {
    if (floating || !record || handledMobileCloseSignal.current === closeSignal) return;
    handledMobileCloseSignal.current = closeSignal;
    requestClose();
  }, [closeSignal, floating, record, requestClose]);

  if (floating) {
    return record
      ? createPortal(
          <FloatingQuickLook
            record={record}
            index={index}
            total={context?.records.length ?? 0}
            hasPrevious={Boolean(previous)}
            hasNext={Boolean(next)}
            dirty={dirty}
            confirmOpen={confirmOpen}
            openModality={openModality}
            closeSignal={closeSignal}
            onPrevious={() => requestNavigate(-1)}
            onNext={() => requestNavigate(1)}
            onReadReadme={readReadme}
            onClose={requestClose}
          />,
          document.body,
        )
      : null;
  }

  return (
    <Sheet
      open={Boolean(record)}
      onOpenChange={(open) => {
        if (!open) {
          requestClose();
        }
      }}
    >
      <SheetContent
        id="repo-inspector"
        side="bottom"
        className="@container/inspector h-[min(90svh,52rem)] gap-0 overflow-hidden rounded-t-lg border-x border-t p-0 [&>button.absolute]:hidden"
      >
        <SheetTitle className="sr-only">{t('drawer.title')}</SheetTitle>
        {record ? (
          <InspectorBody
            record={record}
            mobile
            index={index}
            total={context?.records.length ?? 0}
            hasPrevious={Boolean(previous)}
            hasNext={Boolean(next)}
            onPrevious={() => requestNavigate(-1)}
            onNext={() => requestNavigate(1)}
            onReadReadme={readReadme}
            onClose={requestClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function FloatingQuickLook({
  record,
  index,
  total,
  hasPrevious,
  hasNext,
  dirty,
  confirmOpen,
  openModality,
  closeSignal,
  onPrevious,
  onNext,
  onReadReadme,
  onClose,
}: {
  record: StarredRepoRecord;
  index: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  dirty: boolean;
  confirmOpen: boolean;
  openModality: 'keyboard' | 'pointer';
  closeSignal: number;
  onPrevious: () => void;
  onNext: () => void;
  onReadReadme: () => void;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);
  const positionRef = useRef<FloatingPosition | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressDragClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const currentRepoId = useRef(record.repoId);
  const handledCloseSignal = useRef(closeSignal);
  currentRepoId.current = record.repoId;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const source = visibleTrigger(currentRepoId.current);
    returnFocusRef.current = source;
    if (!reducedMotion) {
      panel.animate(
        [
          { opacity: 0, transform: sourceTransform(source, panel) },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 220, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
      );
    }
    if (openModality === 'keyboard') {
      panel.focus({ preventScroll: true });
    }
  }, [openModality, reducedMotion]);

  const close = useCallback(async () => {
    if (closingRef.current || confirmOpen) return;
    if (dirty) {
      onClose();
      return;
    }
    closingRef.current = true;
    const panel = panelRef.current;
    const source = visibleTrigger(currentRepoId.current) ?? returnFocusRef.current;
    if (panel && !reducedMotion) {
      const animation = panel.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: sourceTransform(source, panel) },
        ],
        { duration: 220, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
      );
      await animation.finished.catch(() => undefined);
    }
    onClose();
    queueMicrotask(() => source?.focus({ preventScroll: true }));
  }, [confirmOpen, dirty, onClose, reducedMotion]);

  useEffect(() => {
    if (handledCloseSignal.current === closeSignal) return;
    handledCloseSignal.current = closeSignal;
    void close();
  }, [close, closeSignal]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest<HTMLAnchorElement>('a[href]');
      const followsInternalRoute =
        link && link.origin === window.location.origin && link.target !== '_blank';
      if (
        confirmOpen ||
        panelRef.current?.contains(target) ||
        target?.closest(`[${TRIGGER_ATTRIBUTE}]`) ||
        followsInternalRoute
      ) {
        return;
      }
      void close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as Element | null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"], [role="menu"]') ||
        target?.closest('[role="dialog"]:not(#repo-inspector)')
      ) {
        return;
      }
      if (event.key.toLowerCase() === 'j' && hasNext) {
        event.preventDefault();
        onNext();
      } else if (event.key.toLowerCase() === 'k' && hasPrevious) {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        void close();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, confirmOpen, hasNext, hasPrevious, onNext, onPrevious]);

  const beginDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest('[data-window-control]')) return;
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const origin = { left: rect.left, top: rect.top };
    setFloatingPosition(frame, origin);
    positionRef.current = origin;
    dragRef.current = {
      active: false,
      pointerId: event.pointerId,
      surface: event.currentTarget,
      pointerX: event.clientX,
      pointerY: event.clientY,
      originLeft: origin.left,
      originTop: origin.top,
      next: origin,
    };
  }, []);

  const moveDrag = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (!drag.active && Math.hypot(deltaX, deltaY) < 4) return;
    if (!drag.active) {
      drag.active = true;
      drag.surface.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    event.preventDefault();
    const rect = frame.getBoundingClientRect();
    const next = clampFloatingPosition(
      drag.originLeft + deltaX,
      drag.originTop + deltaY,
      rect.width,
      rect.height,
    );
    drag.next = next;
    frame.style.transform = `translate3d(${next.left - drag.originLeft}px, ${next.top - drag.originTop}px, 0)`;
  }, []);

  const endDrag = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame || drag.pointerId !== event.pointerId) return;
    setFloatingPosition(frame, drag.next);
    positionRef.current = drag.next;
    suppressDragClickRef.current = drag.active && event.type === 'pointerup';
    dragRef.current = null;
    if (drag.surface.hasPointerCapture(event.pointerId)) {
      drag.surface.releasePointerCapture(event.pointerId);
    }
    if (drag.active) setDragging(false);
  }, []);

  const suppressClickAfterDrag = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressDragClickRef.current) return;
    suppressDragClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', moveDrag, { passive: false });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', moveDrag);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [endDrag, moveDrag]);

  useEffect(() => {
    const keepInViewport = () => {
      const frame = frameRef.current;
      const position = positionRef.current;
      if (!frame || !position) return;
      const rect = frame.getBoundingClientRect();
      const next = clampFloatingPosition(position.left, position.top, rect.width, rect.height);
      setFloatingPosition(frame, next);
      positionRef.current = next;
    };
    window.addEventListener('resize', keepInViewport);
    return () => window.removeEventListener('resize', keepInViewport);
  }, []);

  return (
    <div
      ref={frameRef}
      className="pointer-events-none fixed right-6 bottom-6 left-auto z-50 w-[min(30rem,calc(100vw-2rem))] translate-x-0"
    >
      <div
        ref={panelRef}
        id="repo-inspector"
        role="dialog"
        aria-modal="false"
        aria-labelledby="repo-quick-look-title"
        tabIndex={-1}
        className="asterism-glass-overlay @container/inspector pointer-events-auto overflow-hidden rounded-xl border text-popover-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <InspectorBody
          record={record}
          index={index}
          total={total}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={onPrevious}
          onNext={onNext}
          onReadReadme={onReadReadme}
          onClose={() => void close()}
          dragSurface={{
            dragging,
            onClickCapture: suppressClickAfterDrag,
            onPointerDown: beginDrag,
          }}
        />
      </div>
    </div>
  );
}

function InspectorBody({
  record,
  mobile = false,
  index,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onReadReadme,
  onClose,
  dragSurface,
}: {
  record: StarredRepoRecord;
  mobile?: boolean;
  index: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onReadReadme: () => void;
  onClose: () => void;
  dragSurface?: {
    dragging: boolean;
    onClickCapture: React.ComponentProps<'div'>['onClickCapture'];
    onPointerDown: React.ComponentProps<'div'>['onPointerDown'];
  };
}) {
  const { t } = useTranslation();
  const { repo } = record;
  const position = index >= 0 ? t('drawer.position', { current: index + 1, total }) : null;

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col text-card-foreground',
        mobile ? 'h-full bg-card' : 'max-h-[min(46rem,calc(100svh-3rem))] bg-transparent',
      )}
    >
      {mobile ? (
        <div className="flex h-5 shrink-0 items-center justify-center" aria-hidden="true">
          <span className="h-1 w-8 rounded-full bg-muted-foreground/35" />
        </div>
      ) : null}
      <header className="asterism-glass-surface z-10 shrink-0 border-b px-6 py-4">
        <div
          className={cn(
            'flex min-w-0 touch-none cursor-grab items-center gap-3 active:cursor-grabbing',
            dragSurface?.dragging && 'cursor-grabbing [&_*]:cursor-grabbing',
          )}
          onClickCapture={dragSurface?.onClickCapture}
          onPointerDown={dragSurface?.onPointerDown}
        >
          <div className="min-w-0 flex-1">
            <h2
              id="repo-quick-look-title"
              className="flex min-h-8 min-w-0 items-center text-repo-name"
            >
              <a
                href={`https://github.com/${repoFullName(repo)}`}
                target="_blank"
                rel="noreferrer noopener"
                draggable={false}
                aria-label={t('browse.openOnGitHub', { repo: repoFullName(repo) })}
                className="group/link min-w-0 cursor-[inherit] truncate rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-medium text-muted-foreground">{repo.owner}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-link group-hover/link:underline">{repo.name}</span>
              </a>
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ControlButton
              data-window-control
              label={t('common.cancel')}
              className="cursor-pointer"
              onClick={onClose}
            >
              <XIcon className="size-4" />
            </ControlButton>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate font-mono text-micro text-muted-foreground tabular-nums">
            {position ?? t('drawer.outsideSequence')}
          </span>
          <div className="flex items-center gap-1">
            <ControlButton
              label={t('drawer.previous')}
              disabled={!hasPrevious}
              onClick={onPrevious}
            >
              <ChevronLeftIcon className="size-4" />
            </ControlButton>
            <ControlButton label={t('drawer.next')} disabled={!hasNext} onClick={onNext}>
              <ChevronRightIcon className="size-4" />
            </ControlButton>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div
          key={record.repoId}
          className="animate-in fade-in-0 duration-[120ms] motion-reduce:animate-none"
        >
          <Overview record={record} onReadReadme={onReadReadme} />
          <div className="mt-6 flex flex-col gap-5">
            <TagsSection repoId={record.repoId} />
            <CollectionsSection repoId={record.repoId} />
            <NotesSection repoId={record.repoId} />
          </div>
        </div>
      </div>
      <UnsavedNoteDialog />
    </div>
  );
}

function Overview({
  record,
  onReadReadme,
}: {
  record: StarredRepoRecord;
  onReadReadme: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { repo } = record;
  const dotColor = languageColor(repo.language);
  const updated = formatRelativeTime(repo.pushedAt, i18n.language);
  const compactUpdated = formatCompactRelativeTime(repo.pushedAt, i18n.language);
  return (
    <section className="border-b pb-5">
      {repo.description ? (
        <p className="max-w-[70ch] text-body text-foreground/85 text-pretty">{repo.description}</p>
      ) : null}
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-1.5 text-micro text-muted-foreground',
          repo.description && 'mt-4',
        )}
      >
        {repo.language ? (
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full', !dotColor && 'bg-muted-foreground')}
              style={dotColor ? { backgroundColor: dotColor } : undefined}
            />
            {repo.language}
          </span>
        ) : null}
        <span className="flex items-center gap-1">
          <StarIcon className="size-3" aria-hidden="true" />
          <span className="font-mono tabular-nums">
            {formatCompactNumber(repo.stargazers, i18n.language)}
          </span>
          {t('drawer.starLabel')}
        </span>
        {repo.forks != null ? (
          <span className="flex items-center gap-1">
            <GitForkIcon className="size-3" aria-hidden="true" />
            <span className="font-mono tabular-nums">
              {formatCompactNumber(repo.forks, i18n.language)}
            </span>
            {t('drawer.forkLabel')}
          </span>
        ) : null}
        {updated && compactUpdated ? (
          <span title={t('browse.updated', { time: updated })}>
            <span aria-hidden="true">
              {t('browse.updatedShort')}{' '}
              <span className="font-mono tabular-nums">{compactUpdated}</span>
            </span>
            <span className="sr-only">{t('browse.updated', { time: updated })}</span>
          </span>
        ) : null}
        {repo.archived ? (
          <span className="flex items-center gap-1">
            <ArchiveIcon className="size-3" aria-hidden="true" />
            {t('browse.archived')}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onReadReadme}
        className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-body font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent/80"
      >
        <BookOpenIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1">{t('drawer.readReadme')}</span>
        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
      </button>
    </section>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="font-semibold text-caption text-foreground">{children}</h3>;
}

function TagsSection({ repoId }: { repoId: string }) {
  const { t } = useTranslation();
  const { data: tags = [] } = useTags();
  const { data: links = [] } = useRepoTags();
  const toggle = useToggleRepoTag();
  const createTag = useCreateTag();
  const [createOpen, setCreateOpen] = useState(false);
  const assignedIds = useMemo(
    () => new Set(links.filter((link) => link.repoId === repoId).map((link) => link.tagId)),
    [links, repoId],
  );
  const assignedTags = tags.filter((tag) => assignedIds.has(tag.id));

  const handleCreate = async (values: { name: string; color: string }) => {
    const created = await createTag.mutateAsync({
      name: values.name,
      color: values.color,
      seed: tags.length,
    });
    await toggle.mutateAsync({ repoId, tagId: created.id, assigned: false });
    setCreateOpen(false);
  };

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{t('drawer.tags')}</SectionLabel>
      <div className="flex flex-wrap items-center gap-2">
        {assignedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            removeLabel={t('drawer.removeTag', { name: tag.name })}
            onRemove={() => toggle.mutate({ repoId, tagId: tag.id, assigned: true })}
          />
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 gap-1 rounded-sm px-2 text-caption">
              <PlusIcon className="size-3" />
              {t('drawer.addTag')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-auto">
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={assignedIds.has(tag.id)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() =>
                  toggle.mutate({ repoId, tagId: tag.id, assigned: assignedIds.has(tag.id) })
                }
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: tag.color ?? 'var(--muted-foreground)' }}
                />
                {tag.name}
              </DropdownMenuCheckboxItem>
            ))}
            {tags.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              {t('drawer.createTag')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TagFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('tags.createTitle')}
        submitLabel={t('tags.create')}
        existingNames={tags.map((tag) => tag.name)}
        pending={createTag.isPending}
        onSubmit={handleCreate}
      />
    </section>
  );
}

function CollectionsSection({ repoId }: { repoId: string }) {
  const { t } = useTranslation();
  const { data: collections = [] } = useCollections();
  const { data: links = [] } = useCollectionRepos();
  const toggle = useToggleCollectionRepo();
  const [editing, setEditing] = useState(false);
  const memberIds = useMemo(
    () => new Set(links.filter((link) => link.repoId === repoId).map((link) => link.collectionId)),
    [links, repoId],
  );
  const selected = collections.filter((collection) => memberIds.has(collection.id));
  const visible = editing ? collections : selected;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{t('drawer.collections')}</SectionLabel>
        {collections.length > 0 ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-caption text-link"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? t('common.done') : t('common.edit')}
          </Button>
        ) : null}
      </div>
      {collections.length === 0 ? (
        <p className="text-body text-muted-foreground">{t('drawer.noCollections')}</p>
      ) : visible.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setEditing(true)}
        >
          <PlusIcon className="size-3.5" />
          {t('drawer.addCollection')}
        </Button>
      ) : (
        <div className="flex flex-col gap-1">
          {visible.map((collection) => {
            const member = memberIds.has(collection.id);
            return (
              <Button
                key={collection.id}
                type="button"
                variant="ghost"
                disabled={!editing}
                onClick={() => toggle.mutate({ collectionId: collection.id, repoId, member })}
                className={cn(
                  'h-8 w-full justify-between rounded-sm px-2 text-left text-body',
                  member
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="truncate">{collection.name}</span>
                {member ? <CheckIcon className="size-4 shrink-0 text-link" /> : null}
              </Button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NotesSection({ repoId }: { repoId: string }) {
  const { t } = useTranslation();
  const { data: serverBody, isLoading } = useNote(repoId);
  const {
    noteDraft,
    syncNote,
    setNoteBody,
    setNoteEditing,
    saveNote,
    discardNote,
    confirmPending,
  } = useRepoInspector();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (serverBody !== undefined) {
      syncNote(repoId, serverBody);
    }
  }, [repoId, serverBody, syncNote]);

  if (isLoading || !noteDraft || noteDraft.repoId !== repoId) {
    return <Skeleton className="h-24 w-full" />;
  }
  const dirty = noteDraft.body !== noteDraft.serverBody;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{t('drawer.notes')}</SectionLabel>
        {!noteDraft.editing && noteDraft.serverBody ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-caption text-link"
            onClick={() => setNoteEditing(true)}
          >
            {t('common.edit')}
          </Button>
        ) : null}
      </div>
      {noteDraft.editing || !noteDraft.serverBody ? (
        <>
          <Textarea
            value={noteDraft.body}
            onChange={(event) => {
              setError(false);
              setNoteBody(event.target.value);
            }}
            placeholder={t('drawer.notesPlaceholder')}
            rows={4}
            disabled={confirmPending}
            className="min-h-24 rounded-md text-body"
          />
          {error ? (
            <p role="alert" className="text-caption text-destructive">
              {t('drawer.noteSaveError')}
            </p>
          ) : null}
          {dirty ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={confirmPending}
                onClick={() => {
                  discardNote();
                  setNoteEditing(false);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={confirmPending}
                aria-busy={confirmPending}
                onClick={async () => {
                  try {
                    await saveNote();
                  } catch {
                    setError(true);
                  }
                }}
              >
                <PendingActionContent
                  pending={confirmPending}
                  idleLabel={t('drawer.saveNote')}
                  pendingLabel={t('common.saving')}
                />
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setNoteEditing(true)}
          className="w-full rounded-md bg-background p-3 text-left text-body text-muted-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {noteDraft.serverBody}
        </button>
      )}
    </section>
  );
}

function UnsavedNoteDialog() {
  const { t } = useTranslation();
  const {
    confirmOpen,
    confirmPending,
    confirmError,
    saveAndContinue,
    discardAndContinue,
    continueEditing,
  } = useRepoInspector();
  return (
    <Dialog
      open={confirmOpen}
      onOpenChange={(open) => {
        if (!open && !confirmPending) continueEditing();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-5 p-5 sm:max-w-[28rem]"
        onEscapeKeyDown={(event) => {
          if (confirmPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (confirmPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('drawer.unsavedTitle')}</DialogTitle>
          <DialogDescription>{t('drawer.unsavedDescription')}</DialogDescription>
          {confirmError ? (
            <p role="alert" className="text-caption text-destructive">
              {t('drawer.noteSaveError')}
            </p>
          ) : null}
        </DialogHeader>
        <DialogFooter className="flex-col sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            disabled={confirmPending}
            onClick={continueEditing}
          >
            {t('drawer.continueEditing')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={confirmPending}
            onClick={discardAndContinue}
          >
            {t('drawer.discardAndContinue')}
          </Button>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            disabled={confirmPending}
            aria-busy={confirmPending}
            onClick={saveAndContinue}
          >
            <PendingActionContent
              pending={confirmPending}
              idleLabel={t('drawer.saveAndContinue')}
              pendingLabel={t('common.saving')}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
