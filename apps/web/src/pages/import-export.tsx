import { DownloadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';

export function ImportExportPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title={t('importExport.title')} />
      <EmptyState
        icon={DownloadIcon}
        title={t('importExport.title')}
        description={t('importExport.comingSoon')}
      />
    </div>
  );
}
