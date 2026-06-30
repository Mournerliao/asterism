import { Card, Skeleton } from '@asterism/ui';

export function RepoCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
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
    <Card className="flex flex-row items-center gap-4 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="hidden h-5 w-16 rounded-md md:block" />
      <Skeleton className="h-3 w-10" />
    </Card>
  );
}
