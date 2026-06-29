import { createContext, useContext, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppStateProvider, useAppState } from '@/app/app-state';
import { AppShell } from '@/components/app/app-shell';
import { StoreProvider } from '@/data/store';
import { I18nProvider } from '@/i18n';
import { BrowsePage } from '@/pages/browse';
import { CollectionDetailPage } from '@/pages/collection-detail';
import { CollectionsPage } from '@/pages/collections';
import { DashboardPage } from '@/pages/dashboard';
import { ImportExportPage } from '@/pages/import-export';
import { LoginPage } from '@/pages/login';
import { SettingsPage } from '@/pages/settings';
import { TagsPage } from '@/pages/tags';
import { ThemeProvider } from '@/theme/theme-provider';

const SearchContext = createContext<{ search: string }>({ search: '' });
export const useSearch = () => useContext(SearchContext).search;

function AuthedApp() {
  const [search, setSearch] = useState('');
  return (
    <SearchContext.Provider value={{ search }}>
      <AppShell search={search} onSearchChange={setSearch}>
        <Routes>
          <Route path="/" element={<Navigate to="/browse" replace />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:id" element={<CollectionDetailPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/import-export" element={<ImportExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/browse" replace />} />
        </Routes>
      </AppShell>
    </SearchContext.Provider>
  );
}

function Gate() {
  const { signedIn } = useAppState();
  return signedIn ? <AuthedApp /> : <LoginPage />;
}

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppStateProvider>
          <StoreProvider>
            <Gate />
          </StoreProvider>
        </AppStateProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
