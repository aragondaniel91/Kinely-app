import React, { useState } from "react";
import { Monitor, SlidersHorizontal, X } from "lucide-react";

import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV2";
import { cn } from "@/lib/utils";

export default function Calendar() {
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");
  const [wallDisplay, setWallDisplay] = useState(false);
  const [wallOptionsOpen, setWallOptionsOpen] = useState(false);

  return (
    <div
      className={cn(
        "family-calendar-shell min-h-full bg-background pb-28 md:pb-6",
        wallDisplay && "wall-display-on",
        wallOptionsOpen && "wall-options-open"
      )}
    >
      <div className="fixed right-4 top-4 z-[120] flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-lg md:right-6 md:top-6">
        <button
          type="button"
          onClick={() => {
            setWallDisplay((current) => !current);
            setWallOptionsOpen(false);
          }}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-black transition",
            wallDisplay ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          )}
          title="Toggle Wall Display mode"
        >
          <Monitor className="h-4 w-4" />
          Wall Display
        </button>

        {wallDisplay && (
          <button
            type="button"
            onClick={() => setWallOptionsOpen((current) => !current)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-black transition",
              wallOptionsOpen ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            )}
            title="Open calendar filters and options"
          >
            {wallOptionsOpen ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            {wallOptionsOpen ? "Close" : "Filters"}
          </button>
        )}
      </div>

      {wallDisplay && wallOptionsOpen && (
        <button
          type="button"
          aria-label="Close Wall Display options"
          className="fixed inset-0 z-[95] bg-slate-950/20"
          onClick={() => setWallOptionsOpen(false)}
        />
      )}

      <FamilyCalendarView
        activeCalendar={activeCalendar}
        setActiveCalendar={setActiveCalendar}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </div>
  );
}
