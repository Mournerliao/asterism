import { Archive, FolderGit2, Languages, Star, Tag as TagIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LANGUAGE_COLORS } from '@/data/mock';
import { repos, useStore } from '@/data/store';
import { useI18n } from '@/i18n';

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex size-10 items-center justify-center rounded-md bg-accent text-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="font-semibold text-2xl tabular-nums tracking-tight">{value}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5 text-card-foreground">
      <h3 className="mb-4 font-medium text-sm">{title}</h3>
      {children}
    </div>
  );
}

const CHART_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

export function DashboardPage() {
  const { t, locale } = useI18n();
  const { tags, collections, repoTags, notes } = useStore();

  const stats = useMemo(() => {
    const byLanguage: Record<string, number> = {};
    const byTopic: Record<string, number> = {};
    const byYear: Record<string, number> = {};
    let archived = 0;

    for (const r of repos) {
      byLanguage[r.language] = (byLanguage[r.language] ?? 0) + 1;
      for (const topic of r.topics) byTopic[topic] = (byTopic[topic] ?? 0) + 1;
      const year = new Date(r.starredAt).getFullYear().toString();
      byYear[year] = (byYear[year] ?? 0) + 1;
      if (r.archived) archived += 1;
    }

    const languageData = Object.entries(byLanguage)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const topicData = Object.entries(byTopic)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const trendData = Object.entries(byYear)
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const tagData = tags
      .map((tag) => ({
        name: tag.name,
        value: Object.values(repoTags).filter((ids) => ids.includes(tag.id)).length,
        color: tag.color,
      }))
      .filter((d) => d.value > 0);

    const taggedRepos = Object.values(repoTags).filter((ids) => ids.length > 0).length;

    return {
      languageData,
      topicData,
      trendData,
      tagData,
      archived,
      active: repos.length - archived,
      taggedRepos,
      languages: Object.keys(byLanguage).length,
    };
  }, [tags, repoTags]);

  const activeRatio = [
    { name: t('dashboard.active'), value: stats.active, color: 'chart-2' },
    { name: t('repo.archived'), value: stats.archived, color: 'chart-4' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6">
          <h1 className="font-semibold text-xl tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('dashboard.subtitle')}</p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Star} label={t('dashboard.total')} value={repos.length} />
          <StatCard icon={Languages} label={t('dashboard.languages')} value={stats.languages} />
          <StatCard icon={TagIcon} label={t('dashboard.taggedRepos')} value={stats.taggedRepos} />
          <StatCard
            icon={FolderGit2}
            label={t('dashboard.collectionsCount')}
            value={collections.length}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t('dashboard.byLanguage')}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.languageData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--accent)' }}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.languageData.map((entry) => (
                    <Cell key={entry.name} fill={LANGUAGE_COLORS[entry.name] ?? 'var(--chart-1)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('dashboard.starsOverTime')}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.trendData} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="starGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#starGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('dashboard.byTopic')}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.topicData} margin={{ left: -16, right: 8 }}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={64}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--accent)' }}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Bar dataKey="value" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('dashboard.archivedRatio')}>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={activeRatio}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {activeRatio.map((entry) => (
                      <Cell key={entry.name} fill={`var(--${entry.color})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--popover-foreground)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {activeRatio.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-3 rounded-sm"
                      style={{ backgroundColor: `var(--${entry.color})` }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-medium tabular-nums">{entry.value}</span>
                  </div>
                ))}
                {stats.tagData.length > 0 ? (
                  <div className="border-t pt-3">
                    <div className="mb-2 flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Archive className="size-3" />
                      {t('dashboard.byTag')}
                    </div>
                    {stats.tagData.slice(0, 5).map((tag, i) => (
                      <div key={tag.name} className="flex items-center gap-2 py-0.5 text-sm">
                        <span
                          className="size-2.5 rounded-full"
                          style={{
                            backgroundColor: `var(--${tag.color ?? CHART_TOKENS[i % CHART_TOKENS.length]})`,
                          }}
                        />
                        <span className="flex-1 truncate text-muted-foreground">{tag.name}</span>
                        <span className="font-medium tabular-nums">{tag.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </ChartCard>
        </div>

        <p className="mt-4 text-center text-muted-foreground text-xs">
          {locale === 'zh-CN'
            ? `共 ${Object.keys(notes).length} 条笔记 · 数据为原型 mock`
            : `${Object.keys(notes).length} notes · prototype mock data`}
        </p>
      </div>
    </div>
  );
}
