import { cn } from '@/lib/utils';

/**
 * Asterism mark: a small constellation of stars connected by faint lines.
 * Uses currentColor so it adapts to light / dark via text color tokens.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-5', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Asterism"
    >
      <line x1="5" y1="6" x2="12" y2="10" opacity="0.45" />
      <line x1="12" y1="10" x2="19" y2="7" opacity="0.45" />
      <line x1="12" y1="10" x2="10" y2="18" opacity="0.45" />
      <circle cx="5" cy="6" r="1.4" fill="currentColor" />
      <circle cx="19" cy="7" r="1.1" fill="currentColor" />
      <circle cx="10" cy="18" r="1.1" fill="currentColor" />
      <path
        d="M12 6.5l0.9 1.9 2.1 0.3-1.5 1.5 0.35 2.1-1.85-1-1.85 1 0.35-2.1-1.5-1.5 2.1-0.3z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
