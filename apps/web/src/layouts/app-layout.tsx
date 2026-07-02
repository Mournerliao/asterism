import { Outlet } from 'react-router-dom';
import { AppTopbar } from '../components/app-topbar';
import { RepoDetailDrawer } from '../components/repo-detail-drawer';
import { SidebarNav } from '../components/sidebar-nav';

export function AppLayout() {
  return (
    <div className="flex h-svh bg-background">
      <aside className="hidden w-60 shrink-0 border-border border-r bg-sidebar lg:block">
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      <RepoDetailDrawer />
    </div>
  );
}
