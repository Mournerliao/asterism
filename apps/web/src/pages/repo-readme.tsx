import type { RepoReadmeOutcome } from '@asterism/db';
import { Button, Skeleton } from '@asterism/ui';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { lazy, type ReactNode, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useGitHubReconnect } from '../auth/use-github-reconnect';
import { EmptyState } from '../components/empty-state';
import { LoadingRegion } from '../components/loading-region';
import { PendingActionContent } from '../components/pending-action-content';
import { useRepoReadme } from '../data/use-repo-readme';
import { type ReadmeRouteState, resolveReadmeReturn } from '../lib/readme-navigation';

const ReadmeDocument = lazy(() =>
  import('../components/readme-document').then((module) => ({
    default: module.ReadmeDocument,
  })),
);

type ReadmeFailureStatus = Exclude<RepoReadmeOutcome['status'], 'success'>;

const recoveryConfig = {
  not_found: {
    title: 'readme.notFoundTitle',
    description: 'readme.notFoundDescription',
    action: 'check',
    icon: BookOpenIcon,
  },
  not_in_library: {
    title: 'readme.notInLibraryTitle',
    description: 'readme.notInLibraryDescription',
    action: 'browse',
    icon: AlertTriangleIcon,
  },
  rate_limited: {
    title: 'readme.rateLimitedTitle',
    description: 'readme.rateLimitedDescription',
    action: 'reconnect',
    icon: AlertTriangleIcon,
  },
  reconnect_required: {
    title: 'readme.reconnectTitle',
    description: 'readme.reconnectDescription',
    action: 'reconnect',
    icon: AlertTriangleIcon,
  },
  retryable_error: {
    title: 'readme.errorTitle',
    description: 'readme.errorDescription',
    action: 'retry',
    icon: AlertTriangleIcon,
  },
} as const satisfies Record<
  ReadmeFailureStatus,
  {
    title: string;
    description: string;
    action: 'browse' | 'check' | 'reconnect' | 'retry';
    icon: typeof AlertTriangleIcon;
  }
>;

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
  const reconnect = useGitHubReconnect();
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
  const failureStatus: ReadmeFailureStatus | null = readme.isError
    ? 'retryable_error'
    : state && state !== 'success'
      ? state
      : null;
  const recovery = failureStatus ? recoveryConfig[failureStatus] : null;
  const retry = () => void readme.refetch();
  let recoveryAction: ReactNode = null;
  switch (recovery?.action) {
    case 'browse':
      recoveryAction = (
        <Button variant="outline" className="min-h-11 sm:min-h-9" asChild>
          <Link to="/">{t('readme.backToBrowse')}</Link>
        </Button>
      );
      break;
    case 'reconnect':
      recoveryAction = (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            className="min-h-11 sm:min-h-9"
            disabled={reconnect.reconnectPending}
            onClick={() => void reconnect.reconnect()}
          >
            <PendingActionContent
              pending={reconnect.reconnectPending}
              idleLabel={t('sync.reconnectAction')}
              pendingLabel={t('sync.reconnecting')}
            />
          </Button>
          <Button variant="outline" className="min-h-11 sm:min-h-9" asChild>
            <a href={githubUrl} target="_blank" rel="noreferrer noopener">
              <ExternalLinkIcon className="size-4" aria-hidden="true" />
              {t('readme.openOnGitHub')}
            </a>
          </Button>
        </div>
      );
      break;
    case 'check':
    case 'retry':
      recoveryAction = (
        <Button variant="outline" className="min-h-11 sm:min-h-9" onClick={retry}>
          <RefreshCwIcon className="size-4" aria-hidden="true" />
          {recovery.action === 'check' ? t('readme.checkAgain') : t('readme.retry')}
        </Button>
      );
      break;
  }

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
        ) : recovery ? (
          <div className="mx-auto flex min-h-full w-full max-w-3xl items-center px-6 py-10">
            <EmptyState
              icon={recovery.icon}
              title={t(recovery.title)}
              description={t(recovery.description)}
              action={recoveryAction}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
