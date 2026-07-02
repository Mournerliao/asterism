import { signOut } from '@asterism/db';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  cn,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  type Theme,
  useTheme,
} from '@asterism/ui';
import { LogOutIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../auth/use-session';
import { PageHeader } from '../components/page-header';
import { supabase } from '../lib/supabase';

const THEME_OPTIONS: { value: Theme; labelKey: string }[] = [
  { value: 'system', labelKey: 'theme.system' },
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' },
];

function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex flex-col gap-0.5">
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {control}
    </div>
  );
}

function SectionTitle({ children, badge }: { children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <h2 className="font-semibold text-base text-foreground">{children}</h2>
      {badge}
    </div>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { session } = useSession();
  const user = session?.user;
  const name =
    (user?.user_metadata?.user_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    '';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial = name.slice(0, 1).toUpperCase() || '?';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader title={t('settings.title')} />

      <section className="flex flex-col">
        <SectionTitle>{t('settings.appearance')}</SectionTitle>
        <SettingRow
          title={t('settings.theme')}
          description={t('settings.themeDescription')}
          control={
            <div className="inline-flex rounded-md border p-0.5">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'rounded px-3 py-1 text-sm transition-colors',
                    theme === option.value
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          }
        />
        <Separator />
        <SettingRow
          title={t('settings.language')}
          description={t('settings.languageDescription')}
          control={
            <Select
              value={i18n.resolvedLanguage}
              onValueChange={(value) => void i18n.changeLanguage(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh-CN">简体中文</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>{t('settings.account')}</SectionTitle>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-foreground text-sm">{name}</span>
              <span className="text-muted-foreground text-xs">{t('settings.connectedVia')}</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void signOut(supabase)}
          >
            <LogOutIcon className="size-4" />
            {t('auth.signOut')}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle badge={<Badge variant="secondary">{t('settings.comingSoon')}</Badge>}>
          {t('settings.aiFeatures')}
        </SectionTitle>
        <div className="flex flex-col gap-4 rounded-lg border p-4 opacity-60">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-provider">{t('settings.apiProvider')}</Label>
            <Input id="ai-provider" disabled placeholder={t('settings.apiProviderPlaceholder')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-key">{t('settings.apiKey')}</Label>
            <Input id="ai-key" type="password" disabled placeholder="sk-••••••••••••••••" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-endpoint">{t('settings.customEndpoint')}</Label>
            <Input id="ai-endpoint" disabled placeholder="https://api.openai.com/v1" />
          </div>
        </div>
      </section>
    </div>
  );
}
