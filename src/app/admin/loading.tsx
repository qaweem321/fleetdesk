import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly while any admin page loads. The sidebar and header stay visible.
export default function AdminLoading() {
  return (
    <div role="status" className="max-w-3xl">
      <span className="sr-only">Loading...</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}
