import { ArrowLeft, FolderGit2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RepoDetailSheet } from '@/components/app/repo-detail-sheet';
import { RepoRow } from '@/components/app/repo-item';
import { Button } from '@/components/ui/button';
import { repos, useStore } from '@/data/store';
import { useI18n } from '@/i18n';

export function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { collections, tags, repoTags, notes } = useStore();
  const [openRepoId, setOpenRepoId] = useState<string | null>(null);

  const collection = collections.find((c) => c.id === id);

  const items = useMemo(
    () => (collection ? repos.filter((r) => collection.repoIds.includes(r.id)) : []),
    [collection],
  );

  const tagsFor = (repoId: string) =>
    (repoTags[repoId] ?? []).map((tid) => tags.find((tg) => tg.id === tid)).filter(Boolean) as never[];

  if (!collection) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">404</p>
        <Button variant="outline" onClick={() => navigate('/collections')}>
          {t('collections.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <button
          onClick={() => navigate('/collections')}
          className="mb-3 inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t('collections.back')}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-accent text-foreground">
            <FolderGit2 className="size-5" />
          </div>
          <div>
            <h1 className="font-semibold text-xl tracking-tight">{collection.name}</h1>
            <p className="text-muted-foreground text-sm">
              {collection.description
                ? collection.description
                : t('collections.count', { count: items.length })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
            <p className="text-muted-foreground text-sm">{t('collections.empty')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((repo) => (
              <RepoRow
                key={repo.id}
                repo={repo}
                tags={tagsFor(repo.id)}
                hasNote={Boolean(notes[repo.id])}
                onOpen={() => setOpenRepoId(repo.id)}
              />
            ))}
          </div>
        )}
      </div>

      <RepoDetailSheet
        repo={openRepoId ? (repos.find((r) => r.id === openRepoId) ?? null) : null}
        open={openRepoId != null}
        onClose={() => setOpenRepoId(null)}
      />
    </div>
  );
}
