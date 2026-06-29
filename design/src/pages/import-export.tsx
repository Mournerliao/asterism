import { Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { repos, useStore } from '@/data/store';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

type Format = 'json' | 'csv';

export function ImportExportPage() {
  const { t } = useI18n();
  const { tags, collections, notes, repoTags } = useStore();
  const [format, setFormat] = useState<Format>('json');
  const [dragOver, setDragOver] = useState(false);

  const exportPayload = useMemo(() => {
    if (format === 'csv') {
      const header = 'full_name,language,stars,forks,archived,starred_at';
      const rows = repos
        .slice(0, 50)
        .map(
          (r) =>
            `${r.fullName},${r.language},${r.stargazers},${r.forks},${r.archived},${r.starredAt}`,
        );
      return [header, ...rows].join('\n');
    }
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        counts: {
          repos: repos.length,
          tags: tags.length,
          collections: collections.length,
          notes: Object.keys(notes).length,
        },
        tags,
        collections,
        repoTags,
        notes: Object.values(notes),
        repos: repos.slice(0, 3),
      },
      null,
      2,
    );
  }, [format, tags, collections, notes, repoTags]);

  const download = () => {
    const blob = new Blob([exportPayload], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asterism-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="mb-6">
          <h1 className="font-semibold text-xl tracking-tight">{t('importExport.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('importExport.subtitle')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Export */}
          <section className="rounded-lg border bg-card p-5 text-card-foreground">
            <div className="mb-1 flex items-center gap-2">
              <Download className="size-4" />
              <h2 className="font-medium">{t('importExport.export')}</h2>
            </div>
            <p className="mb-4 text-muted-foreground text-sm">{t('importExport.exportDesc')}</p>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('json')}
                className={cn(
                  'flex items-center gap-2 rounded-md border p-3 text-left text-sm transition-colors',
                  format === 'json' ? 'border-ring bg-accent/50' : 'hover:bg-accent/40',
                )}
              >
                <FileJson className="size-5 text-muted-foreground" />
                {t('importExport.formatJson')}
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={cn(
                  'flex items-center gap-2 rounded-md border p-3 text-left text-sm transition-colors',
                  format === 'csv' ? 'border-ring bg-accent/50' : 'hover:bg-accent/40',
                )}
              >
                <FileSpreadsheet className="size-5 text-muted-foreground" />
                {t('importExport.formatCsv')}
              </button>
            </div>

            <Button className="w-full" onClick={download}>
              <Download className="size-4" />
              {t('importExport.download')}
            </Button>
          </section>

          {/* Import */}
          <section className="rounded-lg border bg-card p-5 text-card-foreground">
            <div className="mb-1 flex items-center gap-2">
              <Upload className="size-4" />
              <h2 className="font-medium">{t('importExport.import')}</h2>
            </div>
            <p className="mb-4 text-muted-foreground text-sm">{t('importExport.importDesc')}</p>

            <button
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              className={cn(
                'flex h-40 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground text-sm transition-colors',
                dragOver ? 'border-ring bg-accent/50' : 'hover:bg-accent/30',
              )}
            >
              <Upload className="size-6" />
              {t('importExport.dropHint')}
            </button>
          </section>
        </div>

        {/* Preview */}
        <section className="mt-4 rounded-lg border bg-card text-card-foreground">
          <div className="border-b px-5 py-3 font-medium text-sm">{t('importExport.preview')}</div>
          <pre className="max-h-80 overflow-auto p-5 font-mono text-muted-foreground text-xs leading-relaxed">
            {exportPayload}
          </pre>
        </section>
      </div>
    </div>
  );
}
