import { Check, Languages, Monitor, Moon, Sun } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/overlays';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { type Theme, useTheme } from '@/theme/theme-provider';

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: 'system', label: t('settings.theme.system'), icon: Monitor },
    { value: 'light', label: t('settings.theme.light'), icon: Sun },
    { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
  ];

  return (
    <div className="relative">
      <Button
        ref={ref}
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('settings.theme')}
      >
        {resolved === 'dark' ? <Moon /> : <Sun />}
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align="end">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => {
              setTheme(o.value);
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
              theme === o.value && 'font-medium',
            )}
          >
            <o.icon className="size-4 text-muted-foreground" />
            <span className="flex-1 text-left">{o.label}</span>
            {theme === o.value ? <Check className="size-4" /> : null}
          </button>
        ))}
      </Popover>
    </div>
  );
}

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')}
      aria-label={t('actions.toggleLanguage')}
      title={t('actions.toggleLanguage')}
    >
      <Languages />
    </Button>
  );
}
