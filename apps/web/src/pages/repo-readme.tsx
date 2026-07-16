import { Button, Skeleton } from '@asterism/ui';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { EmptyState } from '../components/empty-state';
import { LoadingRegion } from '../components/loading-region';
import { useRepoReadme } from '../data/use-repo-readme';
import { type ReadmeRouteState, resolveReadmeReturn } from '../lib/readme-navigation';

const ReadmeDocument = lazy(() =>
  import('../components/readme-document').then((module) => ({
    default: module.ReadmeDocument,
  })),
);

function ReadmeDocumentSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="mx-auto w-full max-w-[60rem] px-5 py-8 sm:px-8">
      <div className="space-y-7" aria-hidden="true">
        <Skeleton className="h-8 w-2/5" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <Skeleton className="h-6 w-1/3" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-6 w-1/4" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function RepoReadmePage() {
  const { t } = useTranslation();
  const { owner, name } = useParams<{ owner: string; name: string }>();
  const location = useLocation();
  const readme = useRepoReadme(owner, name);
  const repo = `${owner ?? ''}/${name ?? ''}`;
  const githubUrl = `https://github.com/${encodeURIComponent(owner ?? '')}/${encodeURIComponent(name ?? '')}`;
  const returnDestination = resolveReadmeReturn(
    location.state as ReadmeRouteState | null,
    owner ?? '',
    name ?? '',
  );
  const returnLabel =
    returnDestination.source === 'collection' && returnDestination.collectionName
      ? t('readme.backToCollection', { name: returnDestination.collectionName })
      : t('readme.backToBrowse');
  const state = readme.data?.status;
  const errorCopy =
    state === 'not_found'
      ? ['readme.notFoundTitle', 'readme.notFoundDescription']
      : state === 'not_in_library'
        ? ['readme.notInLibraryTitle', 'readme.notInLibraryDescription']
        : state === 'rate_limited'
          ? ['readme.rateLimitedTitle', 'readme.rateLimitedDescription']
          : state === 'reconnect_required'
            ? ['readme.reconnectTitle', 'readme.reconnectDescription']
            : ['readme.errorTitle', 'readme.errorDescription'];
  const showError = readme.isError || (state && state !== 'success');

  return (
    <div className="-m-6 flex min-h-0 flex-1 flex-col bg-background">
      <header className="asterism-glass-surface z-10 flex min-h-13 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 min-w-11 gap-2 sm:min-h-8 sm:min-w-0"
          asChild
        >
          <Link to={returnDestination.to}>
            <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden truncate sm:inline">{returnLabel}</span>
            <span className="sr-only sm:hidden">{returnLabel}</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1 truncate text-body font-semibold">
          <span className="text-muted-foreground">{owner}</span>
          <span className="text-muted-foreground"> / </span>
          <span>{name}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 min-w-11 gap-2 sm:min-h-8 sm:min-w-0"
          asChild
        >
          <a href={githubUrl} target="_blank" rel="noreferrer noopener">
            <ExternalLinkIcon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('readme.openOnGitHub')}</span>
            <span className="sr-only sm:hidden">{t('readme.openOnGitHub')}</span>
          </a>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {readme.isPending ? (
          <ReadmeDocumentSkeleton label={t('readme.loading')} />
        ) : readme.data?.status === 'success' && owner && name ? (
          <Suspense fallback={<ReadmeDocumentSkeleton label={t('readme.loading')} />}>
            <ReadmeDocument
              html={readme.data.html}
              owner={owner}
              name={name}
              label={t('readme.documentLabel', { repo })}
            />
          </Suspense>
        ) : showError ? (
          <div className="mx-auto flex min-h-full w-full max-w-3xl items-center px-6 py-10">
            <EmptyState
              icon={state === 'not_found' ? BookOpenIcon : AlertTriangleIcon}
              title={t(errorCopy[0] as string)}
              description={t(errorCopy[1] as string)}
              action={
                state === 'not_in_library' ? (
                  <Button variant="outline" asChild>
                    <Link to="/">{t('readme.backToBrowse')}</Link>
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => readme.refetch()}>
                    <RefreshCwIcon className="size-4" aria-hidden="true" />
                    {t('readme.retry')}
                  </Button>
                )
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
