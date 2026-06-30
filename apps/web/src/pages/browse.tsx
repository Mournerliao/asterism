import { Button } from '@asterism/ui';
import { AlertTriangleIcon, RefreshCwIcon, StarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/empty-state';
import { RepoCollection } from '../components/repo-collection';
import { RepoCardSkeleton, RepoListRowSkeleton } from '../components/repo-skeletons';
import { RepoViewToggle } from '../components/repo-view-toggle';
import { useStarredRepos } from '../data/use-starred-repos';
import { useSyncStars } from '../data/use-sync-stars';
import { useBrowseView } from '../stores/browse-view';

const GRID_SKELETON_KEYS = Array.from({ length: 6 }, (_, i) => `grid-skeleton-${i}`);
const LIST_SKELETON_KEYS = Array.from({ length: 8 }, (_, i) => `list-skeleton-${i}`);

function LoadingState({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {LIST_SKELETON_KEYS.map((key) => (
          <RepoListRowSkeleton key={key} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {GRID_SKELETON_KEYS.map((key) => (
        <RepoCardSkeleton key={key} />
      ))}
    </div>
  );
}

export function BrowsePage() {
  const { t, i18n } = useTranslation();
  const view = useBrowseView((state) => state.view);
  const { data, isLoading, isError, refetch, isFetching } = useStarredRepos();
  const sync = useSyncStars();

  const records = data ?? [];
  const showHeaderMeta = !isLoading && !isError;
  const total = new Intl.NumberFormat(i18n.language).format(records.length);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl text-foreground tracking-tight">{t('browse.title')}</h1>
          {showHeaderMeta ? (
            <p className="text-muted-foreground text-sm">{t('browse.count', { total })}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {records.length > 0 ? <RepoViewToggle /> : null}
        </div>
      </div>

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
      ) : records.length === 0 ? (
        <EmptyState
          icon={StarIcon}
          title={t('browse.emptyTitle')}
          description={t('browse.emptyDescription')}
          action={
            <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCwIcon className={sync.isPending ? 'size-4 animate-spin' : 'size-4'} />
              {t('browse.syncAction')}
            </Button>
          }
        />
      ) : (
        <RepoCollection records={records} view={view} />
      )}
    </div>
  );
}
