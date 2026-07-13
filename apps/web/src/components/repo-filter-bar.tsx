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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  GlassRail,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@asterism/ui';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toRepoFilter, useBrowseFilters } from '../stores/browse-filters';

const ALL = '__all__';
const STAR_THRESHOLDS = [100, 1000, 10000, 50000];
const PUSHED_WINDOWS = [7, 30, 90, 365];
const FILTER_TRIGGER_CLASS =
  'h-7 rounded-lg border-[var(--glass-border)] text-caption shadow-none hover:bg-accent/70';

export function RepoFilterBar({ facets, tags }: { facets: RepoFacets; tags: Tag[] }) {
  const { t, i18n } = useTranslation();
  const filters = useBrowseFilters();
  const active = hasActiveFilter(toRepoFilter(filters));
  const tagCount = filters.tagIds.length;

  return (
    <GlassRail className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.language ?? ALL}
        onValueChange={(value) => filters.setLanguage(value === ALL ? null : value)}
      >
        <SelectTrigger size="sm" className={`${FILTER_TRIGGER_CLASS} min-w-32`}>
          <SelectValue placeholder={t('filters.language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('filters.allLanguages')}</SelectItem>
          {facets.languages.map((language) => (
            <SelectItem key={language} value={language}>
              {language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.topic ?? ALL}
        onValueChange={(value) => filters.setTopic(value === ALL ? null : value)}
      >
        <SelectTrigger size="sm" className={`${FILTER_TRIGGER_CLASS} min-w-32`}>
          <SelectValue placeholder={t('filters.topic')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('filters.allTopics')}</SelectItem>
          {facets.topics.map((topic) => (
            <SelectItem key={topic} value={topic}>
              {topic}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tags.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`${FILTER_TRIGGER_CLASS} min-w-28 gap-1 font-normal`}
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

      <Select
        value={String(filters.minStars)}
        onValueChange={(value) => filters.setMinStars(Number(value))}
      >
        <SelectTrigger size="sm" className={`${FILTER_TRIGGER_CLASS} min-w-28`}>
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

      <Select
        value={filters.pushedWithinDays === null ? ALL : String(filters.pushedWithinDays)}
        onValueChange={(value) => filters.setPushedWithinDays(value === ALL ? null : Number(value))}
      >
        <SelectTrigger size="sm" className={`${FILTER_TRIGGER_CLASS} min-w-32`}>
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

      <Select
        value={filters.status}
        onValueChange={(value) => filters.setStatus(value as RepoStatus)}
      >
        <SelectTrigger size="sm" className={`${FILTER_TRIGGER_CLASS} min-w-28`}>
          <SelectValue placeholder={t('filters.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.statusAll')}</SelectItem>
          <SelectItem value="active">{t('filters.statusActive')}</SelectItem>
          <SelectItem value="archived">{t('filters.statusArchived')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.sort} onValueChange={(value) => filters.setSort(value as RepoSort)}>
        <SelectTrigger size="sm" className={`${FILTER_TRIGGER_CLASS} min-w-40`}>
          <SelectValue placeholder={t('filters.sort')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="starred">{t('filters.sortStarred')}</SelectItem>
          <SelectItem value="pushed">{t('filters.sortPushed')}</SelectItem>
          <SelectItem value="stars">{t('filters.sortStars')}</SelectItem>
          <SelectItem value="name">{t('filters.sortName')}</SelectItem>
        </SelectContent>
      </Select>

      {active ? (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={filters.reset}
        >
          <XIcon className="size-4" />
          {t('filters.clear')}
        </Button>
      ) : null}
    </GlassRail>
  );
}
