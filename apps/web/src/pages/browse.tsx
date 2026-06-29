import { LayoutGrid, List, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { FilterPanel } from '@/components/filter-panel';
import { RepoCard, RepoRow } from '@/components/repo-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useStore } from '@/lib/store';
import { type SortKey, useRepoFilters } from '@/lib/use-repo-filters';

const SORT_LABELS: Record<SortKey, string> = {
  starred: '收藏时间',
  stars: 'Star 数',
  updated: '更新时间',
  name: '名称',
};

export function BrowsePage() {
  const { repos, tags } = useStore();
  const { filters, update, toggleInArray, reset, filtered, activeCount } = useRepoFilters(repos);
  const [view, setView] = useState<'card' | 'list'>('card');

  const panel = (
    <FilterPanel
      filters={filters}
      update={update}
      toggleInArray={toggleInArray}
      reset={reset}
      activeCount={activeCount}
    />
  );

  return (
    <div className="flex">
      {/* Desktop filter rail */}
      <aside className="hidden w-64 shrink-0 border-r p-5 lg:block">{panel}</aside>

      <div className="min-w-0 flex-1">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background/95 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
              <Input
                value={filters.query}
                onChange={(e) => update('query', e.target.value)}
                placeholder="搜索仓库名称或描述…"
                className="pl-9"
              />
            </div>

            {/* Mobile filter trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <SlidersHorizontal />
                  {activeCount > 0 && (
                    <span className="-top-1 -right-1 absolute flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-auto">
                <SheetHeader>
                  <SheetTitle>筛选</SheetTitle>
                </SheetHeader>
                <div className="p-4">{panel}</div>
              </SheetContent>
            </Sheet>

            <Button variant="outline" className="gap-2">
              <RefreshCw className="size-4" />
              <span className="hidden sm:inline">同步 Star</span>
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">
              共 <span className="font-medium text-foreground">{filtered.length}</span> 个仓库
              {activeCount > 0 && <span className="ml-1">（已筛选）</span>}
            </p>
            <div className="flex items-center gap-2">
              <Select value={filters.sort} onValueChange={(v) => update('sort', v as SortKey)}>
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {SORT_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(v) => v && setView(v as 'card' | 'list')}
                variant="outline"
              >
                <ToggleGroupItem value="card" aria-label="卡片视图">
                  <LayoutGrid />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="列表视图">
                  <List />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Active filter chips */}
          {activeCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {filters.languages.map((l) => (
                <Badge key={l} variant="secondary" className="gap-1">
                  {l}
                  <button type="button" onClick={() => toggleInArray('languages', l)}>
                    ×
                  </button>
                </Badge>
              ))}
              {filters.tagIds.map((id) => {
                const tag = tags.find((t) => t.id === id);
                return tag ? (
                  <Badge key={id} variant="secondary" className="gap-1">
                    #{tag.name}
                    <button type="button" onClick={() => toggleInArray('tagIds', id)}>
                      ×
                    </button>
                  </Badge>
                ) : null;
              })}
              {filters.topics.map((tp) => (
                <Badge key={tp} variant="secondary" className="gap-1">
                  {tp}
                  <button type="button" onClick={() => toggleInArray('topics', tp)}>
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <Empty className="py-20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>没有匹配的仓库</EmptyTitle>
              <EmptyDescription>试着调整或清除筛选条件。</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={reset}>
              清除全部筛选
            </Button>
          </Empty>
        ) : view === 'card' ? (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((repo) => (
              <RepoCard key={repo.id} repo={repo} tags={tags} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((repo) => (
              <RepoRow key={repo.id} repo={repo} tags={tags} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
