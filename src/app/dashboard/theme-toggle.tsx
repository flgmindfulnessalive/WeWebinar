"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "wewebinars-dashboard-theme";
const ROOT_ID = "dashboard-theme-root";

type ThemeChoice = "light" | "dark" | "system";

// Applied to the dashboard's own wrapper div (see layout.tsx), not <html> --
// the preference is scoped to the backoffice only, so it never touches the
// marketing site or a host's public webinar pages (which have their own
// per-account brand colors and were never meant to invert to dark).
function applyTheme(choice: ThemeChoice) {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", choice === "dark" || (choice === "system" && prefersDark));
}

function getSnapshot(): ThemeChoice {
  return (localStorage.getItem(STORAGE_KEY) as ThemeChoice | null) ?? "system";
}
function getServerSnapshot(): ThemeChoice {
  return "system";
}
// Native "storage" events only fire in *other* tabs -- subscribing to it
// still lets useSyncExternalStore re-read after select() below dispatches
// one manually, which is what keeps this tab's own click in sync too.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function select(next: ThemeChoice) {
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
];

export function ThemeToggle() {
  // Starts as "system" during SSR and on the very first client render
  // (getServerSnapshot), matching the inline init script's own default in
  // layout.tsx, so there's nothing to mismatch -- useSyncExternalStore
  // swaps in the real stored choice right after hydration.
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Live-updates the dashboard while it's open if the OS theme flips and
  // "system" is selected -- a pure side effect on the DOM, no setState.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getSnapshot() === "system") applyTheme("system");
    };
    mql.addEventListener("change", onSystemChange);
    return () => mql.removeEventListener("change", onSystemChange);
  }, []);

  return (
    <div className="flex items-center rounded-lg border p-0.5" role="group" aria-label="Tema">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => select(value)}
          title={label}
          aria-label={label}
          aria-pressed={choice === value}
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
            choice === value && "bg-muted text-foreground"
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
