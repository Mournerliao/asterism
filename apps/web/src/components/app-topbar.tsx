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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t('topbar.openMenu')}
          >
            <MenuIcon className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">{t('app.name')}</SheetTitle>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative w-full max-w-md">
        <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          className="px-9"
          placeholder={t('topbar.searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            type="button"
            aria-label={t('topbar.clearSearch')}
            className="-translate-y-1/2 absolute top-1/2 right-2 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setQuery('')}
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={sync.isPending}
          onClick={() => sync.mutate()}
        >
          <RefreshCwIcon className={cn('size-4', sync.isPending && 'animate-spin')} />
          <span className="hidden sm:inline">
            {sync.isPending ? t('sync.syncing') : t('topbar.sync')}
          </span>
        </Button>
        <LanguageToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
