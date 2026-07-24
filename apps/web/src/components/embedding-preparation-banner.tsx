import { Button } from '@asterism/ui';
import {
  CpuIcon,
  DownloadIcon,
  LoaderCircleIcon,
  SearchIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EmbeddingBootstrapState } from '../data/use-embedding-bootstrap';

interface EmbeddingPreparationBannerProps extends EmbeddingBootstrapState {
  optedIn: boolean;
  onStart: () => void;
  onRetry: () => void;
}

export function EmbeddingPreparationBanner({
  phase,
  modelProgress,
  completed,
  total,
  backend,
  onStart,
  onRetry,
}: EmbeddingPreparationBannerProps) {
  const { t } = useTranslation();

  if (phase === 'ready') {
    return null;
  }

  if (phase === 'idle') {
    return (
      <section
        aria-labelledby="embedding-preparation-title"
        className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <SearchIcon className="mt-0.5 size-5 shrink-0 text-link" aria-hidden="true" />
          <div className="min-w-0">
            <h2
              id="embedding-preparation-title"
              className="font-semibold text-[13px] text-foreground"
            >
              {t('embeddings.prepareTitle')}
            </h2>
            <p className="mt-1 max-w-[70ch] text-caption text-muted-foreground">
              {t('embeddings.prepareDescription', { count: total })}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onStart}>
          <DownloadIcon className="size-4" aria-hidden="true" />
          {t('embeddings.prepareAction')}
        </Button>
      </section>
    );
  }

  if (phase === 'degraded') {
    return (
      <section
        role="status"
        aria-live="polite"
        className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="font-semibold text-[13px] text-foreground">
              {t('embeddings.degradedTitle')}
            </h2>
            <p className="mt-1 text-caption text-muted-foreground">
              {t('embeddings.degradedDescription')}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      </section>
    );
  }

  const loadingModel = phase === 'loading-model';
  const backfilling = phase === 'backfilling';
  const progress = loadingModel
    ? Math.round(modelProgress)
    : backfilling && total > 0
      ? Math.round((completed / total) * 100)
      : 0;

  return (
    <section
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border bg-card p-4"
    >
      {loadingModel ? (
        <DownloadIcon className="mt-0.5 size-5 shrink-0 text-link" aria-hidden="true" />
      ) : backfilling ? (
        <CpuIcon className="mt-0.5 size-5 shrink-0 text-link" aria-hidden="true" />
      ) : (
        <LoaderCircleIcon
          className="mt-0.5 size-5 shrink-0 animate-spin text-link motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium text-[13px] text-foreground">
            {loadingModel
              ? t('embeddings.downloading')
              : backfilling
                ? t('embeddings.backfilling', { completed, total })
                : t('embeddings.checking')}
          </p>
          {loadingModel || backfilling ? (
            <span className="font-mono text-caption text-muted-foreground">{progress}%</span>
          ) : null}
        </div>
        {loadingModel || backfilling ? (
          <div
            role="progressbar"
            aria-label={
              loadingModel ? t('embeddings.modelProgress') : t('embeddings.backfillProgress')
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
        {backend ? (
          <p className="mt-1.5 text-micro text-muted-foreground">
            {t('embeddings.backend', { backend: backend.toUpperCase() })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
