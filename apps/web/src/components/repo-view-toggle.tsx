import { SegmentedControl } from '@asterism/ui';
import { LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RepoViewMode } from '../stores/browse-view';
import { useBrowseView } from '../stores/browse-view';

export function RepoViewToggle() {
  const { t } = useTranslation();
  const view = useBrowseView((state) => state.view);
  const setView = useBrowseView((state) => state.setView);

  return (
    <SegmentedControl<RepoViewMode>
      value={view}
      onValueChange={setView}
      ariaLabel={t('browse.viewMode')}
      display="icon"
      size="sm"
      options={[
        { value: 'grid', label: t('browse.viewGrid'), icon: <LayoutGrid /> },
        { value: 'list', label: t('browse.viewList'), icon: <List /> },
      ]}
    />
  );
}
