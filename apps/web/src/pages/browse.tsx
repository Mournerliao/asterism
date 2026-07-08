import { deriveRepoFacets, filterStarredRepos, sortStarredRepos, type Tag } from '@asterism/core';
import { Button, GlassControlRow } from '@asterism/ui';
import { AlertTriangleIcon, RefreshCwIcon, SearchXIcon, StarIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowseRepoList } from '../components/browse-repo-list';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';
import { RepoFilterBar } from '../components/repo-filter-bar';
import { RepoCardSkeleton, RepoListRowSkeleton } from '../components/repo-skeletons';
import { RepoViewToggle } from '../components/repo-view-toggle';
import { SyncProgressBanner } from '../components/sync-progress-banner';
import { useRepoTags } from '../data/use-repo-tags';
import { useStarredRepos } from '../data/use-starred-repos';
import { useSyncStars } from '../data/use-sync-stars';
import { useTags } from '../data/use-tags';
import { useBrowseView } from '../hooks/use-browse-view';
import { toRepoFilter, useBrowseFilters } from '../stores/browse-filters';
import type { RepoViewMode } from '../stores/browse-view';
import { useRepoDrawer } from '../stores/repo-drawer';

const INITIAL_GRID_KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;
const INITIAL_LIST_KEYS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'] as const;

function InitialLoadingState({ view }: { view: RepoViewMode }) {
  if (view === 'list') {
    return (
      <div className="flex flex-col">
        {INITIAL_LIST_KEYS.map((key) => (
          <RepoListRowSkeleton key={key} />
        ))}
      </div>
    );
  }
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))' }}
    >
      {INITIAL_GRID_KEYS.map((key) => (
        <RepoCardSkeleton key={key} />
      ))}
    </div>
  );
}

export function BrowsePage() {
  const { t, i18n } = useTranslation();
  const { view, transitionTo } = useBrowseView();
  const filters = useBrowseFilters();
  const openDrawer = useRepoDrawer((state) => state.open);
  const { data, isLoading, isError, refetch, isFetching } = useStarredRepos();
  const { data: tags } = useTags();
  const { data: repoTags } = useRepoTags();
  const sync = useSyncStars();
  const [repoScrollElement, setRepoScrollElement] = useState<HTMLElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = repoScrollElement;
    if (!el) {
      return;
    }
    const update = () => setStuck(el.scrollTop > 0);
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [repoScrollElement]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset scroll after committed view changes
  useEffect(() => {
    if (repoScrollElement) {
      repoScrollElement.scrollTop = 0;
    }
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

  const total = new Intl.NumberFormat(i18n.language).format(visible.length);
  const hasRepos = records.length > 0;

  const repoContent = isLoading ? (
    <InitialLoadingState view={view} />
  ) : isError ? (
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
        sync.requiresReconnect ? undefined : (
          <Button className="h-10" onClick={sync.sync} disabled={sync.isPending}>
            <RefreshCwIcon className={sync.isPending ? 'size-4 animate-spin' : 'size-4'} />
            {t('browse.syncAction')}
          </Button>
        )
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
      onSelect={openDrawer}
      scrollElement={repoScrollElement}
    />
  );

  if (hasRepos) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-5">
        <div className="flex shrink-0 flex-col gap-4">
          <GlassControlRow stuck={stuck} className="flex-col items-stretch gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <PageHeader
                size="section"
                title={t('browse.title')}
                description={!isLoading && !isError ? t('browse.count', { total }) : undefined}
              />
              <RepoViewToggle committedView={view} onSelect={transitionTo} />
            </div>
            <RepoFilterBar facets={facets} tags={tags ?? []} />
          </GlassControlRow>
          {sync.isPending ? (
            <SyncProgressBanner
              current={Math.floor(records.length * 0.7)}
              total={records.length || 100}
            />
          ) : null}
        </div>

        <div ref={setRepoScrollElement} className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
          {repoContent}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-5 overflow-y-auto">
      <PageHeader
        size="section"
        title={t('browse.title')}
        description={!isLoading && !isError ? t('browse.count', { total }) : undefined}
      />

      {sync.isPending ? (
        <SyncProgressBanner
          current={Math.floor(records.length * 0.7)}
          total={records.length || 100}
        />
      ) : null}

      {repoContent}
    </div>
  );
}
