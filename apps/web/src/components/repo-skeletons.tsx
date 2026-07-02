import { Card, Skeleton } from '@asterism/ui';

export function RepoCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-3 rounded-lg p-4 py-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-1.5">
        <Skeleton className="h-[22px] w-14 rounded-sm" />
        <Skeleton className="h-[22px] w-16 rounded-sm" />
      </div>
      <div className="mt-auto flex gap-4">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-20" />
      </div>
    </Card>
  );
}

export function RepoListRowSkeleton() {
  return (
    <div className="flex h-14 items-center gap-4 border-border/50 border-b px-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="hidden h-3 w-16 md:block" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}
