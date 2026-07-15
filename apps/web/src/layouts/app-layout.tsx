import { Outlet } from 'react-router-dom';
import { AppTopbar } from '../components/app-topbar';
import { RepoInspector } from '../components/repo-inspector';
import { SidebarNav } from '../components/sidebar-nav';
import { RepoInspectorProvider } from '../contexts/repo-inspector-context';

export function AppLayout() {
  return (
    <RepoInspectorProvider>
      <AppLayoutContent />
    </RepoInspectorProvider>
  );
}

function AppLayoutContent() {
  return (
    <div className="asterism-glass-page flex h-svh">
      <aside className="hidden w-60 shrink-0 border-sidebar-border border-r bg-sidebar lg:block">
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="@container/main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-6">
          <Outlet />
        </main>
      </div>
      <RepoInspector />
    </div>
  );
}
