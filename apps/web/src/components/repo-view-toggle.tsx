import { SegmentedControl } from '@asterism/ui';
import { LayoutGrid, List } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RepoViewMode } from '../stores/browse-view';

const GRID_ICON = <LayoutGrid />;
const LIST_ICON = <List />;

/**
 * 视图切换：选中态本地乐观更新（仅重渲染本组件），再通知父级做 transition。
 * 父级 `committedView` 在 transition 完成后对齐，用于刷新后或外部同步。
 */
export const RepoViewToggle = memo(function RepoViewToggle({
  committedView,
  onSelect,
}: {
  committedView: RepoViewMode;
  onSelect: (view: RepoViewMode) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(committedView);

  useEffect(() => {
    setSelected(committedView);
  }, [committedView]);

  const handleSelect = (next: RepoViewMode) => {
    if (next === selected) {
      return;
    }
    setSelected(next);
    onSelect(next);
  };

  return (
    <SegmentedControl<RepoViewMode>
      value={selected}
      onValueChange={handleSelect}
      ariaLabel={t('browse.viewMode')}
      display="icon"
      size="sm"
      options={[
        { value: 'grid', label: t('browse.viewGrid'), icon: GRID_ICON },
        { value: 'list', label: t('browse.viewList'), icon: LIST_ICON },
      ]}
    />
  );
});
