import { GripVerticalIcon, LoaderCircleIcon, RotateCcwIcon } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface CollectionDialViewTarget {
  id: string;
  name: string;
}

export type CollectionDialViewStatus =
  | 'ready'
  | 'submitting'
  | 'retryable_failure'
  | 'terminal_failure'
  | 'success';

export interface CollectionDialCopy {
  label: string;
  placement: (repo: string, collection: string) => string;
  position: (current: number, total: number) => string;
  selectCollection: (collection: string) => string;
  confirm: (collection: string) => string;
  cancel: string;
  retry: string;
  done?: string;
  readyStatus: string;
  submittingStatus: string;
  successStatus: string;
  keyboardHint: string;
}

function visibleTargetCount(width: number): 3 | 5 | 7 {
  if (width >= 1120) return 7;
  if (width >= 560) return 5;
  return 3;
}

function FolderArtwork({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className="size-full" role="presentation">
      {open ? (
        <g transform="translate(12 79.65) scale(.375556) translate(-349.674 -530.408)">
          <path
            fill="var(--info)"
            d="M562.099 812.563v-21.096c0-31.16 25.26-56.42 56.42-56.42h781.401c31.16 0 56.42 25.26 56.42 56.42v141.311h72.76c15.77 0 30.49 2.439 43.76 6.899V757.958c0-62.411-50.58-113-113-113H989.089c-16.01 0-31.6-5.09-44.54-14.5l-106.99-76.92c-21.08-15.05-46.35-23.13-72.25-23.13h-206.73c-62.42 0-113 50.59-113 113v171.913a155.93 155.93 0 0 1 28.246-2.758h88.274Z"
          />
          <path
            fill="var(--glass-indicator-border)"
            d="M1572.85 939.683a137.81 137.81 0 0 0-43.76-6.901H985.984c-18.46 0-36.529-5.199-51.65-14.829l-127.845-80.536c-25.78-16.129-56.28-24.85-87.05-24.85h-245.61c-9.85 0-19.3.95-28.25 2.761h-.004c-58.461 11.77-95.901 59.79-86.861 115.875l32.33 200.397.471 2.93 49.409 239.75c2.58 52.83 55.23 95.31 117.651 95.31 778.775-43.8 1082.815-424.85 1082.815-424.85 7.69-47.688-21.21-89.177-68.54-105.057Z"
          />
          <path
            fill="var(--glass-indicator-bg)"
            d="M1399.92 735.047H618.519c-31.16 0-56.42 25.26-56.42 56.42v21.096h157.336c30.77 0 61.27 8.719 87.049 24.85l127.855 80.535c15.12 9.639 33.19 14.83 51.65 14.83h470.351V791.467c0-31.16-25.26-56.42-56.42-56.42Z"
          />
          <path
            fill="color-mix(in oklch, var(--info) 62%, var(--glass-indicator-bg))"
            d="M558.575 1469.59h901.275c62.42 0 115.07-42.48 117.65-95.31l49.41-239.75.47-2.93 14.01-86.86s-304.04 381.05-1082.815 424.85Z"
          />
        </g>
      ) : (
        <g transform="translate(12 45.65) scale(.42166) translate(-421.322 -501.16)">
          <path
            fill="var(--info)"
            d="M537.338 501.16h212.243c26.591 0 52.535 8.299 74.176 23.745l109.852 78.97c13.281 9.67 29.292 14.892 45.723 14.892h483.328c64.08 0 116.02 51.86 116.02 115.938V900H421.322V617.176c0-64.078 51.938-116.016 116.016-116.016Z"
          />
          <path
            fill="var(--glass-indicator-border)"
            d="M1462.66 716.72H537.34c-.143 0-.286.005-.429.006-63.773.23-115.411 51.902-115.585 115.689v553.665c0 57.87 44.835 105.55 102.606 112.01C1556.53 1341.37 1462.66 716.72 1462.66 716.72Z"
          />
          <path
            fill="color-mix(in oklch, var(--info) 62%, var(--glass-indicator-bg))"
            d="M1463.09 716.726c-.14-.001-.29-.006-.43-.006 0 0 93.87 624.65-938.728 781.37 4.394.49 8.87.75 13.408.75h925.32c64.09 0 116.01-50.48 116.01-112.76V832.415c-.17-63.787-51.81-115.459-115.58-115.689Z"
          />
        </g>
      )}
    </svg>
  );
}

