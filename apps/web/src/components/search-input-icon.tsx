import { cn } from '@asterism/ui';
import { SearchIcon } from 'lucide-react';

export function SearchInputIcon({ className }: { className?: string }) {
  return (
    <SearchIcon
      className={cn(
        'pointer-events-none absolute top-1/2 z-10 size-4 -translate-y-1/2 text-black/60',
        className,
      )}
    />
  );
}
