import { Outlet } from 'react-router-dom';
import { AppTopbar } from '../components/app-topbar';
import { SidebarNav } from '../components/sidebar-nav';

export function AppLayout() {
  return (
    <div className="flex h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-border border-r lg:block">
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
