import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/* ---------- Popover (anchored, click-outside to close) ---------- */
export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  align = 'start',
  className,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-2 min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Dialog (centered modal) ---------- */
export function Dialog({
  open,
  onClose,
  children,
  className,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-md rounded-lg border bg-card p-5 text-card-foreground shadow-xl',
          className,
        )}
      >
        {title ? (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-lg tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="关闭"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Sheet (right side panel) ---------- */
export function Sheet({
  open,
  onClose,
  children,
  className,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-200',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <button
        aria-label="close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l bg-card text-card-foreground shadow-2xl transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        {title ? (
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="min-w-0">{title}</div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="关闭"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
