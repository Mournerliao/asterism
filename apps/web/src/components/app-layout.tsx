import { BarChart3, LibraryBig, Settings, Sparkles, Star, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { LanguageToggle, ThemeToggle } from '@/components/top-controls';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { COLLECTIONS, REPOS } from '@/lib/mock-data';

const NAV_ITEMS = [
  { key: 'browse', to: '/app', icon: LibraryBig, exact: true },
  { key: 'collections', to: '/app/collections', icon: Tags, exact: false },
  { key: 'dashboard', to: '/app/insights', icon: BarChart3, exact: false },
  { key: 'settings', to: '/app/settings', icon: Settings, exact: false },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <Link to="/app" className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Logo />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-sm">Asterism</span>
              <span className="text-muted-foreground text-xs">{t('nav.library')}</span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive(item.to, item.exact)}>
                      <Link to={item.to}>
                        <item.icon />
                        <span>{t(`nav.${item.key}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t('common.collections')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {COLLECTIONS.map((c) => {
                  const count = REPOS.filter((r) => r.collectionIds.includes(c.id)).length;
                  return (
                    <SidebarMenuItem key={c.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === `/app/collections/${c.id}`}
                      >
                        <Link to={`/app/collections/${c.id}`}>
                          <Star />
                          <span className="truncate">{c.name}</span>
                          <span className="ml-auto text-muted-foreground text-xs">{count}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <Avatar className="size-8">
              <AvatarImage src="/avatar.png" alt="用户头像" />
              <AvatarFallback>ML</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-medium text-sm">mournerliao</span>
              <span className="truncate text-muted-foreground text-xs">{REPOS.length} stars</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Sparkles className="size-3.5" />
            <span>{t('app.tagline')}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/">登出</Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
