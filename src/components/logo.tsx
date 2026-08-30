import Image from "next/image";

import { cn } from "@/lib/utils";

// Brand mark used next to the "WeWebinars" wordmark in the dashboard/admin
// nav, on login/signup, and anywhere else the platform's own icon appears
// (favicon and apple-icon are the same source art, see src/app/icon.png and
// src/app/apple-icon.png). The wrapper -- not the image -- owns the corner
// radius/shadow so every caller's className (rounded-md, rounded-2xl,
// shadow-*, size-*) keeps working exactly as before.
export function Logo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative size-6 shrink-0 overflow-hidden rounded-md", className)}
    >
      <Image src="/brand/w-badge.png" alt="" fill sizes="64px" className="object-cover" />
    </div>
  );
}
