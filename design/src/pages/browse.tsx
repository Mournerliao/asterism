import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, LayoutGrid, List, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSearch } from '@/App';
import { FilterBar } from '@/components/app/filter-bar';
import { RepoDetailSheet } from '@/components/app/repo-detail-sheet';
import { RepoCard, RepoRow } from '@/components/app/repo-item';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/overlays';
import { repos, useStore } from '@/data/store';
import { useI18n } from '@/i18n';
import {
  applyFilters,
  emptyFilters,
  type FilterState,
  type SortKey,
  sortRepos,
} from '@/lib/filters';
import { cn } from '@/lib/utils';

type ViewMode = 'card' | 'list';
const SORT_KEYS: SortKey[] = ['starredAt', 'stars', 'pushedAt', 'name'];

export function BrowsePage() {
  const { t } = useI18n();
  const search = useSearch();
  const { tags, repoTags, notes } = useStore();

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [view, setView] = useState<ViewMode>('card');
  const [sort, setSort] = useState<SortKey>('starredAt');
  const [sortOpen, setSortOpen] = useState(false);
  const [openRepoId, setOpenRepoId] = useState<string | null>(null);
  const sortRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const list = applyFilters(repos, filters, search, repoTags);
    return sortRepos(list, sort);
  }, [filters, search, repoTags, sort]);

  const tagsFor = (repoId: string) =>
    (repoTags[repoId] ?? [])
      .map((id) => tags.find((tg) => tg.id === id))
      .filter(Boolean) as never[];

  // Grid: chunk into rows for the virtualizer.
  const COLS = 3;
  const rowCount = view === 'card' ? Math.ceil(filtered.length / COLS) : filtered.length;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (view === 'card' ? 220 : 64),
    overscan: 8,
    gap: view === 'card' ? 16 : 8,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 border-b px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-semibold text-xl tracking-tight">{t('browse.title')}</h1>
            <p className="text-muted-foreground text-sm">
              {filters || search
                ? t('browse.filtered', { count: filtered.length, total: repos.length })
                : t('browse.count', { count: repos.length })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                ref={sortRef}
                variant="outline"
                size="sm"
                onClick={() => setSortOpen((v) => !v)}
              >
                <ArrowUpDown className="size-3.5" />
                {t(`browse.sort.${sort}`)}
              </Button>
              <Popover
                open={sortOpen}
                onClose={() => setSortOpen(false)}
                anchorRef={sortRef}
                align="end"
              >
                <div className="w-40 p-1">
                  {SORT_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSort(key);
                        setSortOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                        sort === key && 'bg-accent',
                      )}
                    >
                      {t(`browse.sort.${key}`)}
                    </button>
                  ))}
                </div>
              </Popover>
            </div>

            <div className="flex items-center rounded-md border p-0.5">
              <button
                onClick={() => setView('card')}
                aria-label={t('browse.view.card')}
                className={cn(
                  'flex size-7 items-center justify-center rounded',
                  view === 'card' ? 'bg-accent text-foreground' : 'text-muted-foreground',
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setView('list')}
                aria-label={t('browse.view.list')}
                className={cn(
                  'flex size-7 items-center justify-center rounded',
                  view === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground',
                )}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Search className="size-8 text-muted-foreground" />
          <p className="font-medium">{t('browse.empty')}</p>
          <p className="text-muted-foreground text-sm">{t('browse.emptyHint')}</p>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {virtualizer.getVirtualItems().map((vItem) => {
              if (view === 'list') {
                const repo = filtered[vItem.index];
                return (
                  <div
                    key={repo.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vItem.start}px)`,
                    }}
                  >
                    <RepoRow
                      repo={repo}
                      tags={tagsFor(repo.id)}
                      hasNote={Boolean(notes[repo.id])}
                      onOpen={() => setOpenRepoId(repo.id)}
                    />
                  </div>
                );
              }
              const start = vItem.index * COLS;
              const rowRepos = filtered.slice(start, start + COLS);
              return (
                <div
                  key={vItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vItem.start}px)`,
                  }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {rowRepos.map((repo) => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      tags={tagsFor(repo.id)}
                      hasNote={Boolean(notes[repo.id])}
                      onOpen={() => setOpenRepoId(repo.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <RepoDetailSheet
        repo={openRepoId ? (repos.find((r) => r.id === openRepoId) ?? null) : null}
        open={openRepoId != null}
        onClose={() => setOpenRepoId(null)}
      />
    </div>
  );
}
