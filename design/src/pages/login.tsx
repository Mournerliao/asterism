import { Check, Github, Sparkles } from 'lucide-react';
import { useAppState } from '@/app/app-state';
import { LanguageToggle, ThemeToggle } from '@/components/app/controls';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

export function LoginPage() {
  const { signIn } = useAppState();
  const { t } = useI18n();

  const features = [
    t('login.feature1'),
    t('login.feature2'),
    t('login.feature3'),
    t('login.feature4'),
  ];

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-4xl items-center gap-10 lg:grid-cols-2">
          {/* Brand / value props */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h1 className="font-semibold text-2xl tracking-tight">{t('login.title')}</h1>
                <p className="text-muted-foreground text-sm">{t('login.tagline')}</p>
              </div>
            </div>

            <ul className="flex flex-col gap-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-chart-2" />
                  <span className="text-pretty text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sign-in card */}
          <div className="rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-lg tracking-tight">{t('login.signIn')}</h2>
              <p className="text-muted-foreground text-sm">{t('login.privacy')}</p>
            </div>

            <Button className="mt-6 w-full" size="lg" onClick={signIn}>
              <Github className="size-4" />
              {t('login.signIn')}
            </Button>

            <p className="mt-4 text-balance text-center text-muted-foreground text-xs leading-relaxed">
              {t('login.demoNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
