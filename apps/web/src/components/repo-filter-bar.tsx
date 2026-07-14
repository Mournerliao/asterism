import {
  hasActiveFilter,
  type RepoFacets,
  type RepoSort,
  type RepoStatus,
  type Tag,
} from '@asterism/core';
import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@asterism/ui';
import { ArrowUpDownIcon, ChevronDownIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toRepoFilter, useBrowseFilters } from '../stores/browse-filters';
import { FacetPicker } from './facet-picker';

const ALL = '__all__';
const STAR_THRESHOLDS = [100, 1000, 10000, 50000];
const PUSHED_WINDOWS = [7, 30, 90, 365];
const FILTER_TRIGGER_CLASS =
  'rounded-lg border-[var(--glass-border)] text-caption shadow-none hover:bg-accent/70';
const ACTIVE_FILTER_TRIGGER_CLASS = 'border-primary/30 bg-primary/5 hover:bg-primary/10';

export function RepoFilterBar({ facets, tags }: { facets: RepoFacets; tags: Tag[] }) {
  const { t, i18n } = useTranslation();
  const filters = useBrowseFilters();
  const active = hasActiveFilter(toRepoFilter(filters));
  const tagCount = filters.tagIds.length;
  const moreFilterCount =
    Number(filters.minStars > 0) +
    Number(filters.pushedWithinDays !== null) +
    Number(filters.status !== 'all');

  return (
    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <FacetPicker
          value={filters.language}
          options={facets.languages}
          triggerLabel={t('filters.language')}
          allLabel={t('filters.allLanguages')}
          searchLabel={t('filters.searchLanguages')}
          emptyLabel={t('filters.noResults')}
          resultsHint={(count) => t('filters.showingTopResults', { count })}
          onValueChange={filters.setLanguage}
        />

        <FacetPicker
          value={filters.topic}
          options={facets.topics}
          triggerLabel={t('filters.topic')}
          allLabel={t('filters.allTopics')}
          searchLabel={t('filters.searchTopics')}
          emptyLabel={t('filters.noResults')}
          resultsHint={(count) => t('filters.showingTopResults', { count })}
          onValueChange={filters.setTopic}
        />

        {tags.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  FILTER_TRIGGER_CLASS,
                  'min-w-28 gap-1 font-normal',
                  tagCount > 0 && ACTIVE_FILTER_TRIGGER_CLASS,
                )}
              >
                {t('filters.tags')}
                {tagCount > 0 ? (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                    {tagCount}
                  </Badge>
                ) : null}
                <ChevronDownIcon className="size-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 w-48 overflow-y-auto">
              {tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={filters.tagIds.includes(tag.id)}
                  onCheckedChange={() => filters.toggleTagId(tag.id)}
                >
                  <span
                    className="mr-2 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color ?? 'var(--muted-foreground)' }}
                  />
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                FILTER_TRIGGER_CLASS,
                'min-w-28 gap-1 px-2.5 font-normal',
                moreFilterCount > 0 && ACTIVE_FILTER_TRIGGER_CLASS,
              )}
            >
              <SlidersHorizontalIcon className="size-4" />
              {t('filters.more')}
              {moreFilterCount > 0 ? (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                  {moreFilterCount}
                </Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="pointer-events-auto w-72 space-y-3 p-3">
            <div className="space-y-1.5">
              <p className="font-medium text-xs">{t('filters.stars')}</p>
              <Select
                value={String(filters.minStars)}
                onValueChange={(value) => filters.setMinStars(Number(value))}
              >
                <SelectTrigger size="sm" className="w-full" aria-label={t('filters.stars')}>
                  <SelectValue placeholder={t('filters.stars')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('filters.anyStars')}</SelectItem>
                  {STAR_THRESHOLDS.map((threshold) => (
                    <SelectItem key={threshold} value={String(threshold)}>
                      {t('filters.minStars', {
                        value: new Intl.NumberFormat(i18n.language).format(threshold),
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="font-medium text-xs">{t('filters.pushed')}</p>
              <Select
                value={filters.pushedWithinDays === null ? ALL : String(filters.pushedWithinDays)}
                onValueChange={(value) =>
                  filters.setPushedWithinDays(value === ALL ? null : Number(value))
                }
              >
                <SelectTrigger size="sm" className="w-full" aria-label={t('filters.pushed')}>
                  <SelectValue placeholder={t('filters.pushed')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.anyTime')}</SelectItem>
                  {PUSHED_WINDOWS.map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {t('filters.pushedWithin', { value: days })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="font-medium text-xs">{t('filters.status')}</p>
              <Select
                value={filters.status}
                onValueChange={(value) => filters.setStatus(value as RepoStatus)}
              >
                <SelectTrigger size="sm" className="w-full" aria-label={t('filters.status')}>
                  <SelectValue placeholder={t('filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.statusAll')}</SelectItem>
                  <SelectItem value="active">{t('filters.statusActive')}</SelectItem>
                  <SelectItem value="archived">{t('filters.statusArchived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        {active ? (
          <Button
            variant="ghost"
            size="sm"
            className="size-8 gap-1 px-0 text-muted-foreground"
            onClick={filters.reset}
            aria-label={t('filters.clear')}
            title={t('filters.clear')}
          >
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="ml-0 flex shrink-0 items-center sm:ml-auto">
        <Select value={filters.sort} onValueChange={(value) => filters.setSort(value as RepoSort)}>
          <SelectTrigger size="sm" className={`${FILTER_TRIGGER_CLASS} min-w-40`}>
            <ArrowUpDownIcon className="size-4 text-muted-foreground" />
            <SelectValue placeholder={t('filters.sort')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="starred">{t('filters.sortStarred')}</SelectItem>
            <SelectItem value="pushed">{t('filters.sortPushed')}</SelectItem>
            <SelectItem value="stars">{t('filters.sortStars')}</SelectItem>
            <SelectItem value="name">{t('filters.sortName')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
