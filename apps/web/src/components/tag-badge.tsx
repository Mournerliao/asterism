import type { Tag } from '@asterism/core';
import { cn } from '@asterism/ui';
import { XIcon } from 'lucide-react';

function tagBg(color: string): string {
  return `${color}1a`;
}

/** 标签色块 pill，对齐设计稿 4px 圆角半透明底。 */
export function TagBadge({
  name,
  color,
  onRemove,
  removeLabel,
  className,
}: {
  name: string;
  color?: string | null;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}) {
  const dotColor = color ?? 'var(--muted-foreground)';
  const bg = color ? tagBg(color) : 'var(--accent)';

  return (
    <span
      className={cn('inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-caption', className)}
      style={{ backgroundColor: bg }}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="font-medium text-foreground">{name}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function TagPill({ tag }: { tag: Tag }) {
  const color = tag.color ?? 'var(--muted-foreground)';
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-sm px-2 text-caption font-medium text-foreground"
      style={{ backgroundColor: tagBg(color) }}
    >
      {tag.name}
    </span>
  );
}
