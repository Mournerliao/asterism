import { TagIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';

export function TagsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title={t('tags.title')} />
      <EmptyState icon={TagIcon} title={t('tags.title')} description={t('tags.comingSoon')} />
    </div>
  );
}
