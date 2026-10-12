import { Skeleton } from "@/components/ui/skeleton";
import { PublicPage } from "./public-page";

// Shown instantly while a customer page loads (each folder's loading.tsx).
export function PageLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading...</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

// The same inside the site's header and footer, for public pages that draw their own frame.
export function PublicPageLoading() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <PageLoading />
      </div>
    </PublicPage>
  );
}
