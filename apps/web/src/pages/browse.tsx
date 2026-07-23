import {
  deriveRepoFacets,
  filterStarredRepos,
  hasActiveFilter,
  sortStarredRepos,
  type Tag,
} from '@asterism/core';
import { Button, GlassControlRow } from '@asterism/ui';
import {
  AlertTriangleIcon,
  LoaderCircleIcon,
  LogInIcon,
  RefreshCwIcon,
  SearchXIcon,
  StarIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiOrganizationDraftBanner, AiOrganizationPreflight } from '../components/ai-organization';
import { BrowseRepoList } from '../components/browse-repo-list';
import { BulkExportDialog } from '../components/bulk-export';
import { BulkOperationBanner, BulkOrganizeDialog } from '../components/bulk-organization';
import { EmptyState } from '../components/empty-state';
import { LoadingRegion } from '../components/loading-region';
import { PageHeader } from '../components/page-header';
import { BrowseToolbarSkeleton } from '../components/page-loading-states';
import { RepoFilterBar } from '../components/repo-filter-bar';
import { RepoGridSkeleton, RepoListSkeleton } from '../components/repo-skeletons';
import { RepoViewToggle } from '../components/repo-view-toggle';
import { SyncProgressBanner } from '../components/sync-progress-banner';
import { useRepoInspector } from '../contexts/repo-inspector-context';
import { useAiConnections, useAiSettings } from '../data/use-ai-connections';
import {
  useAiOrganizationDraft,
  useConfirmAiOrganizationDraft,
  useDiscardAiOrganizationDraft,
  useGenerateAiOrganizationDraft,
  useUpdateAiOrganizationDraftReview,
} from '../data/use-ai-organization';
import { useBulkOperationActions, useBulkOperations } from '../data/use-bulk-operations';
import { useCollectionRepos } from '../data/use-collection-repos';
import { useCollections } from '../data/use-collections';
import { useNoteRepoIds } from '../data/use-note-repo-ids';
import { useRepoTags } from '../data/use-repo-tags';
import { useStarredRepos } from '../data/use-starred-repos';
import { useSyncStars } from '../data/use-sync-stars';
import { useTags } from '../data/use-tags';
import { useBrowseView } from '../hooks/use-browse-view';
import { useReadmeReturnRestore } from '../hooks/use-readme-return-restore';
import {
  addSelection,
  clearSelection,
  removeSelection,
  toggleSelection,
} from '../lib/bulk-selection';
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
  const { t, i18n } = useTranslation();
  const { view, transitionTo } = useBrowseView();
  const filters = useBrowseFilters();
  const { requestOpen, requestClose, registerContext } = useRepoInspector();
  const selectedRepoId = useRepoInspectorStore((state) => state.record?.repoId);
  const { data, isLoading: reposLoading, isError, refetch, isFetching } = useStarredRepos();
  const { data: tags, isLoading: tagsLoading } = useTags();
  const { data: repoTags, isLoading: repoTagsLoading } = useRepoTags();
  const { data: collectionRepos, isLoading: collectionReposLoading } = useCollectionRepos();
  const { data: collections, isLoading: collectionsLoading } = useCollections();
  const { data: bulkOperations } = useBulkOperations();
  const { data: aiConnections, isLoading: aiConnectionsLoading } = useAiConnections();
  const { data: aiSettings, isLoading: aiSettingsLoading } = useAiSettings();
  const { data: aiDraft, isLoading: aiDraftLoading } = useAiOrganizationDraft();
  const generateAiDraft = useGenerateAiOrganizationDraft();
  const discardAiDraft = useDiscardAiOrganizationDraft();
  const updateAiDraftReview = useUpdateAiOrganizationDraftReview();
  const confirmAiDraft = useConfirmAiOrganizationDraft();
  const bulkActions = useBulkOperationActions();
  const { data: noteRepoIds, isLoading: notesLoading } = useNoteRepoIds();
  const isLoading =
    reposLoading ||
    tagsLoading ||
    repoTagsLoading ||
    collectionReposLoading ||
    collectionsLoading ||
    notesLoading ||
    aiConnectionsLoading ||
    aiSettingsLoading ||
    aiDraftLoading;
  const sync = useSyncStars();
  const syncPending = sync.requiresReconnect ? sync.reconnectPending : sync.isPending;
  const [repoScrollElement, setRepoScrollElement] = useState<HTMLElement | null>(null);
  const [stuck, setStuck] = useState(false);
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(() => new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkExportOpen, setBulkExportOpen] = useState(false);
  const skipViewScrollResetRef = useRef(peekPendingReadmeReturn()?.sourceKey === 'browse');

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

  const records = useMemo(() => data ?? [], [data]);
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

  const visible = useMemo(
    () =>
      sortStarredRepos(
        filterStarredRepos(records, toRepoFilter(filters), Date.now(), tagsByRepoId),
        filters.sort,
      ),
    [records, filters, tagsByRepoId],
  );
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
  const repoNames = useMemo(
    () => new Map(records.map((record) => [record.repoId, record.repo.fullName])),
    [records],
  );
  const targetNames = useMemo(
    () =>
      new Map([
        ...(tags ?? []).map((tag) => [tag.id, tag.name] as const),
        ...(collections ?? []).map((collection) => [collection.id, collection.name] as const),
      ]),
    [tags, collections],
  );

  const total = new Intl.NumberFormat(i18n.language).format(visible.length);
  const hasRepos = records.length > 0;
  const activeBulkOperation = bulkOperations?.find((operation) => operation.status !== 'completed');
  const activeAiConnection =
    aiConnections?.find((connection) => connection.id === aiSettings?.generationConnectionId) ??
    null;
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
  const bulkOperationContent = activeBulkOperation ? (
    <BulkOperationBanner
      operation={activeBulkOperation}
      resuming={bulkActions.resume.isPending}
      retrying={bulkActions.retry.isPending}
      completing={bulkActions.complete.isPending}
      onResume={() => bulkActions.resume.mutate(activeBulkOperation)}
      onRetry={() => bulkActions.retry.mutate(activeBulkOperation)}
      onComplete={() => bulkActions.complete.mutate(activeBulkOperation)}
    />
  ) : null;
  const aiDraftContent = aiDraft ? (
    <AiOrganizationDraftBanner
      draft={aiDraft}
      repoNames={repoNames}
      targetNames={targetNames}
      discarding={discardAiDraft.isPending}
      confirming={confirmAiDraft.isPending}
      updatingReviewId={
        updateAiDraftReview.isPending
          ? (updateAiDraftReview.variables?.change.suggestionId ?? null)
          : null
      }
      onUpdate={(input) => updateAiDraftReview.mutateAsync(input)}
      onConfirm={(input) => confirmAiDraft.mutateAsync(input)}
      onDiscard={() => discardAiDraft.mutateAsync()}
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
      tagsByRepo={tagsByRepo}
      collectionCountByRepo={collectionCountByRepo}
      noteRepoIds={noteRepoIdSet}
      selectedRepoId={selectedRepoId}
      onSelect={openInspector}
      scrollElement={repoScrollElement}
      bulkSelection={selectionController}
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
                  {bulkSelectionMode ? (
                    <section
                      aria-label={t('bulk.toolbarLabel')}
                      className="flex w-full min-w-0 flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 lg:w-auto lg:flex-row lg:items-center"
                    >
                      <div className="mr-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-1">
                        <span className="font-medium text-caption text-foreground">
                          {t('bulk.modeTitle')}
                        </span>
                        <span
                          aria-live="polite"
                          className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-caption text-primary"
                        >
                          {t('bulk.selectedCount', { count: selectedCount })}
                        </span>
                        {hiddenSelectedCount > 0 ? (
                          <span className="text-caption text-muted-foreground">
                            {t('bulk.hiddenSelectedCount', { count: hiddenSelectedCountLabel })}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-1.5 lg:w-auto lg:justify-end">
                        <Button
                          variant={selectedRepoIds.size === 0 ? 'default' : 'outline'}
                          size="sm"
                          disabled={visibleRepoIds.length === 0}
                          onClick={() =>
                            setSelectedRepoIds((current) => {
                              const includesAllVisible = visibleRepoIds.every((repoId) =>
                                current.has(repoId),
                              );
                              return includesAllVisible
                                ? removeSelection(current, visibleRepoIds)
                                : addSelection(current, visibleRepoIds);
                            })
                          }
                        >
                          {t(scopeActionKey, { count: total })}
                        </Button>
                        {selectedRepoIds.size > 0 ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRepoIds(clearSelection())}
                            >
                              {t('bulk.clear')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBulkExportOpen(true)}
                            >
                              {t('bulk.export.action')}
                            </Button>
                          </>
                        ) : null}
                        <AiOrganizationPreflight
                          selectedRepoIds={[...selectedRepoIds]}
                          connection={activeAiConnection}
                          model={aiSettings?.generationModel ?? null}
                          includeNotes={aiSettings?.includeNotesInAi ?? false}
                          existingDraft={aiDraft ?? null}
                          pending={generateAiDraft.isPending}
                          onGenerate={(repoIds) => generateAiDraft.mutateAsync(repoIds)}
                        />
                        {selectedRepoIds.size > 0 ? (
                          <Button
                            size="sm"
                            disabled={Boolean(activeBulkOperation)}
                            onClick={() => setBulkDialogOpen(true)}
                          >
                            {t('bulk.organize')}
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBulkSelectionMode(false);
                            setSelectedRepoIds(clearSelection());
                          }}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </section>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Boolean(activeBulkOperation)}
                        onClick={() => {
                          requestClose();
                          setBulkSelectionMode(true);
                        }}
                      >
                        {t('bulk.select')}
                      </Button>
                      <RepoViewToggle committedView={view} onSelect={transitionTo} />
                    </>
                  )}
                </div>
              </div>
              <RepoFilterBar facets={facets} tags={tags ?? []} />
            </GlassControlRow>
            {sync.isPending ? <SyncProgressBanner label={t('sync.progress')} /> : null}
            {bulkOperationContent}
            {aiDraftContent}
          </div>
        </div>

        <div
          ref={setRepoScrollElement}
          data-browse-scroll-container
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-6"
        >
          <div className="mx-auto w-full max-w-6xl">{repoContent}</div>
        </div>
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
                onSuccess: () => {
                  setBulkDialogOpen(false);
                  setBulkSelectionMode(false);
                  setSelectedRepoIds(clearSelection());
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
        {aiDraftContent}

        {repoContent}
      </div>
    </div>
  );
}
