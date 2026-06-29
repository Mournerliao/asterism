import { CORE_VERSION } from '@asterism/core';
import { signInWithGitHub, signOut } from '@asterism/db';
import { Button } from '@asterism/ui';
import { useTranslation } from 'react-i18next';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { session, loading } = useSession();

  function toggleLanguage() {
    void i18n.changeLanguage(i18n.resolvedLanguage === 'zh-CN' ? 'en' : 'zh-CN');
  }

  function handleSignIn() {
    void signInWithGitHub(supabase, window.location.origin);
  }

  function handleSignOut() {
    void signOut(supabase);
  }

  const user = session?.user;
  const displayName =
    user?.email ?? (user?.user_metadata.user_name as string | undefined) ?? user?.id ?? '';

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-4xl tracking-tight">{t('app.name')}</h1>
        <p className="text-muted-foreground text-lg">{t('app.tagline')}</p>
      </header>

      <section className="flex flex-col gap-3">
        {loading ? (
          <p className="text-muted-foreground text-sm">{t('auth.loading')}</p>
        ) : session ? (
          <>
            <p className="text-sm">{t('auth.signedInAs', { name: displayName })}</p>
            <div>
              <Button variant="outline" onClick={handleSignOut}>
                {t('auth.signOut')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">{t('auth.signedOut')}</p>
            <div>
              <Button onClick={handleSignIn}>{t('auth.signInWithGitHub')}</Button>
            </div>
          </>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-border border-t pt-4">
        <p className="text-muted-foreground text-sm">
          {t('app.coreVersion', { version: CORE_VERSION })}
        </p>
        <Button variant="ghost" size="sm" onClick={toggleLanguage}>
          {t('actions.toggleLanguage')}
        </Button>
      </footer>
    </main>
  );
}
