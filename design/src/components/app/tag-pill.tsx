import type { Tag } from '@/data/mock';
import { cn } from '@/lib/utils';

/** Small colored dot for a tag's chart-token color. */
export function TagDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: `var(--${color})` }}
    />
  );
}

export function TagPill({
  tag,
  onRemove,
  className,
}: {
  tag: Tag;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <TagDot color={tag.color} />
      {tag.name}
      {onRemove ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 text-muted-foreground hover:text-foreground"
          aria-label={`remove ${tag.name}`}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
