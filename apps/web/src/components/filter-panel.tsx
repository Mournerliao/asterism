import { LanguageDot } from '@/components/repo-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_LANGUAGES, ALL_TOPICS } from '@/lib/mock-data';
import { TAG_COLOR_CLASSES, useStore } from '@/lib/store';
import type { ArchivedFilter, Filters } from '@/lib/use-repo-filters';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: Filters;
  update: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleInArray: (key: 'languages' | 'topics' | 'tagIds', value: string) => void;
  reset: () => void;
  activeCount: number;
}

const STAR_OPTIONS = [
  { label: '不限', value: 0 },
  { label: '10k+', value: 10000 },
  { label: '50k+', value: 50000 },
  { label: '100k+', value: 100000 },
];

const ARCHIVED_OPTIONS: { label: string; value: ArchivedFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '活跃', value: 'active' },
  { label: '已归档', value: 'archived' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

export function FilterPanel({
  filters,
  update,
  toggleInArray,
  reset,
  activeCount,
}: FilterPanelProps) {
  const { tags } = useStore();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">筛选</h2>
          {activeCount > 0 && (
            <Badge variant="secondary" className="rounded-full px-1.5">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-xs">
            清除
          </Button>
        )}
      </div>

      <Section title="编程语言">
        <div className="flex flex-col gap-2">
          {ALL_LANGUAGES.map((lang) => (
            <Label
              key={lang}
              className="flex cursor-pointer items-center gap-2 font-normal text-sm"
            >
              <Checkbox
                checked={filters.languages.includes(lang)}
                onCheckedChange={() => toggleInArray('languages', lang)}
              />
              <LanguageDot language={lang} />
              {lang}
            </Label>
          ))}
        </div>
      </Section>

      <Section title="标签">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const active = filters.tagIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleInArray('tagIds', t.id)}
                className={cn(
                  'rounded-sm px-2 py-0.5 font-medium text-xs transition-all',
                  active
                    ? TAG_COLOR_CLASSES[t.color]
                    : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  active && 'ring-1 ring-ring ring-offset-1 ring-offset-background',
                )}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Topic">
        <div className="flex flex-wrap gap-1.5">
          {ALL_TOPICS.slice(0, 14).map((topic) => {
            const active = filters.topics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleInArray('topics', topic)}
                className={cn(
                  'rounded-sm border px-2 py-0.5 text-xs transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent',
                )}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Star 数">
        <Select
          value={String(filters.minStars)}
          onValueChange={(v) => update('minStars', Number(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STAR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Section>

      <Section title="归档状态">
        <div className="flex gap-1.5">
          {ARCHIVED_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => update('archived', o.value)}
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors',
                filters.archived === o.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
