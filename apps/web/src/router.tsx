import { lazy, type ReactNode, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserRouter } from 'react-router-dom';
import { RequireAnon, RequireAuth } from './auth/guards';
import {
  CollectionDetailRouteLoading,
  CollectionsRouteLoading,
  DashboardRouteLoading,
  ImportExportRouteLoading,
  SettingsRouteLoading,
  TagsRouteLoading,
} from './components/page-loading-states';
import { AppLayout } from './layouts/app-layout';
import { BrowsePage } from './pages/browse';
import { LoginPage } from './pages/login';

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

type RouteLoadingKind =
  | 'collections'
  | 'collectionDetail'
  | 'tags'
  | 'dashboard'
  | 'importExport'
  | 'settings';

function PageFallback({ kind }: { kind: RouteLoadingKind }) {
  const { t } = useTranslation();
  const label = t('loading.page');

  switch (kind) {
    case 'collections':
      return <CollectionsRouteLoading label={label} />;
    case 'collectionDetail':
      return <CollectionDetailRouteLoading label={label} />;
    case 'tags':
      return <TagsRouteLoading label={label} />;
    case 'dashboard':
      return <DashboardRouteLoading label={label} />;
    case 'importExport':
      return <ImportExportRouteLoading label={label} />;
    case 'settings':
      return <SettingsRouteLoading label={label} />;
  }
}

function lazyPage(element: ReactNode, kind: RouteLoadingKind) {
  return <Suspense fallback={<PageFallback kind={kind} />}>{element}</Suspense>;
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
      { index: true, element: <BrowsePage /> },
      { path: 'collections', element: lazyPage(<CollectionsPage />, 'collections') },
      {
        path: 'collections/:id',
        element: lazyPage(<CollectionDetailPage />, 'collectionDetail'),
      },
      { path: 'tags', element: lazyPage(<TagsPage />, 'tags') },
      { path: 'dashboard', element: lazyPage(<DashboardPage />, 'dashboard') },
      {
        path: 'import-export',
        element: lazyPage(<ImportExportPage />, 'importExport'),
      },
      { path: 'settings', element: lazyPage(<SettingsPage />, 'settings') },
    ],
  },
]);
