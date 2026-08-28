import Link from "next/link";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

// Product-Led Growth surface (blueprint: "Core deberá conservar Powered by
// WeWebinars -- cada webinar se convierte potencialmente en publicidad del
// producto"). Renders on every public webinar page unless the account's
// plan has features.remove_branding -- callers compute that themselves
// (it needs a `plans` row already fetched for other reasons on each page)
// and simply skip rendering this when true, rather than this component
// re-querying it.
export function PoweredByBadge({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex w-fit items-center gap-1.5 text-xs opacity-60 transition-opacity hover:opacity-100",
        className
      )}
    >
      <Logo className="size-4" />
      Powered by WeWebinars
    </Link>
  );
}