export function CollectionDialGrip({
  label,
  expanded,
  disabled,
  sourceId,
  className,
  onPickup,
  onPointerDown,
}: {
  label: string;
  expanded: boolean;
  disabled?: boolean;
  sourceId?: string;
  className?: string;
  onPickup: (event: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      disabled={disabled}
      data-collection-dial-grip={sourceId ?? true}
      onClick={onPickup}
      onPointerDown={onPointerDown}
      className={cn(
        'pointer-events-auto inline-flex size-11 touch-none select-none items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
        className,
      )}
    >
      <GripVerticalIcon className="size-4" aria-hidden="true" />
    </button>
  );
}

export function CollectionDial({
  repoLabel,
  targets,
  activeIndex,
  status,
  message,
  dropTargetId,
  dragPoint,
  focusOnOpen = false,
  copy,
  onSelect,
  onStep,
  onConfirm,
  onCancel,
  onRetry,
}: {
  repoLabel: string;
  targets: readonly CollectionDialViewTarget[];
  activeIndex: number;
  status: CollectionDialViewStatus;
  message?: string;
  dropTargetId?: string | null;
  dragPoint?: { x: number; y: number } | null;
  focusOnOpen?: boolean;
  copy: CollectionDialCopy;
  onSelect: (targetId: string) => void;
  onStep: (direction: -1 | 1) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const shellRef = useRef<HTMLElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(0);
  const count = visibleTargetCount(width);
  const half = Math.floor(count / 2);
  const activeTarget = targets[activeIndex] ?? targets[0];

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const update = (nextWidth: number) => setWidth(nextWidth);
    update(shell.clientWidth);
    const observer = new ResizeObserver(([entry]) =>
      update(entry?.contentRect.width ?? shell.clientWidth),
    );
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the controlled index changes which button owns the ref
  useEffect(() => {
    if (focusOnOpen) activeButtonRef.current?.focus();
    else shellRef.current?.focus();
  }, [activeIndex, focusOnOpen]);

  if (!activeTarget) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const onAction = (event.target as HTMLElement).closest('[data-collection-dial-action]');
    if (onAction && (event.key === 'Enter' || event.key === ' ')) return;
    if (event.key.toLocaleLowerCase('en-US') === 'q') {
      event.preventDefault();
      onStep(-1);
    } else if (event.key.toLocaleLowerCase('en-US') === 'e') {
      event.preventDefault();
      onStep(1);
    } else if (event.key === 'Enter' && status === 'ready') {
      event.preventDefault();
      onConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };
  const statusText =
    message ??
    (status === 'submitting'
      ? copy.submittingStatus
      : status === 'success'
        ? copy.successStatus
        : copy.readyStatus);

  return (
    <section
      ref={shellRef}
      data-collection-dial
      aria-label={copy.label}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute inset-x-0 bottom-0 z-40 h-[22rem] overflow-hidden outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-16 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent_0%,black_42%)]" />
      {dragPoint ? (
        <div
          data-collection-dial-drag-overlay
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 z-50 max-w-64 -translate-x-1/2 -translate-y-1/2 truncate rounded-md bg-foreground px-3 py-2 text-caption font-medium text-background shadow-sm"
          style={{
            transform: `translate3d(${dragPoint.x}px, ${dragPoint.y}px, 0) translate(-50%, -50%)`,
          }}
        >
          {repoLabel}
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-[22rem]">
        <div className="absolute top-4 left-1/2 z-20 flex w-[min(38rem,calc(100%-2rem))] -translate-x-1/2 flex-col items-center gap-2 text-center">
          <p className="max-w-full truncate text-sm font-semibold">
            {copy.placement(repoLabel, activeTarget.name)}
          </p>
          <div className="flex items-center gap-2 text-micro text-muted-foreground">
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono tabular-nums">
              {copy.position(activeIndex + 1, targets.length)}
            </span>
            <span>{copy.keyboardHint}</span>
          </div>
          <p
            role="status"
            aria-live="polite"
            data-error={
              status === 'retryable_failure' || status === 'terminal_failure' || undefined
            }
            className={cn(
              'min-h-5 text-caption text-muted-foreground',
              (status === 'retryable_failure' || status === 'terminal_failure') &&
                'text-destructive',
              status === 'success' && 'text-success',
            )}
          >
            {statusText}
          </p>
        </div>

        <div className="absolute top-[7.25rem] left-1/2 z-10 size-0">
          {targets.map((target, index) => {
            const slot = index - activeIndex + half;
            const visible = slot >= 0 && slot < count;
            const distance = slot - half;
            const step = Math.min(count === 7 ? 144 : 150, width / (count + 0.6));
            const style = {
              '--dial-x': `${distance * step}px`,
              '--dial-y': `${distance * distance * 8}px`,
              '--dial-rotate': `${distance * 7}deg`,
              '--dial-scale': Math.max(0.72, 1 - Math.abs(distance) * 0.08),
            } as CSSProperties;
            const selected = index === activeIndex;
            const open = dropTargetId === target.id || (selected && status === 'submitting');
            return (
              <div
                key={target.id}
                aria-hidden={!visible || undefined}
                className={cn(
                  'absolute top-0 left-0 h-[7.5rem] w-32 -translate-x-1/2 transition-[opacity,transform,filter] duration-200 [transform:translateX(var(--dial-x))_translateY(var(--dial-y))] motion-reduce:transition-none',
                  visible ? 'opacity-100' : 'pointer-events-none opacity-0 blur-sm',
                )}
                style={style}
              >
                <button
                  ref={selected ? activeButtonRef : undefined}
                  type="button"
                  data-collection-dial-target={target.id}
                  aria-label={copy.selectCollection(target.name)}
                  aria-pressed={selected}
                  aria-hidden={!visible || undefined}
                  tabIndex={visible ? 0 : -1}
                  disabled={status === 'submitting'}
                  aria-disabled={status === 'success' || undefined}
                  onClick={() => onSelect(target.id)}
                  className={cn(
                    'group relative block size-full origin-bottom -translate-x-1/2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
                    'transition-transform duration-200 [transform:rotate(var(--dial-rotate))_scale(var(--dial-scale))]',
                    selected && '-translate-y-1',
                    open && '-translate-y-3',
                    status === 'success' && 'pointer-events-none',
                  )}
                >
                  <span
                    className={cn(
                      'absolute inset-x-2 top-0 h-28 opacity-75 saturate-50 transition-[filter,opacity] duration-200 group-hover:opacity-100 group-hover:saturate-100 motion-reduce:transition-none dark:brightness-125',
                      (selected || open) && 'opacity-100 saturate-100',
                    )}
                  >
                    <FolderArtwork open={open} />
                  </span>
                </button>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate text-center text-caption font-medium text-foreground">
                  {target.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-2 px-4">
          {status === 'retryable_failure' ? (
            <Button type="button" data-collection-dial-action onClick={onRetry}>
              <RotateCcwIcon className="size-4" aria-hidden="true" />
              {copy.retry}
            </Button>
          ) : status === 'ready' ? (
            <Button type="button" data-collection-dial-action onClick={onConfirm}>
              {copy.confirm(activeTarget.name)}
            </Button>
          ) : status === 'submitting' ? (
            <Button type="button" data-collection-dial-action disabled>
              <LoaderCircleIcon
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {copy.submittingStatus}
            </Button>
          ) : null}
          <Button type="button" variant="outline" data-collection-dial-action onClick={onCancel}>
            {status === 'success' ? (copy.done ?? copy.cancel) : copy.cancel}
          </Button>
        </div>
      </div>
    </section>
  );
}
