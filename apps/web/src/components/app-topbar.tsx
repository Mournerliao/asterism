import {
  Button,
  cn,
  Input,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@asterism/ui';
import { LoaderCircleIcon, MenuIcon, RefreshCwIcon, UnplugIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSyncStars } from '../data/use-sync-stars';
import { useBrowseFilters } from '../stores/browse-filters';
import { LanguageToggle } from './language-toggle';
import { SearchInputIcon } from './search-input-icon';
import { SidebarNav } from './sidebar-nav';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function AppTopbar() {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sync = useSyncStars();
  const query = useBrowseFilters((state) => state.query);
  const setQuery = useBrowseFilters((state) => state.setQuery);
  const syncPending = sync.requiresReconnect ? sync.reconnectPending : sync.isPending;
  const syncLabel = sync.requiresReconnect
    ? sync.reconnectPending
      ? t('sync.reconnecting')
      : t('sync.reconnectAction')
    : sync.isPending
      ? t('sync.syncing')
      : t('topbar.sync');

  return (
    <header className="asterism-glass-surface z-40 flex h-14 shrink-0 items-center gap-3 border-b px-6 py-3">
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
        <SearchInputIcon className="left-2.5" />
        <Input
          className="h-8 px-9"
          aria-label={t('topbar.searchPlaceholder')}
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className={cn(
                'h-8 gap-1.5 px-3 text-[13px]',
                sync.requiresReconnect &&
                  'border-warning/35 bg-warning/5 hover:border-warning/50 hover:bg-warning/10',
              )}
              aria-label={syncLabel}
              disabled={syncPending}
              onClick={sync.sync}
            >
              {sync.requiresReconnect ? (
                sync.reconnectPending ? (
                  <LoaderCircleIcon className="size-3.5 animate-spin text-warning motion-reduce:animate-none" />
                ) : (
                  <UnplugIcon className="size-3.5 text-warning" />
                )
              ) : (
                <RefreshCwIcon
                  className={cn(
                    'size-3.5',
                    sync.isPending && 'animate-spin motion-reduce:animate-none',
                  )}
                />
              )}
              <span className="hidden sm:inline">{syncLabel}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="max-w-none whitespace-nowrap">
            {sync.requiresReconnect ? t('sync.reconnectDescription') : syncLabel}
          </TooltipContent>
        </Tooltip>
        <LanguageToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
