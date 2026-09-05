import { Skeleton } from "@/components/ui/skeleton";
import { ListRow, ListRows } from "@/components/layout/page-section";

export type ListSkeleton = "rows" | "media-rows" | "grid";

function LoadingSkeleton({
  shape,
  count,
}: {
  shape: ListSkeleton;
  count: number;
}): React.ReactElement {
  if (shape === "grid") {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-4">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="aspect-[2/3] w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ListRows>
      {Array.from({ length: count }, (_, index) => (
        <ListRow key={index} className="flex items-center gap-3 py-2.5">
          {shape === "media-rows" && (
            <Skeleton className="h-16 w-11 shrink-0 rounded" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </ListRow>
      ))}
    </ListRows>
  );
}

export function ListState({
  error = false,
  loading,
  empty,
  errorLabel,
  emptyLabel,
  loadingLabel,
  skeleton = "rows",
  skeletonCount = 6,
}: {
  /** Omit on views that surface load failures as an empty list. */
  error?: boolean;
  loading: boolean;
  empty: boolean;
  errorLabel?: string;
  emptyLabel: string;
  /** Announced to screen readers while the skeleton is on screen. */
  loadingLabel: string;
  skeleton?: ListSkeleton;
  skeletonCount?: number;
}): React.ReactElement | null {
  if (error) return <p className="text-sm text-destructive">{errorLabel}</p>;
  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label={loadingLabel}>
        <LoadingSkeleton shape={skeleton} count={skeletonCount} />
      </div>
    );
  }
  if (empty) return <p className="text-muted-foreground">{emptyLabel}</p>;
  return null;
}
