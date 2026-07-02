import { ToggleGroup, ToggleGroupItem } from '@asterism/ui';
import { LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrowseView } from '../stores/browse-view';

export function RepoViewToggle() {
  const { t } = useTranslation();
  const view = useBrowseView((state) => state.view);
  const setView = useBrowseView((state) => state.setView);

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={view}
      onValueChange={(value) => {
        if (value) setView(value as 'grid' | 'list');
      }}
      aria-label={t('browse.viewGrid')}
    >
      <ToggleGroupItem value="grid" aria-label={t('browse.viewGrid')}>
        <LayoutGrid />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label={t('browse.viewList')}>
        <List />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
