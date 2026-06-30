import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useSession } from './use-session';

function FullScreenLoader() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        {t('auth.loading')}
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();

  if (loading) {
    return <FullScreenLoader />;
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function RequireAnon({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();

  if (loading) {
    return <FullScreenLoader />;
  }
  if (session) {
    return <Navigate to="/" replace />;
  }
  return children;
}
