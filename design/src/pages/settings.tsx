import { LogOut, Monitor, Moon, Sparkles, Sun } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '@/app/app-state';
import { Button } from '@/components/ui/button';
import { Badge, Input, Label, Separator } from '@/components/ui/primitives';
import { type Locale, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { type Theme, useTheme } from '@/theme/theme-provider';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <h2 className="font-medium">{title}</h2>
      {description ? <p className="mt-0.5 text-muted-foreground text-sm">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, signOut, lastSyncedAt } = useAppState();
  const [aiKey, setAiKey] = useState('');

  const themeOptions: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: 'system', label: t('settings.theme.system'), icon: Monitor },
    { value: 'light', label: t('settings.theme.light'), icon: Sun },
    { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
  ];

  const localeOptions: Array<{ value: Locale; label: string }> = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <div>
          <h1 className="font-semibold text-xl tracking-tight">{t('settings.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('settings.subtitle')}</p>
        </div>

        <Section title={t('settings.appearance')}>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t('settings.theme')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setTheme(o.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-md border p-3 text-sm transition-colors',
                      theme === o.value ? 'border-ring bg-accent/50' : 'hover:bg-accent/40',
                    )}
                  >
                    <o.icon className="size-4 text-muted-foreground" />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <Label className="mb-2 block">{t('settings.language')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {localeOptions.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setLocale(o.value)}
                    className={cn(
                      'rounded-md border p-2.5 text-sm transition-colors',
                      locale === o.value ? 'border-ring bg-accent/50' : 'hover:bg-accent/40',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title={t('settings.account')}>
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-full font-medium text-primary-foreground"
              style={{ background: user.avatarColor }}
            >
              {user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{t('settings.connectedAs')}</div>
              <div className="text-muted-foreground text-sm">@{user.login}</div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              {t('settings.signOut')}
            </Button>
          </div>
          {lastSyncedAt ? (
            <p className="mt-3 text-muted-foreground text-xs">
              {t('sync.lastSynced', { time: new Date(lastSyncedAt).toLocaleString() })}
            </p>
          ) : null}
        </Section>

        <Section title={t('settings.ai')} description={t('settings.aiDesc')}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="muted" className="gap-1">
                <Sparkles className="size-3" />
                {t('settings.comingSoon')}
              </Badge>
            </div>
            <div className="space-y-1.5 opacity-70">
              <Label htmlFor="ai-key">{t('settings.aiKey')}</Label>
              <Input
                id="ai-key"
                type="password"
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                placeholder={t('settings.aiKeyPlaceholder')}
                disabled
              />
            </div>
            <div className="space-y-1.5 opacity-70">
              <Label htmlFor="ai-url">{t('settings.aiBaseUrl')}</Label>
              <Input id="ai-url" placeholder="https://api.openai.com/v1" disabled />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
