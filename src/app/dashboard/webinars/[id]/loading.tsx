import { Skeleton } from "@/components/ui/skeleton";

// Control Center's fallback -- header + status bar + the three performance
// tiles, matching webinars/[id]/page.tsx's own shape.
export default function WebinarControlCenterLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <Skeleton className="h-20 rounded-xl" />

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-10 w-64" />
    </div>
  );
}
