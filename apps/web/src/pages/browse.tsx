import { deriveRepoFacets, filterStarredRepos, sortStarredRepos, type Tag } from '@asterism/core';
import { Button } from '@asterism/ui';
import { AlertTriangleIcon, RefreshCwIcon, SearchXIcon, StarIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';
import { RepoCollection } from '../components/repo-collection';
import { RepoFilterBar } from '../components/repo-filter-bar';
import { RepoCardSkeleton, RepoListRowSkeleton } from '../components/repo-skeletons';
import { RepoViewToggle } from '../components/repo-view-toggle';
import { SyncProgressBanner } from '../components/sync-progress-banner';
import { useRepoTags } from '../data/use-repo-tags';
import { useStarredRepos } from '../data/use-starred-repos';
import { useSyncStars } from '../data/use-sync-stars';
import { useTags } from '../data/use-tags';
import { toRepoFilter, useBrowseFilters } from '../stores/browse-filters';
import { useBrowseView } from '../stores/browse-view';
import { useRepoDrawer } from '../stores/repo-drawer';

const GRID_SKELETON_KEYS = Array.from({ length: 6 }, (_, i) => `grid-skeleton-${i}`);
const LIST_SKELETON_KEYS = Array.from({ length: 8 }, (_, i) => `list-skeleton-${i}`);

function LoadingState({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-0">
        {LIST_SKELETON_KEYS.map((key) => (
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
      {GRID_SKELETON_KEYS.map((key) => (
        <RepoCardSkeleton key={key} />
      ))}
    </div>
  );
}

export function BrowsePage() {
  const { t, i18n } = useTranslation();
  const view = useBrowseView((state) => state.view);
  const filters = useBrowseFilters();
  const openDrawer = useRepoDrawer((state) => state.open);
  const { data, isLoading, isError, refetch, isFetching } = useStarredRepos();
  const { data: tags } = useTags();
  const { data: repoTags } = useRepoTags();
  const sync = useSyncStars();

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

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          size="section"
          title={t('browse.title')}
          description={!isLoading && !isError ? t('browse.count', { total }) : undefined}
        />
        {hasRepos ? <RepoViewToggle /> : null}
      </div>

      {sync.isPending ? (
        <SyncProgressBanner
          current={Math.floor(records.length * 0.7)}
          total={records.length || 100}
        />
      ) : null}

      {hasRepos ? <RepoFilterBar facets={facets} tags={tags ?? []} /> : null}

      {isLoading ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <LoadingState view={view} />
        </div>
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
            <Button className="h-10" onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCwIcon className={sync.isPending ? 'size-4 animate-spin' : 'size-4'} />
              {t('browse.syncAction')}
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
        <RepoCollection
          records={visible}
          view={view}
          tagsByRepo={tagsByRepo}
          onSelect={openDrawer}
        />
      )}
    </div>
  );
}
