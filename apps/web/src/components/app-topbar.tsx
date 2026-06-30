import { Button, Input, Sheet, SheetContent, SheetTitle, SheetTrigger } from '@asterism/ui';
import { MenuIcon, RefreshCwIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './language-toggle';
import { SidebarNav } from './sidebar-nav';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function AppTopbar() {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
        <Input className="pl-9" placeholder={t('topbar.searchPlaceholder')} />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCwIcon className="size-4" />
          <span className="hidden sm:inline">{t('topbar.sync')}</span>
        </Button>
        <LanguageToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
