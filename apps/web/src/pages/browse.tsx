import { deriveRepoFacets, hasActiveFilter, rankHybridRepos, type Tag } from '@asterism/core';
import { Button, CollectionDial, cn, GlassControlRow, toast } from '@asterism/ui';
import {
  AlertTriangleIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  LogInIcon,
  RefreshCwIcon,
  SearchXIcon,
  StarIcon,
} from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BrowseRepoList } from '../components/browse-repo-list';
import { BulkExportDialog } from '../components/bulk-export';
import { BulkOperationBanner, BulkOrganizeDialog } from '../components/bulk-organization';
import { BulkSelectionBar } from '../components/bulk-selection-bar';
import { EmptyState } from '../components/empty-state';
import { LoadingRegion } from '../components/loading-region';
import { PageHeader } from '../components/page-header';
import { BrowseToolbarSkeleton } from '../components/page-loading-states';
import { CollectionDialPrototype } from '../components/prototypes/collection-dial-prototype';
import { RepoFilterBar } from '../components/repo-filter-bar';
import { RepoGridSkeleton, RepoListSkeleton } from '../components/repo-skeletons';
import { RepoViewToggle } from '../components/repo-view-toggle';
import { SyncProgressBanner } from '../components/sync-progress-banner';
import { useEmbeddingBootstrapContext } from '../contexts/embedding-bootstrap-context';
import { useRepoInspector } from '../contexts/repo-inspector-context';
import {
  useBulkOperationActions,
  useBulkOperations,
  useHasUnfinishedMultiCollectionDialOperation,
} from '../data/use-bulk-operations';
import { useCollectionRepos } from '../data/use-collection-repos';
import { useCollections } from '../data/use-collections';
import { useNoteRepoIds } from '../data/use-note-repo-ids';
import { useRepoTags } from '../data/use-repo-tags';
import { useFreshRepoEmbeddings } from '../data/use-semantic-neighborhood';
import { SEMANTIC_MATCH_COUNT, useSemanticNeighbors } from '../data/use-semantic-search';
import { useStarredRepos } from '../data/use-starred-repos';
import { useSyncStars } from '../data/use-sync-stars';
import { useTags } from '../data/use-tags';
import { useBrowseView } from '../hooks/use-browse-view';
import { useCollectionDial } from '../hooks/use-collection-dial';
import { useReadmeReturnRestore } from '../hooks/use-readme-return-restore';
import {
  addSelection,
  clearSelection,
  removeSelection,
  toggleSelection,
} from '../lib/bulk-selection';
import { getMultiCollectionDialBlockReason } from '../lib/collection-dial-availability';
import { peekPendingReadmeReturn } from '../lib/readme-return-coordinator';
import { countCollectionsByRepo, toRepoIdSet } from '../lib/repo-card-metadata';
import { toRepoFilter, useBrowseFilters } from '../stores/browse-filters';
import type { RepoViewMode } from '../stores/browse-view';
import { useListScrollStore } from '../stores/list-scroll';
import { useRepoInspectorStore } from '../stores/repo-inspector';

function InitialLoadingState({ view }: { view: RepoViewMode }) {
  return view === 'list' ? <RepoListSkeleton /> : <RepoGridSkeleton />;
}

export function BrowsePage() {
  const [params] = useSearchParams();
  if (import.meta.env.DEV && params.get('prototype') === 'collection-dial') {
    return <CollectionDialPrototype />;
  }
  return <BrowseDataPage />;
}

