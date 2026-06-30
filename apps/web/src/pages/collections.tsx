import { FolderIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';

export function CollectionsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title={t('collections.title')} />
      <EmptyState
        icon={FolderIcon}
        title={t('collections.title')}
        description={t('collections.comingSoon')}
      />
    </div>
  );
}
