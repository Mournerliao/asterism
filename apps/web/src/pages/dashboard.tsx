import { ChartColumnIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title={t('dashboard.title')} />
      <EmptyState
        icon={ChartColumnIcon}
        title={t('dashboard.title')}
        description={t('dashboard.comingSoon')}
      />
    </div>
  );
}
