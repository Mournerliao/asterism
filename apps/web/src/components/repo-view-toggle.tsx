import { Button, cn } from '@asterism/ui';
import { LayoutGridIcon, ListIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrowseView } from '../stores/browse-view';

export function RepoViewToggle() {
  const { t } = useTranslation();
  const view = useBrowseView((state) => state.view);
  const setView = useBrowseView((state) => state.setView);

  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={t('browse.viewGrid')}
        aria-pressed={view === 'grid'}
        className={cn('size-7', view === 'grid' && 'bg-accent text-accent-foreground')}
        onClick={() => setView('grid')}
      >
        <LayoutGridIcon className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={t('browse.viewList')}
        aria-pressed={view === 'list'}
        className={cn('size-7', view === 'list' && 'bg-accent text-accent-foreground')}
        onClick={() => setView('list')}
      >
        <ListIcon className="size-4" />
      </Button>
    </div>
  );
}
