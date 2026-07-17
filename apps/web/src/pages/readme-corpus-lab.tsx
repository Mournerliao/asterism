import { Button, ReadmeDocument, ReadmeDocumentSkeleton, Skeleton, useTheme } from '@asterism/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ReadmeCorpusFixture,
  readmeCorpus,
  readmeCorpusHtmlFixtures,
} from '../fixtures/readme-corpus/manifest';
import { sanitizeReadmeHtml } from '../lib/readme-content';
import { deriveReadmeOutline } from '../lib/readme-outline';

/**
 * Maintainer-only corpus lab for Issue #10 visual acceptance.
 * Registered only when `import.meta.env.DEV` is true.
 */
export function ReadmeCorpusLabPage() {
  const { t } = useTranslation();
  const { setTheme, resolvedTheme } = useTheme();
  const [fixtureId, setFixtureId] = useState(readmeCorpusHtmlFixtures[0]?.id ?? 'ordinary-gfm');
  const [showSkeleton, setShowSkeleton] = useState(false);
  const fixture = readmeCorpus.find((item) => item.id === fixtureId) ?? readmeCorpusHtmlFixtures[0];

  const rendered = useMemo(() => {
    if (!fixture?.html) {
      return null;
    }
    return deriveReadmeOutline(sanitizeReadmeHtml(fixture.html, 'asterism-demo', 'corpus'));
  }, [fixture]);

  return (
    <div data-readme-corpus-lab className="min-h-svh bg-background text-foreground">
      <header className="asterism-glass-surface sticky top-0 z-10 border-b px-4 py-3">
        <div className="mx-auto flex max-w-[76.5rem] flex-wrap items-center gap-3">
          <h1 className="text-body font-semibold">{t('readme.corpusLab.title')}</h1>
          <label className="flex min-w-0 flex-1 items-center gap-2 text-caption">
            <span className="shrink-0 text-muted-foreground">{t('readme.corpusLab.fixture')}</span>
            <select
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2"
              value={fixture?.id}
              onChange={(event) => setFixtureId(event.target.value as typeof fixtureId)}
              data-corpus-fixture-select
            >
              {readmeCorpus.map((item: ReadmeCorpusFixture) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="h-11 min-w-11 px-3"
              variant={resolvedTheme === 'light' ? 'default' : 'outline'}
              data-corpus-theme="light"
              onClick={() => setTheme('light')}
            >
              {t('readme.corpusLab.themeLight')}
            </Button>
            <Button
              type="button"
              className="h-11 min-w-11 px-3"
              variant={resolvedTheme === 'dark' ? 'default' : 'outline'}
              data-corpus-theme="dark"
              onClick={() => setTheme('dark')}
            >
              {t('readme.corpusLab.themeDark')}
            </Button>
            <Button
              type="button"
              className="h-11 min-w-11 px-3"
              variant={showSkeleton ? 'default' : 'outline'}
              data-corpus-skeleton-toggle
              onClick={() => setShowSkeleton((value) => !value)}
            >
              {t('readme.corpusLab.skeleton')}
            </Button>
          </div>
        </div>
        {fixture ? (
          <p className="mx-auto mt-2 max-w-[76.5rem] text-caption text-muted-foreground">
            {fixture.description}
          </p>
        ) : null}
      </header>

      <main className="mx-auto max-w-[76.5rem] px-4 py-6" data-corpus-viewport>
        {fixture?.id === 'no-readme' ? (
          <div
            className="mx-auto flex min-h-64 max-w-3xl items-center justify-center rounded-lg border bg-card p-8 text-center"
            data-corpus-no-readme
            role="status"
          >
            <div>
              <p className="text-section-title font-semibold">{t('readme.notFoundTitle')}</p>
              <p className="mt-2 text-body text-muted-foreground">
                {t('readme.notFoundDescription')}
              </p>
            </div>
          </div>
        ) : showSkeleton ? (
          <ReadmeDocumentSkeleton label={t('readme.corpusLab.skeletonLabel')}>
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
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </ReadmeDocumentSkeleton>
        ) : rendered ? (
          <div data-corpus-outline-count={rendered.items.length}>
            <ReadmeDocument
              sanitizedHtml={rendered.html}
              label={t('readme.corpusLab.documentLabel', {
                title: fixture?.title ?? 'Corpus',
              })}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
