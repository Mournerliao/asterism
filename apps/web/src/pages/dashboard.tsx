import { deriveDashboardInsights } from '@asterism/core';
import { Button, Card, Skeleton } from '@asterism/ui';
import {
  AlertTriangleIcon,
  FolderIcon,
  LanguagesIcon,
  LoaderCircleIcon,
  LogInIcon,
  RefreshCwIcon,
  StarIcon,
  TagIcon,
} from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardCharts } from '../components/dashboard/dashboard-charts';
import { StatCard } from '../components/dashboard/stat-card';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';
import { useCollections } from '../data/use-collections';
import { useRepoTags } from '../data/use-repo-tags';
import { useStarredRepos } from '../data/use-starred-repos';
import { useSyncStars } from '../data/use-sync-stars';
import { useTags } from '../data/use-tags';

const LazyDashboardCharts = lazy(async () => ({
  default: DashboardCharts,
}));

const STAT_SKELETON_KEYS = ['a', 'b', 'c', 'd'];

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data: starredRepos, isLoading, isError, refetch, isFetching } = useStarredRepos();
  const { data: tags } = useTags();
  const { data: collections } = useCollections();
  const { data: repoTags } = useRepoTags();
  const sync = useSyncStars();
  const syncPending = sync.requiresReconnect ? sync.reconnectPending : sync.isPending;

  const records = useMemo(() => starredRepos ?? [], [starredRepos]);

  const insights = useMemo(
    () =>
      deriveDashboardInsights({
        starredRepos: records,
        tags: (tags ?? []).map(({ id, name, color }) => ({ id, name, color })),
        collections: (collections ?? []).map(({ id, name, description }) => ({
          id,
          name,
          description,
        })),
        repoTags: repoTags ?? [],
      }),
    [records, tags, collections, repoTags],
  );

  const formatCount = (value: number) => new Intl.NumberFormat(i18n.language).format(value);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto">
      <PageHeader title={t('dashboard.title')} description={t('dashboard.subtitle')} />

      {isLoading ? (
        <>
          <div className="grid grid-cols-2 border-y lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r lg:[&>*]:border-r-0 lg:[&>*]:border-b-0">
            {STAT_SKELETON_KEYS.map((key) => (
              <Card key={key} className="h-24 animate-pulse" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="h-72 animate-pulse" />
            <Card className="h-72 animate-pulse" />
          </div>
        </>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangleIcon}
          title={t('dashboard.errorTitle')}
          description={t('dashboard.errorDescription')}
          action={
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCwIcon className="size-4" />
              {t('browse.retry')}
            </Button>
          }
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={StarIcon}
          title={t('dashboard.emptyTitle')}
          description={t('dashboard.emptyDescription')}
          action={
            <Button onClick={sync.sync} disabled={syncPending}>
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
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={StarIcon}
              label={t('dashboard.totalStars')}
              value={formatCount(insights.stats.totalStars)}
            />
            <StatCard
              icon={LanguagesIcon}
              label={t('dashboard.languages')}
              value={formatCount(insights.stats.languageCount)}
            />
            <StatCard
              icon={TagIcon}
              label={t('dashboard.taggedRepos')}
              value={formatCount(insights.stats.taggedRepoCount)}
            />
            <StatCard
              icon={FolderIcon}
              label={t('dashboard.collections')}
              value={formatCount(insights.stats.collectionCount)}
            />
          </div>

          <Suspense
            fallback={
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
              </div>
            }
          >
            <LazyDashboardCharts insights={insights} />
          </Suspense>
        </>
      )}
    </div>
  );
}
