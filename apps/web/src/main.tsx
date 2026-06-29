import './index.css';
import './i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './components/app-layout';
import { Toaster } from './components/ui/sonner';
import { StoreProvider } from './lib/store';
import { ThemeProvider } from './lib/theme';
import { BrowsePage } from './pages/browse';
import { CollectionDetailPage } from './pages/collection-detail';
import { CollectionsPage } from './pages/collections';
import { InsightsPage } from './pages/insights';
import { LoginPage } from './pages/login';
import { RepoDetailPage } from './pages/repo-detail';
import { SettingsPage } from './pages/settings';

function withLayout(node: React.ReactNode) {
  return <AppLayout>{node}</AppLayout>;
}

const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/app', element: withLayout(<BrowsePage />) },
  { path: '/app/collections', element: withLayout(<CollectionsPage />) },
  { path: '/app/collections/:id', element: withLayout(<CollectionDetailPage />) },
  { path: '/app/repo/:id', element: withLayout(<RepoDetailPage />) },
  { path: '/app/insights', element: withLayout(<InsightsPage />) },
  { path: '/app/settings', element: withLayout(<SettingsPage />) },
]);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <StoreProvider>
        <RouterProvider router={router} />
        <Toaster />
      </StoreProvider>
    </ThemeProvider>
  </StrictMode>,
);
