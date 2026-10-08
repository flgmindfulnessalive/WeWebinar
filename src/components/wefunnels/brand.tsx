import type { ReactNode } from "react";

// Shared WeFunnels visual primitives, taken from the approved designs
// (WeFunnels-Disenos-Finales, 8 Oct 2026). Kept as plain server-safe
// components so public pages, the registration and the panel all render
// the same identity without a client bundle.

export const WF_FONT = "Arial, Helvetica, sans-serif";

// Surfaces and text, never black text on a dark surface.
export const WF = {
  bg: "#050913",
  panel: "#0e1929",
  panelAlt: "#0b1423",
  border: "#2d3e57",
  borderSoft: "#202a3b",
  title: "#f3f7ff",
  text: "#b7c7dc",
  muted: "#a8bdd4",
  cyan: "#43e2ee",
  kicker: "#70e9ef",
} as const;

export const PRIMARY_BUTTON =
  "wf-btn-primary inline-flex min-h-[49px] items-center justify-center gap-3 rounded-lg px-5 py-3 text-[15px] font-bold no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b69aff]";

export const SECONDARY_BUTTON =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#47607d] bg-transparent px-4 py-2.5 text-[14px] text-[#dcecff] no-underline hover:border-[#6f8db0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#76e3ed] disabled:opacity-60";

export const FIELD =
  "block min-h-[48px] w-full min-w-0 rounded-lg border border-[#40516b] bg-[#070e1a] px-3 py-3 text-[16px] text-[#f5f8ff] placeholder:text-[#8fa3bd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#53dfe9]";

export const LABEL = "mb-1.5 block text-[13px] font-medium text-[#e9f2ff]";

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const img = size === "sm" ? "h-[30px] w-[54px]" : "h-[36px] w-[64px]";
  const text = size === "sm" ? "text-[21px]" : "text-[25px]";
  return (
    <span className={`inline-flex items-center gap-2.5 font-bold tracking-[-1px] ${text}`}>
      {/* The approved transparent PNG, never a generic icon. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wefunnels/logo.png" alt="" width={64} height={32} className={`${img} object-contain`} />
      <span className="text-[#f3f7ff]">
        <span className="text-[#43e2ee]">We</span>Funnels
      </span>
    </span>
  );
}

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`text-[11px] font-bold tracking-[1.7px] text-[#70e9ef] uppercase ${className}`}
    >
      {children}
    </div>
  );
}

export function GradientText({ children }: { children: ReactNode }) {
  return <span className="wf-gradient-text">{children}</span>;
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "·"
  );
}

export function Avatar({
  name,
  photoUrl,
  size = 42,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-[#3b566e] bg-[#15283a] font-bold text-[#7be9f2]"
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size / 3.2)) }}
      aria-hidden="true"
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function Check() {
  return (
    <span className="mr-2.5 text-[#6ee8e5]" aria-hidden="true">
      ✓
    </span>
  );
}

// The header used on public pages and the registration: logo on the left,
// a short qualifier on the right.
export function PublicHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[#202a3b] px-4 py-5 sm:px-[5%]">
      <Logo />
      {right}
    </header>
  );
}

export function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="wf-details border-b border-[#2c3b51] py-4">
      <summary className="flex min-h-[44px] items-center justify-between gap-4 text-[15px] font-medium text-[#f3f7ff] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b69aff]">
        {question}
      </summary>
      <p className="mt-3 mb-1 text-[14px] leading-relaxed text-[#b7c7dc]">{children}</p>
    </details>
  );
}
