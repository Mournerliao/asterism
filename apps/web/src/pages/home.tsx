import { CORE_VERSION } from '@asterism/core';
import { createSupabaseClient } from '@asterism/db';
import { Button } from '@asterism/ui';
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t, i18n } = useTranslation();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  function toggleLanguage() {
    void i18n.changeLanguage(i18n.resolvedLanguage === 'zh-CN' ? 'en' : 'zh-CN');
  }

  function probeSupabase() {
    if (!supabaseUrl || !supabaseAnonKey) {
      return;
    }
    // 仅用于验证依赖图打通：构造客户端本身不会发起网络请求。
    createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-4xl tracking-tight">{t('app.name')}</h1>
        <p className="text-muted-foreground text-lg">{t('app.tagline')}</p>
      </header>

      <dl className="flex flex-col gap-1 text-muted-foreground text-sm">
        <dd>{t('app.coreVersion', { version: CORE_VERSION })}</dd>
        <dd>{supabaseConfigured ? t('app.supabaseConfigured') : t('app.supabaseNotConfigured')}</dd>
      </dl>

      <div className="flex flex-wrap gap-3">
        <Button onClick={toggleLanguage}>{t('actions.toggleLanguage')}</Button>
        <Button variant="outline" disabled={!supabaseConfigured} onClick={probeSupabase}>
          {t('actions.probeSupabase')}
        </Button>
      </div>
    </main>
  );
}
