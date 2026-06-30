import { hasActiveFilter, type RepoFacets, type RepoSort, type RepoStatus } from '@asterism/core';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@asterism/ui';
import { XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toRepoFilter, useBrowseFilters } from '../stores/browse-filters';

const ALL = '__all__';
const STAR_THRESHOLDS = [100, 1000, 10000, 50000];
const PUSHED_WINDOWS = [7, 30, 90, 365];

export function RepoFilterBar({ facets }: { facets: RepoFacets }) {
  const { t, i18n } = useTranslation();
  const filters = useBrowseFilters();
  const active = hasActiveFilter(toRepoFilter(filters));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.language ?? ALL}
        onValueChange={(value) => filters.setLanguage(value === ALL ? null : value)}
      >
        <SelectTrigger size="sm" className="min-w-32">
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
        <SelectTrigger size="sm" className="min-w-32">
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

      <Select
        value={String(filters.minStars)}
        onValueChange={(value) => filters.setMinStars(Number(value))}
      >
        <SelectTrigger size="sm" className="min-w-28">
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
        <SelectTrigger size="sm" className="min-w-32">
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
        <SelectTrigger size="sm" className="min-w-28">
          <SelectValue placeholder={t('filters.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.statusAll')}</SelectItem>
          <SelectItem value="active">{t('filters.statusActive')}</SelectItem>
          <SelectItem value="archived">{t('filters.statusArchived')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.sort} onValueChange={(value) => filters.setSort(value as RepoSort)}>
        <SelectTrigger size="sm" className="min-w-40">
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
    </div>
  );
}
