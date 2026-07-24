import { cn } from '@asterism/ui';
import { useTranslation } from 'react-i18next';

/**
 * 「隐形混合搜索」里关键词命中与语义近邻之间的 hairline 分隔线 + 克制标签。
 * 视觉呈现，本身不承担语义角色；调用方（网格 div / 表格 tr）负责结构与 a11y 归属。
 */
export function SemanticSectionLabel({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center gap-3 text-caption text-muted-foreground', className)}>
      <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
      <span>{t('browse.semanticSectionLabel')}</span>
      <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
    </div>
  );
}
