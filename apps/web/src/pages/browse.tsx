import { LayoutGridIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';

export function BrowsePage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title={t('browse.title')} />
      <EmptyState
        icon={LayoutGridIcon}
        title={t('browse.emptyTitle')}
        description={t('browse.emptyDescription')}
      />
    </div>
  );
}
