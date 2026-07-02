import { Skeleton } from '@asterism/ui';
import { lazy, type ReactNode, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RequireAnon, RequireAuth } from './auth/guards';
import { AppLayout } from './layouts/app-layout';
import { LoginPage } from './pages/login';

const BrowsePage = lazy(() =>
  import('./pages/browse').then((module) => ({ default: module.BrowsePage })),
);
const CollectionsPage = lazy(() =>
  import('./pages/collections').then((module) => ({ default: module.CollectionsPage })),
);
const CollectionDetailPage = lazy(() =>
  import('./pages/collection-detail').then((module) => ({
    default: module.CollectionDetailPage,
  })),
);
const TagsPage = lazy(() =>
  import('./pages/tags').then((module) => ({ default: module.TagsPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/dashboard').then((module) => ({ default: module.DashboardPage })),
);
const ImportExportPage = lazy(() =>
  import('./pages/import-export').then((module) => ({ default: module.ImportExportPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/settings').then((module) => ({ default: module.SettingsPage })),
);

function PageFallback() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-1">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function lazyPage(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RequireAnon>
        <LoginPage />
      </RequireAnon>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: lazyPage(<BrowsePage />) },
      { path: 'collections', element: lazyPage(<CollectionsPage />) },
      { path: 'collections/:id', element: lazyPage(<CollectionDetailPage />) },
      { path: 'tags', element: lazyPage(<TagsPage />) },
      { path: 'dashboard', element: lazyPage(<DashboardPage />) },
      { path: 'import-export', element: lazyPage(<ImportExportPage />) },
      { path: 'settings', element: lazyPage(<SettingsPage />) },
    ],
  },
]);
