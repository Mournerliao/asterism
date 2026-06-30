import { cn } from '@asterism/ui';
import { XIcon } from 'lucide-react';

/** 标签胶囊：色点 + 名称，可选移除按钮；配色经边框/色点呈现，保证两套主题对比度。 */
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

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs',
        className,
      )}
      style={color ? { borderColor: `${color}66` } : undefined}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="font-medium text-foreground">{name}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="-mr-1 flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
