import { cn } from '@asterism/ui';
import {
  ChartColumnIcon,
  DownloadIcon,
  FolderIcon,
  LayoutGridIcon,
  SettingsIcon,
  TagIcon,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { BrandLogo } from './brand-logo';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const NAV_ITEMS: { to: string; key: string; icon: IconType; end?: boolean }[] = [
  { to: '/', key: 'nav.browse', icon: LayoutGridIcon, end: true },
  { to: '/collections', key: 'nav.collections', icon: FolderIcon },
  { to: '/tags', key: 'nav.tags', icon: TagIcon },
  { to: '/dashboard', key: 'nav.dashboard', icon: ChartColumnIcon },
  { to: '/import-export', key: 'nav.importExport', icon: DownloadIcon },
  { to: '/settings', key: 'nav.settings', icon: SettingsIcon },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col gap-6 p-3">
      <div className="flex items-center gap-2 px-2 pt-2">
        <BrandLogo className="size-6 text-link" title={t('app.name')} />
        <span className="font-semibold text-foreground text-lg">{t('app.name')}</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {t(key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
