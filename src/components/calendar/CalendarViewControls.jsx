import React, { useState } from "react";
import { CalendarDays, Check, ChevronDown, Filter } from "lucide-react";

import { cn } from "@/lib/utils";

const viewModes = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export default function CalendarViewControls({
  viewMode = "week",
  setViewMode,
  showFilters = true,
  setShowFilters,
  showFilterToggle = true,
}) {
  const [showViewMenu, setShowViewMenu] = useState(false);

  const activeViewLabel =
    viewModes.find((mode) => mode.id === viewMode)?.label || "Week";

  const handleViewChange = (nextViewMode) => {
    setViewMode?.(nextViewMode);
    setShowViewMenu(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowViewMenu((prev) => !prev)}
          className="h-9 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-bold text-foreground shadow-sm hover:border-primary/40 active:scale-95 transition"
        >
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Vista:</span>
          <span>{activeViewLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {showViewMenu && (
          <div className="absolute right-0 mt-2 w-40 rounded-2xl border bg-popover shadow-xl p-1 z-50">
            {viewModes.map((mode) => {
              const active = viewMode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleViewChange(mode.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span>{mode.label}</span>
                  {active && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showFilterToggle && (
        <button
          type="button"
          onClick={() => setShowFilters?.((prev) => !prev)}
          className={cn(
            "h-9 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-bold shadow-sm active:scale-95 transition",
            showFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:text-foreground"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      )}
    </div>
  );
}
