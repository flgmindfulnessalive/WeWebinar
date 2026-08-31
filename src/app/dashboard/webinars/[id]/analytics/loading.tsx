import { Skeleton } from "@/components/ui/skeleton";

// Analíticas is the heaviest page in the app (12 parallel RPCs) -- the
// route most likely to show a noticeable blank gap without this, so it
// gets the most detailed skeleton: header, date range, the 5-tile KPI row,
// the funnel card, and the tab bar.
export default function WebinarAnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <Skeleton className="h-9 w-64 rounded-md" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-40 rounded-xl" />

      <div className="flex gap-1 border-b pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-24" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
