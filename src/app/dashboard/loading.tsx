import { Skeleton } from "@/components/ui/skeleton";

// Next.js wraps the route segment in a Suspense boundary and shows this
// instantly while DashboardPage's Supabase queries resolve -- shaped to
// roughly match the real layout (two stat-tile rows + a table) so nothing
// visibly reflows once the real content streams in.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
