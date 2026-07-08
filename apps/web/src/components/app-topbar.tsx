import { Button, cn, Input, Sheet, SheetContent, SheetTitle, SheetTrigger } from '@asterism/ui';
import { MenuIcon, RefreshCwIcon, SearchIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSyncStars } from '../data/use-sync-stars';
import { useBrowseFilters } from '../stores/browse-filters';
import { LanguageToggle } from './language-toggle';
import { SidebarNav } from './sidebar-nav';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function AppTopbar() {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sync = useSyncStars();
  const query = useBrowseFilters((state) => state.query);
  const setQuery = useBrowseFilters((state) => state.setQuery);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-6 py-3">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label={t('topbar.openMenu')}
          >
            <MenuIcon className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 bg-sidebar p-0">
          <SheetTitle className="sr-only">{t('app.name')}</SheetTitle>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative w-full max-w-[400px]">
        <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
        <Input
          className="h-8 bg-card px-9"
          placeholder={t('topbar.searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('topbar.clearSearch')}
            className="-translate-y-1/2 absolute top-1/2 right-2 size-6 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setQuery('')}
          >
            <XIcon className="size-4" />
          </Button>
        ) : (
          <kbd className="-translate-y-1/2 absolute top-1/2 right-2 flex h-5 items-center rounded-sm bg-background px-1.5 font-mono text-[11px] text-muted-foreground">
            /
          </kbd>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {sync.requiresReconnect ? null : (
          <Button
            variant="outline"
            size="xs"
            className="h-8 gap-1.5 px-3 text-[13px]"
            disabled={sync.isPending}
            onClick={sync.sync}
          >
            <RefreshCwIcon className={cn('size-3.5', sync.isPending && 'animate-spin')} />
            <span className="hidden sm:inline">
              {sync.isPending ? t('sync.syncing') : t('topbar.sync')}
            </span>
          </Button>
        )}
        <LanguageToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