function BrowseDataPage() {
  const { t, i18n } = useTranslation();
  const { view, transitionTo } = useBrowseView();
  const filters = useBrowseFilters();
  const deferredQuery = useDeferredValue(filters.query);
  const { requestOpen, requestClose, registerContext } = useRepoInspector();
  const selectedRepoId = useRepoInspectorStore((state) => state.record?.repoId);
  const { data, isLoading: reposLoading, isError, refetch, isFetching } = useStarredRepos();
  const records = useMemo(() => data ?? [], [data]);
  const embeddingBootstrap = useEmbeddingBootstrapContext();
  const { data: tags, isLoading: tagsLoading } = useTags();
  const { data: repoTags, isLoading: repoTagsLoading } = useRepoTags();
  const { data: collectionRepos, isLoading: collectionReposLoading } = useCollectionRepos();
  const { data: collections, isLoading: collectionsLoading } = useCollections();
  const { data: bulkOperations } = useBulkOperations();
  const {
    data: hasUnfinishedMultiDialOperation,
    isPending: unfinishedMultiDialPending,
    isError: unfinishedMultiDialError,
  } = useHasUnfinishedMultiCollectionDialOperation();
  const bulkActions = useBulkOperationActions();
  const { data: noteRepoIds, isLoading: notesLoading } = useNoteRepoIds();
  const isLoading =
    reposLoading ||
    tagsLoading ||
    repoTagsLoading ||
    collectionReposLoading ||
    collectionsLoading ||
    notesLoading;
  const sync = useSyncStars();
  const syncPending = sync.requiresReconnect ? sync.reconnectPending : sync.isPending;
  const [repoScrollElement, setRepoScrollElement] = useState<HTMLElement | null>(null);
  const [stuck, setStuck] = useState(false);
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(() => new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkExportOpen, setBulkExportOpen] = useState(false);
  const skipViewScrollResetRef = useRef(peekPendingReadmeReturn()?.sourceKey === 'browse');
  const freshRepoEmbeddings = useFreshRepoEmbeddings(true);
  const activeBulkDialogOperation = bulkOperations?.find(
    (operation) => operation.status !== 'completed' && operation.interaction === 'bulk_dialog',
  );
  const prepareDialPickup = useCallback(() => {
    return requestClose();
  }, [requestClose]);
  const collectionDial = useCollectionDial({
    collections: collections ?? [],
    collectionRepos: collectionRepos ?? [],
    repositoryEmbeddings: freshRepoEmbeddings,
    selectionMode: bulkSelectionMode,
    selectedRepoIds,
    multiPickupBlockReason:
      getMultiCollectionDialBlockReason({
        hasUnfinishedOperation: hasUnfinishedMultiDialOperation,
        isPending: unfinishedMultiDialPending,
        isError: unfinishedMultiDialError,
      }) ?? undefined,
    scopeLabel: (count) => t('collectionDial.selectedScope', { count }),
    preparePickup: prepareDialPickup,
    onUnavailable: (reason) =>
      toast.info(
        reason === 'no_collections'
          ? t('collectionDial.noCollections')
          : reason === 'active_multi_operation'
            ? t('collectionDial.activeMultiOperation')
            : reason === 'operation_state_unavailable'
              ? t('collectionDial.operationStateUnavailable')
              : t('collectionDial.alreadyInAllCollections'),
      ),
    retryableMessage: t('collectionDial.retryableError'),
    terminalMessage: t('collectionDial.terminalError'),
    convergenceMessage: t('collectionDial.convergenceError'),
    successMessage: (addedCount, alreadyMemberCount) =>
      t('collectionDial.successCounts', { addedCount, alreadyMemberCount }),
    failureCountsMessage: ({ addedCount, alreadyMemberCount, retryableCount, terminalCount }) =>
      t('collectionDial.failureCounts', {
        addedCount,
        alreadyMemberCount,
        retryableCount,
        terminalCount,
      }),
  });
  const dialGripController = useMemo(
    () => ({
      activeRepoId:
        collectionDial.state.phase === 'active'
          ? collectionDial.state.pickup.repoIds[0]
          : undefined,
      onPickup: collectionDial.onGripPickup,
      onPointerDown: collectionDial.onGripPointerDown,
    }),
    [collectionDial.onGripPickup, collectionDial.onGripPointerDown, collectionDial.state],
  );
  const dialCopy = useMemo(
    () => ({
      label: t('collectionDial.dialLabel'),
      placement: (repo: string, collection: string) =>
        t('collectionDial.placement', { repo, collection }),
      position: (current: number, positionTotal: number) =>
        t('collectionDial.position', { current, total: positionTotal }),
      selectCollection: (collection: string) =>
        t('collectionDial.selectCollection', { collection }),
      confirm: (collection: string) => t('collectionDial.addToCollection', { collection }),
      cancel: t('collectionDial.cancel'),
      retry: t('collectionDial.retry'),
      done: t('collectionDial.done'),
      readyStatus: t('collectionDial.readyStatus'),
      submittingStatus: t('collectionDial.submittingStatus'),
      successStatus: t('collectionDial.successStatus'),
      keyboardHint: t('collectionDial.keyboardHint'),
      membership: (missingCount: number, alreadyMemberCount: number) =>
        t('collectionDial.membership', { missingCount, alreadyMemberCount }),
    }),
    [t],
  );

  useEffect(() => {
    const el = repoScrollElement;
    if (!el) {
      return;
    }
    const update = () => {
      setStuck(el.scrollTop > 0);
      useListScrollStore.getState().setScrollTop('browse', el.scrollTop);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [repoScrollElement]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset scroll after committed view changes
  useEffect(() => {
    if (!repoScrollElement) {
      return;
    }
    if (skipViewScrollResetRef.current) {
      skipViewScrollResetRef.current = false;
      return;
    }
    repoScrollElement.scrollTop = 0;
  }, [view, repoScrollElement]);

  const facets = useMemo(() => deriveRepoFacets(records), [records]);
  const tagsByRepoId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const link of repoTags ?? []) {
      const list = map.get(link.repoId);
      if (list) {
        list.push(link.tagId);
      } else {
        map.set(link.repoId, [link.tagId]);
      }
    }
    return map;
  }, [repoTags]);

  // 全量新鲜路径不创建 Worker（backend 为 null），但向量已在库中、查询嵌入会按需自准备：
  // 就绪判定看 phase，而非要求本会话存在活的 Worker。
  const semanticEnabled =
    embeddingBootstrap.optedIn &&
    (embeddingBootstrap.phase === 'ready' || embeddingBootstrap.backend !== null);
  const { distanceByRepoId } = useSemanticNeighbors(deferredQuery, { enabled: semanticEnabled });
  const deferredFilter = useMemo(
    () => ({
      query: deferredQuery,
      language: filters.language,
      topic: filters.topic,
      minStars: filters.minStars,
      pushedWithinDays: filters.pushedWithinDays,
      status: filters.status,
      tagIds: filters.tagIds,
    }),
    [
      deferredQuery,
      filters.language,
      filters.minStars,
      filters.pushedWithinDays,
      filters.status,
      filters.tagIds,
      filters.topic,
    ],
  );

  const hybrid = useMemo(
    () =>
      rankHybridRepos({
        items: records,
        filter: deferredFilter,
        sort: filters.sort,
        now: Date.now(),
        tagsByRepoId,
        distanceByRepoId,
        semanticLimit: SEMANTIC_MATCH_COUNT,
      }),
    [records, deferredFilter, filters.sort, tagsByRepoId, distanceByRepoId],
  );
  const visible = useMemo(() => [...hybrid.primary, ...hybrid.semantic], [hybrid]);
  // 语义近邻起始下标：关键词命中之后的第一条；无近邻时为 null（不渲染分隔线）。
  const semanticStartIndex = hybrid.semantic.length > 0 ? hybrid.primary.length : null;
  const visibleRepoIds = useMemo(() => visible.map((record) => record.repoId), [visible]);

  const inspectorContext = useMemo(() => ({ sourceKey: 'browse', records: visible }), [visible]);
  const openInspector = useCallback(
    (record: (typeof visible)[number], modality: 'keyboard' | 'pointer') =>
      requestOpen(record, inspectorContext, modality),
    [inspectorContext, requestOpen],
  );

  useEffect(() => {
    registerContext(inspectorContext);
  }, [inspectorContext, registerContext]);

  useReadmeReturnRestore({
    sourceKey: 'browse',
    records: visible,
    scrollElement: repoScrollElement,
    inspectorContext,
    requestOpen,
    ready: !isLoading,
  });

  const tagsByRepo = useMemo(() => {
    const byId = new Map((tags ?? []).map((tag) => [tag.id, tag as Tag]));
    const map = new Map<string, Tag[]>();
    for (const link of repoTags ?? []) {
      const tag = byId.get(link.tagId);
      if (!tag) {
        continue;
      }
      const list = map.get(link.repoId);
      if (list) {
        list.push(tag);
      } else {
        map.set(link.repoId, [tag]);
      }
    }
    return map;
  }, [tags, repoTags]);
  const collectionCountByRepo = useMemo(
    () => countCollectionsByRepo(collectionRepos ?? []),
    [collectionRepos],
  );
  const noteRepoIdSet = useMemo(() => toRepoIdSet(noteRepoIds ?? []), [noteRepoIds]);
  const total = new Intl.NumberFormat(i18n.language).format(visible.length);
  const hasRepos = records.length > 0;
  const activeFilter = hasActiveFilter(toRepoFilter(filters));
  const selectedVisibleCount = useMemo(() => {
    let count = 0;
    for (const repoId of visibleRepoIds) {
      if (selectedRepoIds.has(repoId)) count += 1;
    }
    return count;
  }, [selectedRepoIds, visibleRepoIds]);
  const hiddenSelectedCount = selectedRepoIds.size - selectedVisibleCount;
  const selectedCount = new Intl.NumberFormat(i18n.language).format(selectedRepoIds.size);
  const hiddenSelectedCountLabel = new Intl.NumberFormat(i18n.language).format(hiddenSelectedCount);
  const allVisibleSelected =
    visibleRepoIds.length > 0 && selectedVisibleCount === visibleRepoIds.length;
  const scopeActionKey = allVisibleSelected
    ? activeFilter
      ? 'bulk.deselectAllFiltered'
      : 'bulk.deselectAll'
    : selectedRepoIds.size > 0
      ? activeFilter
        ? 'bulk.addAllFiltered'
        : 'bulk.addAll'
      : activeFilter
        ? 'bulk.selectAllFiltered'
        : 'bulk.selectAll';
  const selectionController = bulkSelectionMode
    ? {
        repoIds: selectedRepoIds,
        onToggle: (repoId: string) =>
          setSelectedRepoIds((current) => toggleSelection(current, repoId)),
      }
    : undefined;
  const bulkOperationContent = activeBulkDialogOperation ? (
    <BulkOperationBanner
      operation={activeBulkDialogOperation}
      resuming={bulkActions.resume.isPending}
      retrying={bulkActions.retry.isPending}
      completing={bulkActions.complete.isPending}
      onResume={() => bulkActions.resume.mutate(activeBulkDialogOperation)}
      onRetry={() => bulkActions.retry.mutate(activeBulkDialogOperation)}
      onComplete={() => bulkActions.complete.mutate(activeBulkDialogOperation)}
    />
  ) : null;
  const repoContent = isError ? (
    <EmptyState
      icon={AlertTriangleIcon}
      title={t('browse.errorTitle')}
      description={t('browse.errorDescription')}
      action={
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCwIcon className="size-4" />
          {t('browse.retry')}
        </Button>
      }
    />
  ) : !hasRepos ? (
    <EmptyState
      icon={StarIcon}
      title={t('browse.emptyTitle')}
      description={t('browse.emptyDescription')}
      action={
        <Button className="h-10" onClick={sync.sync} disabled={syncPending}>
          {sync.requiresReconnect ? (
            sync.reconnectPending ? (
              <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <LogInIcon className="size-4" />
            )
          ) : (
            <RefreshCwIcon
              className={
                sync.isPending ? 'size-4 animate-spin motion-reduce:animate-none' : 'size-4'
              }
            />
          )}
          {sync.requiresReconnect
            ? sync.reconnectPending
              ? t('sync.reconnecting')
              : t('sync.reconnectAction')
            : t('browse.syncAction')}
        </Button>
      }
    />
  ) : visible.length === 0 ? (
    <EmptyState
      icon={SearchXIcon}
      title={t('browse.noResultsTitle')}
      description={t('browse.noResultsDescription')}
      action={
        <Button variant="outline" onClick={filters.reset}>
          {t('filters.clear')}
        </Button>
      }
    />
  ) : (
    <BrowseRepoList
      view={view}
      records={visible}
      semanticStartIndex={semanticStartIndex}
      tagsByRepo={tagsByRepo}
      collectionCountByRepo={collectionCountByRepo}
      noteRepoIds={noteRepoIdSet}
      selectedRepoId={selectedRepoId}
      onSelect={openInspector}
      scrollElement={repoScrollElement}
      bulkSelection={selectionController}
      collectionDial={dialGripController}
    />
  );

  if (isLoading) {
    return (
      <LoadingRegion
        label={t('loading.repositories')}
        className="-m-6 flex min-h-0 flex-1 flex-col gap-5"
      >
        <div className="shrink-0 px-6 pt-6">
          <div className="mx-auto w-full max-w-6xl">
            <BrowseToolbarSkeleton />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-6 pb-6">
          <div className="mx-auto w-full max-w-6xl">
            <InitialLoadingState view={view} />
          </div>
        </div>
      </LoadingRegion>
    );
  }

  if (hasRepos) {
    return (
      <div className="-m-6 flex min-h-0 flex-1 flex-col gap-5">
        <div className="shrink-0 px-6 pt-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
            <GlassControlRow stuck={stuck} className="flex-col items-stretch gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <PageHeader
                  size="section"
                  title={t('browse.title')}
                  description={!isError ? t('browse.count', { total }) : undefined}
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                  <RepoViewToggle committedView={view} onSelect={transitionTo} />
                </div>
              </div>
              <RepoFilterBar facets={facets} tags={tags ?? []}>
                {!bulkSelectionMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-caption shadow-none"
                    disabled={Boolean(activeBulkDialogOperation)}
                    onClick={() => {
                      requestClose();
                      setBulkSelectionMode(true);
                    }}
                  >
                    <ListChecksIcon className="size-4" aria-hidden="true" />
                    {t('bulk.select')}
                  </Button>
                ) : null}
              </RepoFilterBar>
            </GlassControlRow>
            {sync.isPending ? <SyncProgressBanner label={t('sync.progress')} /> : null}
            {bulkOperationContent}
          </div>
        </div>

        <div
          ref={setRepoScrollElement}
          data-browse-scroll-container
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-6 pb-6',
            bulkSelectionMode && 'pb-44 sm:pb-24',
          )}
        >
          <div className="mx-auto w-full max-w-6xl">{repoContent}</div>
        </div>
        {bulkSelectionMode ? (
          <BulkSelectionBar
            selectedCount={selectedCount}
            hiddenSelectedCount={hiddenSelectedCount > 0 ? hiddenSelectedCountLabel : undefined}
            scopeActionKey={scopeActionKey}
            scopeCount={total}
            scopeActionDisabled={visibleRepoIds.length === 0}
            hasSelection={selectedRepoIds.size > 0}
            hasActiveBulkOperation={Boolean(activeBulkDialogOperation)}
            onScopeAction={() =>
              setSelectedRepoIds((current) => {
                const includesAllVisible = visibleRepoIds.every((repoId) => current.has(repoId));
                return includesAllVisible
                  ? removeSelection(current, visibleRepoIds)
                  : addSelection(current, visibleRepoIds);
              })
            }
            onOrganize={() => setBulkDialogOpen(true)}
            onExport={() => setBulkExportOpen(true)}
            onClear={() => setSelectedRepoIds(clearSelection())}
            onDone={() => {
              setBulkSelectionMode(false);
              setSelectedRepoIds(clearSelection());
            }}
          />
        ) : null}
        <BulkOrganizeDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          repoCount={selectedRepoIds.size}
          tags={tags ?? []}
          collections={collections ?? []}
          pending={bulkActions.create.isPending}
          error={bulkActions.create.isError}
          onConfirm={(changes) =>
            bulkActions.create.mutate(
              { repoIds: [...selectedRepoIds], changes },
              {
                onSuccess: (operation) => {
                  setBulkDialogOpen(false);
                  setBulkSelectionMode(false);
                  setSelectedRepoIds(clearSelection());
                  if (operation.status !== 'completed') bulkActions.resume.mutate(operation);
                },
              },
            )
          }
        />
        <BulkExportDialog
          open={bulkExportOpen}
          onOpenChange={setBulkExportOpen}
          selectedRepoIds={selectedRepoIds}
          starredRepos={records}
          tags={tags ?? []}
          collections={collections ?? []}
          repoTags={repoTags ?? []}
          collectionRepos={collectionRepos ?? []}
        />
        {collectionDial.state.phase === 'active' ? (
          <CollectionDial
            repoLabel={collectionDial.state.pickup.repoLabel}
            targets={collectionDial.state.pickup.targets}
            activeIndex={collectionDial.state.activeIndex}
            status={collectionDial.state.status}
            message={collectionDial.state.message}
            dropTargetId={collectionDial.dropTargetId}
            dragPoint={collectionDial.dragPoint}
            focusOnOpen={collectionDial.focusOnOpen}
            copy={dialCopy}
            onSelect={collectionDial.select}
            onStep={collectionDial.step}
            onConfirm={collectionDial.confirm}
            onRetry={collectionDial.retry}
            onCancel={collectionDial.cancel}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div data-browse-scroll-container className="-m-6 min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <PageHeader
          size="section"
          title={t('browse.title')}
          description={!isError ? t('browse.count', { total }) : undefined}
        />

        {sync.isPending ? <SyncProgressBanner label={t('sync.progress')} /> : null}

        {bulkOperationContent}

        {repoContent}
      </div>
    </div>
  );
}
