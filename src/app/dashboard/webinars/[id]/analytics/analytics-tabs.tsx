"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// KPIs + funnel stay outside this component, always visible above it (the
// "resumen" of the page); everything else -- retention, CTAs/polls,
// audience breakdowns, the detailed tables -- moves in here. Only the
// active tab's subtree is inserted into the returned tree, so the other
// three don't mount (or paint) until picked -- the page's initial DOM stays
// small even though every tab's data was already fetched server-side.
export function AnalyticsTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  if (!active) return null;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`analytics-tab-${tab.id}`}
            aria-selected={tab.id === active.id}
            aria-controls={`analytics-tabpanel-${tab.id}`}
            tabIndex={tab.id === active.id ? 0 : -1}
            onClick={() => setActiveId(tab.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab.id === active.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`analytics-tabpanel-${active.id}`}
        aria-labelledby={`analytics-tab-${active.id}`}
        tabIndex={0}
      >
        {active.content}
      </div>
    </div>
  );
}
