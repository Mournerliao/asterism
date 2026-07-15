import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@asterism/ui';
import { useTranslation } from 'react-i18next';
import { PendingActionContent } from './pending-action-content';

/** 通用确认对话框，用于删除等破坏性操作。 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" disabled={pending} aria-busy={pending} onClick={onConfirm}>
            <PendingActionContent
              pending={pending}
              idleLabel={confirmLabel}
              pendingLabel={t('common.deleting')}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
