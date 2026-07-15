import { Card, Skeleton } from '@asterism/ui';

const GRID_SKELETON_KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;
const LIST_SKELETON_KEYS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'] as const;

export function RepoCardSkeleton() {
  return (
    <Card className="flex h-auto min-h-[208px] flex-col gap-3 rounded-lg p-4 sm:h-[208px]">
      <Skeleton className="h-5 w-2/3" />
      <div className="flex min-h-10 flex-col gap-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Skeleton className="h-[22px] w-14 rounded-sm" />
          <Skeleton className="h-[22px] w-16 rounded-sm" />
        </div>
        <Skeleton className="h-5 w-8 rounded-sm" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex gap-3">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>
    </Card>
  );
}

export function RepoListRowSkeleton() {
  return (
    <div className="grid min-h-[104px] grid-cols-[auto_auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-border/50 border-b px-3 py-3 sm:h-16 sm:min-h-16 sm:grid-cols-[minmax(0,1fr)_5rem_9rem] sm:gap-0 sm:px-0 sm:py-0 lg:grid-cols-[minmax(0,1fr)_9rem_5rem_8rem]">
      <div className="col-span-3 flex min-w-0 flex-col justify-center gap-1 sm:col-span-1 sm:px-3">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex items-center sm:hidden lg:flex lg:px-3">
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex items-center sm:px-3">
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="flex flex-col items-end justify-center gap-1 sm:items-start sm:px-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function RepoGridSkeleton() {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(370px, 100%), 1fr))' }}
    >
      {GRID_SKELETON_KEYS.map((key) => (
        <RepoCardSkeleton key={key} />
      ))}
    </div>
  );
}

export function RepoListSkeleton() {
  return (
    <div className="overflow-clip rounded-lg border bg-card text-card-foreground">
      <div className="hidden h-10 grid-cols-[minmax(0,1fr)_5rem_9rem] items-center border-border border-b bg-muted/55 sm:grid lg:grid-cols-[minmax(0,1fr)_9rem_5rem_8rem]">
        <Skeleton className="mx-3 h-3 w-20" />
        <Skeleton className="sr-only h-3 w-14 lg:not-sr-only lg:mx-3" />
        <Skeleton className="mx-3 h-3 w-10" />
        <Skeleton className="mx-3 h-3 w-14" />
      </div>
      {LIST_SKELETON_KEYS.map((key) => (
        <RepoListRowSkeleton key={key} />
      ))}
    </div>
  );
}
