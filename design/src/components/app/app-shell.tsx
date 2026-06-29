import {
  BarChart3,
  FolderGit2,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  Star,
  Tag as TagIcon,
  Upload,
  X,
} from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppState } from '@/app/app-state';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/overlays';
import { Input } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { LanguageToggle, ThemeToggle } from './controls';
import { SyncBanner, SyncButton } from './sync-indicator';

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof Star;
}

const SECTIONS: Array<{ titleKey: string; items: NavItem[] }> = [
  {
    titleKey: 'nav.section.library',
    items: [
      { to: '/browse', labelKey: 'nav.browse', icon: Star },
      { to: '/collections', labelKey: 'nav.collections', icon: FolderGit2 },
      { to: '/tags', labelKey: 'nav.tags', icon: TagIcon },
    ],
  },
  {
    titleKey: 'nav.section.insights',
    items: [{ to: '/dashboard', labelKey: 'nav.dashboard', icon: BarChart3 }],
  },
  {
    titleKey: 'nav.section.system',
    items: [
      { to: '/import-export', labelKey: 'nav.importExport', icon: Upload },
      { to: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">{t('app.name')}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {SECTIONS.map((section) => (
          <div key={section.titleKey}>
            <div className="px-2 pb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              {t(section.titleKey)}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-2.5 py-2 font-medium text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )
                  }
                >
                  <item.icon className="size-4" />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 text-muted-foreground text-xs">
        {t('app.tagline')}
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAppState();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        ref={ref}
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-full font-medium text-primary-foreground text-sm"
        style={{ background: user.avatarColor }}
        aria-label={t('settings.account')}
      >
        {user.name.charAt(0)}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align="end">
        <div className="px-2 py-1.5">
          <div className="font-medium text-sm">{user.name}</div>
          <div className="text-muted-foreground text-xs">@{user.login}</div>
        </div>
        <div className="my-1 h-px bg-border" />
        <button
          onClick={() => {
            setOpen(false);
            navigate('/settings');
          }}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
        >
          <Settings className="size-4 text-muted-foreground" />
          {t('nav.settings')}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            signOut();
          }}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-destructive text-sm hover:bg-accent"
        >
          <LogOut className="size-4" />
          {t('settings.signOut')}
        </button>
      </Popover>
    </div>
  );
}

export function AppShell({
  children,
  search,
  onSearchChange,
}: {
  children: ReactNode;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileNav ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNav(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r shadow-xl">
            <button
              onClick={() => setMobileNav(false)}
              className="absolute top-4 right-3 rounded-md p-1 text-muted-foreground hover:bg-accent"
              aria-label="关闭"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="菜单"
          >
            <Menu />
          </Button>

          <div className="relative flex-1 max-w-xl">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('topbar.search')}
              className="pl-9"
              aria-label={t('common.search')}
            />
          </div>

          <div className="flex items-center gap-1">
            <SyncButton />
            <LanguageToggle />
            <ThemeToggle />
            <div className="mx-1 h-6 w-px bg-border" />
            <UserMenu />
          </div>
        </header>

        <SyncBanner />

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
