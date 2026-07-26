import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@asterism/ui';
import { LoaderCircleIcon, XIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarMapCluster } from '../data/use-star-map-clusters';

export interface PromotionReviewProps {
  cluster: StarMapCluster;
  /** repoId → owner/name for review display; falls back to the raw id. */
  repoNames: Map<string, string>;
  onConfirm: (name: string, repoIds: string[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

/**
 * Lightweight promotion review dialog: rename the cluster, remove repos, confirm.
 *
 * ADR 0026 §8: "promotion 由用户主动发起，进一个轻审阅态（改名、剔除个别 repo、确认写入）"
 */
export const PromotionReviewDialog = memo(function PromotionReviewDialog({
  cluster,
  repoNames,
  onConfirm,
  onCancel,
  isSubmitting,
}: PromotionReviewProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(cluster.name);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(
    () => new Set(cluster.repoIds),
  );

  const handleRemove = useCallback((repoId: string) => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      next.delete(repoId);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed || selectedRepoIds.size === 0) return;
    onConfirm(trimmed, Array.from(selectedRepoIds));
  }, [name, selectedRepoIds, onConfirm]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('promotion.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="promotion-name" className="text-caption font-medium text-foreground">
              {t('promotion.nameLabel')}
            </label>
            <Input
              id="promotion-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('promotion.namePlaceholder')}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-foreground">
              {t('promotion.reposLabel', { count: selectedRepoIds.size })}
            </span>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
              {cluster.repoIds.map((repoId) => {
                const isIncluded = selectedRepoIds.has(repoId);
                return (
                  <div
                    key={repoId}
                    className={`flex items-center justify-between rounded px-2 py-1 text-caption ${
                      isIncluded
                        ? 'text-foreground'
                        : 'text-muted-foreground line-through opacity-50'
                    }`}
                  >
                    <span className="truncate">{repoNames.get(repoId) ?? repoId}</span>
                    {isIncluded ? (
                      <button
                        type="button"
                        className="ml-2 flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleRemove(repoId)}
                        disabled={isSubmitting}
                        aria-label={t('promotion.removeRepo')}
                      >
                        <XIcon className="size-3" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            {t('promotion.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting || !name.trim() || selectedRepoIds.size === 0}
          >
            {isSubmitting ? <LoaderCircleIcon className="mr-1.5 size-3.5 animate-spin" /> : null}
            {t('promotion.confirm', { count: selectedRepoIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
