import { Skeleton } from "@/components/ui/skeleton";

// Wizard's fallback -- progress bar + the riel/panel split from WizardShell,
// so switching from the Control Center into /edit doesn't flash blank.
export default function WebinarEditLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <Skeleton className="h-2 w-full max-w-md rounded-full" />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-2 rounded-xl border p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
