import type { ExportSnapshot } from '@asterism/core';
import { Button, toast } from '@asterism/ui';
import {
  DownloadIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  UploadIcon,
} from 'lucide-react';
import { type DragEvent, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';
import { useCollectionRepos } from '../data/use-collection-repos';
import { useCollections } from '../data/use-collections';
import {
  downloadText,
  type ExportFormat,
  serializeExport,
  useImportUserData,
} from '../data/use-import-export';
import { useNotesList } from '../data/use-notes-list';
import { useRepoTags } from '../data/use-repo-tags';
import { useStarredRepos } from '../data/use-starred-repos';
import { useTags } from '../data/use-tags';

const DEFAULT_FORMAT_OPTION = {
  id: 'json',
  icon: FileJsonIcon,
  ext: 'json',
  mime: 'application/json',
} satisfies { id: ExportFormat; icon: typeof FileJsonIcon; ext: string; mime: string };
const FORMAT_OPTIONS: { id: ExportFormat; icon: typeof FileJsonIcon; ext: string; mime: string }[] =
  [
    DEFAULT_FORMAT_OPTION,
    { id: 'csv', icon: FileSpreadsheetIcon, ext: 'csv', mime: 'text/csv' },
    { id: 'markdown', icon: FileTextIcon, ext: 'md', mime: 'text/markdown' },
  ];

export function ImportExportPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [dragOver, setDragOver] = useState(false);

  const { data: starredRepos } = useStarredRepos();
  const { data: tags } = useTags();
  const { data: collections } = useCollections();
  const { data: repoTags } = useRepoTags();
  const { data: collectionRepos } = useCollectionRepos();
  const { data: notesList } = useNotesList();
  const importData = useImportUserData();

  const snapshot = useMemo((): ExportSnapshot => {
    const records = starredRepos ?? [];
    const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag.name]));
    const collectionById = new Map(
      (collections ?? []).map((collection) => [collection.id, collection.name]),
    );
    const fullNameByRepoId = new Map(
      records.map((record) => [record.repoId, record.repo.fullName]),
    );

    return {
      tags: (tags ?? []).map(({ name, color }) => ({ name, color })),
      collections: (collections ?? []).map(({ name, description }) => ({ name, description })),
      repos: records.map(({ repo, starredAt }) => ({
        fullName: repo.fullName,
        starredAt,
        language: repo.language,
        description: repo.description,
        topics: repo.topics,
        stargazers: repo.stargazers,
        forks: repo.forks,
        archived: repo.archived,
        pushedAt: repo.pushedAt,
      })),
      repoTags: (repoTags ?? [])
        .map((link) => {
          const tagName = tagById.get(link.tagId);
          const fullName = fullNameByRepoId.get(link.repoId);
          if (!tagName || !fullName) {
            return null;
          }
          return { fullName, tagName };
        })
        .filter((link): link is { fullName: string; tagName: string } => link !== null),
      collectionRepos: (collectionRepos ?? [])
        .map((link) => {
          const collectionName = collectionById.get(link.collectionId);
          const fullName = fullNameByRepoId.get(link.repoId);
          if (!collectionName || !fullName) {
            return null;
          }
          return { collectionName, fullName };
        })
        .filter((link): link is { collectionName: string; fullName: string } => link !== null),
      notes: (notesList ?? [])
        .map((note) => {
          const fullName = fullNameByRepoId.get(note.repoId);
          if (!fullName || !note.body.trim()) {
            return null;
          }
          return { fullName, body: note.body };
        })
        .filter((note): note is { fullName: string; body: string } => note !== null),
    };
  }, [starredRepos, tags, collections, repoTags, collectionRepos, notesList]);

  const preview = useMemo(() => serializeExport(snapshot, format), [snapshot, format]);
  const hasData = (starredRepos?.length ?? 0) > 0;

  const handleDownload = () => {
    const option = FORMAT_OPTIONS.find((item) => item.id === format) ?? DEFAULT_FORMAT_OPTION;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(preview, `asterism-export-${stamp}.${option.ext}`, option.mime);
  };

  const handleImportFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error(t('importExport.invalidFile'));
      return;
    }
    try {
      const raw = await file.text();
      const result = await importData.mutateAsync(raw);
      toast.success(t('importExport.importSuccess'), {
        description: t('importExport.importSummary', {
          tags: result.imported.tags,
          collections: result.imported.collections,
          links: result.imported.repoTags + result.imported.collectionRepos,
          notes: result.imported.notes,
        }),
      });
      if (result.skipped.length > 0) {
        toast.message(t('importExport.importSkipped'), {
          description: result.skipped.slice(0, 3).join('; '),
        });
      }
      if (result.errors.length > 0) {
        toast.error(t('importExport.importPartial'), {
          description: result.errors.slice(0, 3).join('; '),
        });
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN';
      toast.error(
        t(`importExport.errors.${code}`, { defaultValue: t('importExport.importFailed') }),
      );
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void handleImportFile(file);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title={t('importExport.title')} description={t('importExport.subtitle')} />

      {!hasData ? (
        <EmptyState
          icon={DownloadIcon}
          title={t('importExport.emptyTitle')}
          description={t('importExport.emptyDescription')}
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
              <h2 className="font-semibold text-base text-foreground">
                {t('importExport.exportTitle')}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {t('importExport.exportDescription')}
              </p>
              <div className="flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map(({ id, icon: Icon }) => (
                  <Button
                    key={id}
                    variant={format === id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat(id)}
                  >
                    <Icon className="size-4" />
                    {t(`importExport.format.${id}`)}
                  </Button>
                ))}
              </div>
              <Button onClick={handleDownload} className="w-fit">
                <DownloadIcon className="size-4" />
                {t('importExport.download')}
              </Button>
            </section>

            <section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
              <h2 className="font-semibold text-base text-foreground">
                {t('importExport.importTitle')}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {t('importExport.importDescription')}
              </p>
              <button
                type="button"
                className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm transition-colors ${
                  dragOver ? 'border-primary bg-accent' : 'border-border bg-muted/30'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <UploadIcon className="size-8 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {t('importExport.uploadPrompt')}
                </span>
                <span className="text-muted-foreground">{t('importExport.uploadHint')}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleImportFile(file);
                  }
                  event.target.value = '';
                }}
              />
            </section>
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="font-semibold text-base text-foreground">
              {t('importExport.previewTitle')}
            </h2>
            <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
              {preview}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}
