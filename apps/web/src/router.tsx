import { createBrowserRouter } from 'react-router-dom';
import { RequireAnon, RequireAuth } from './auth/guards';
import { AppLayout } from './layouts/app-layout';
import { BrowsePage } from './pages/browse';
import { CollectionsPage } from './pages/collections';
import { DashboardPage } from './pages/dashboard';
import { ImportExportPage } from './pages/import-export';
import { LoginPage } from './pages/login';
import { SettingsPage } from './pages/settings';
import { TagsPage } from './pages/tags';

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
      { path: 'collections', element: <CollectionsPage /> },
      { path: 'tags', element: <TagsPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'import-export', element: <ImportExportPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
