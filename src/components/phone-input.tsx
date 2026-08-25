"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { countries, guessCountryFromTimezone, isoToFlagEmoji, type Country } from "@/lib/countries";
import { cn } from "@/lib/utils";

const DEFAULT_COUNTRY: Country = countries[0]; // México — reasonable fallback default.

function defaultCountry(): Country {
  if (typeof Intl === "undefined") return DEFAULT_COUNTRY;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return guessCountryFromTimezone(timezone) ?? DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}

/**
 * Phone number field with a searchable country-code picker to its left.
 * Renders a single hidden `<input name={name}>` carrying the combined
 * value (e.g. "+52 5555555555") for plain form-action submission; the two
 * visible inputs (country trigger + number) are UI-only and feed that
 * hidden field via local state.
 */
export function PhoneInput({
  name,
  id,
  className,
}: {
  name: string;
  id?: string;
  className?: string;
}) {
  // Lazy initializer so the timezone-based guess only ever runs once, on
  // first client render, not on every re-render.
  const [country, setCountry] = useState<Country>(() => defaultCountry());
  const [number, setNumber] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // Focus the search box as soon as the list opens.
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.dialCode.replace("+", "").includes(q)
    );
  }, [query]);

  const combinedValue = number.trim() ? `${country.dialCode} ${number.trim()}` : "";

  return (
    <div className={cn("relative flex gap-2", className)} ref={containerRef}>
      <input type="hidden" name={name} value={combinedValue} />

      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span aria-hidden="true">{isoToFlagEmoji(country.iso2)}</span>
        <span>{country.dialCode}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="55 5555 5555"
        className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border border-input bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país o código..."
              className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
            ) : (
              filtered.map((c) => (
                <li key={c.iso2}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.iso2 === country.iso2}
                    onClick={() => {
                      setCountry(c);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                      c.iso2 === country.iso2 && "bg-accent"
                    )}
                  >
                    <span aria-hidden="true">{isoToFlagEmoji(c.iso2)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-muted-foreground">{c.dialCode}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
