import { Check, ChevronDown, ListFilter, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { allLanguages, allTopics, LANGUAGE_COLORS } from '@/data/mock';
import { useStore } from '@/data/store';
import { useI18n } from '@/i18n';
import {
  type ArchivedFilter,
  type FilterState,
  activeFilterCount,
  type UpdatedFilter,
} from '@/lib/filters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/overlays';
import { TagDot } from './tag-pill';

const STAR_OPTIONS = [0, 100, 1000, 10000, 50000];
const UPDATED_OPTIONS: UpdatedFilter[] = ['any', 'week', 'month', 'quarter', 'year', 'stale'];
const ARCHIVED_OPTIONS: ArchivedFilter[] = ['all', 'active', 'archived'];

function FilterMenu({
  label,
  count,
  children,
  align = 'start',
}: {
  label: string;
  count?: number;
  children: (close: () => void) => React.ReactNode;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={ref}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors hover:bg-accent',
          count ? 'border-ring/60 bg-accent/40' : 'border-input',
        )}
      >
        {label}
        {count ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {count}
          </span>
        ) : null}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align={align}>
        <div className="max-h-80 w-56 overflow-y-auto p-1">{children(() => setOpen(false))}</div>
      </Popover>
    </div>
  );
}

function CheckItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded border',
          active ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
      >
        {active ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const { t } = useI18n();
  const { tags } = useStore();
  const count = activeFilterCount(filters);

  const toggleArr = (key: 'languages' | 'topics' | 'tagIds', value: string) => {
    const arr = filters[key];
    onChange({
      ...filters,
      [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
        <ListFilter className="size-4" />
        {t('filter.title')}
      </span>

      <FilterMenu label={t('filter.language')} count={filters.languages.length}>
        {() =>
          allLanguages.map((lang) => (
            <CheckItem
              key={lang}
              active={filters.languages.includes(lang)}
              onClick={() => toggleArr('languages', lang)}
            >
              <span className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: LANGUAGE_COLORS[lang] ?? 'var(--muted-foreground)' }}
                />
                {lang}
              </span>
            </CheckItem>
          ))
        }
      </FilterMenu>

      <FilterMenu label={t('filter.topics')} count={filters.topics.length}>
        {() =>
          allTopics.map((topic) => (
            <CheckItem
              key={topic}
              active={filters.topics.includes(topic)}
              onClick={() => toggleArr('topics', topic)}
            >
              {topic}
            </CheckItem>
          ))
        }
      </FilterMenu>

      <FilterMenu label={t('repo.tags')} count={filters.tagIds.length}>
        {() =>
          tags.length ? (
            tags.map((tag) => (
              <CheckItem
                key={tag.id}
                active={filters.tagIds.includes(tag.id)}
                onClick={() => toggleArr('tagIds', tag.id)}
              >
                <span className="flex items-center gap-2">
                  <TagDot color={tag.color} />
                  {tag.name}
                </span>
              </CheckItem>
            ))
          ) : (
            <p className="px-2 py-1.5 text-muted-foreground text-sm">{t('tags.empty')}</p>
          )
        }
      </FilterMenu>

      <FilterMenu label={t('filter.stars')} count={filters.minStars > 0 ? 1 : 0}>
        {(close) => (
          <div className="p-1">
            {STAR_OPTIONS.map((min) => (
              <button
                key={min}
                onClick={() => {
                  onChange({ ...filters, minStars: min });
                  close();
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                  filters.minStars === min && 'bg-accent',
                )}
              >
                {min === 0 ? t('common.all') : `≥ ${min.toLocaleString()}`}
                {filters.minStars === min ? <Check className="size-3.5" /> : null}
              </button>
            ))}
          </div>
        )}
      </FilterMenu>

      <FilterMenu label={t('filter.updated')} count={filters.updated !== 'any' ? 1 : 0}>
        {(close) => (
          <div className="p-1">
            {UPDATED_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange({ ...filters, updated: opt });
                  close();
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                  filters.updated === opt && 'bg-accent',
                )}
              >
                {t(`filter.updated.${opt}`)}
                {filters.updated === opt ? <Check className="size-3.5" /> : null}
              </button>
            ))}
          </div>
        )}
      </FilterMenu>

      <FilterMenu label={t('filter.archived')} count={filters.archived !== 'all' ? 1 : 0}>
        {(close) => (
          <div className="p-1">
            {ARCHIVED_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange({ ...filters, archived: opt });
                  close();
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                  filters.archived === opt && 'bg-accent',
                )}
              >
                {t(`filter.archived.${opt}`)}
                {filters.archived === opt ? <Check className="size-3.5" /> : null}
              </button>
            ))}
          </div>
        )}
      </FilterMenu>

      {count > 0 ? (
        <>
          <Badge variant="muted" className="gap-1">
            {t('filter.activeCount', { count })}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                languages: [],
                topics: [],
                minStars: 0,
                archived: 'all',
                updated: 'any',
                tagIds: [],
              })
            }
          >
            <X className="size-3.5" />
            {t('filter.clear')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
