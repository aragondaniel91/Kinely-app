import React, { useState } from "react";
import { Monitor, SlidersHorizontal, X } from "lucide-react";

import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV2";
import { cn } from "@/lib/utils";

const wallDisplayStyles = `
.family-calendar-shell.wall-display-on > div:not(.fixed) > div.mx-auto {
  max-width: none !important;
  min-height: calc(100vh - 1rem) !important;
  border-radius: 1.5rem !important;
}

.family-calendar-shell.wall-display-on div.border-b.border-slate-200.bg-white {
  padding-top: 0.85rem !important;
  padding-bottom: 0.6rem !important;
}

.family-calendar-shell.wall-display-on h1 {
  font-size: clamp(2rem, 4vw, 2.75rem) !important;
  line-height: 0.95 !important;
  letter-spacing: -0.04em !important;
}

.family-calendar-shell.wall-display-on .mb-5.flex.items-center.gap-3 {
  margin-bottom: 0.65rem !important;
}

.family-calendar-shell.wall-display-on .mb-5.flex.items-center.gap-3 .h-10.w-10 {
  height: 2rem !important;
  width: 2rem !important;
  border-radius: 0.85rem !important;
  font-size: 1rem !important;
}

.family-calendar-shell.wall-display-on .mb-5.flex.items-center.gap-3 p.text-xl {
  font-size: 1rem !important;
  line-height: 1.1 !important;
}

.family-calendar-shell.wall-display-on .mt-5.flex.flex-wrap.items-center.gap-3 {
  margin-top: 0.75rem !important;
}

.family-calendar-shell.wall-display-on .mt-5.flex.flex-wrap.items-center.gap-3 button {
  font-size: 1.35rem !important;
}

.family-calendar-shell.wall-display-on div[class*="xl:justify-between"] {
  margin-top: -0.35rem !important;
}

.family-calendar-shell.wall-display-on:not(.wall-options-open) div[class*="xl:justify-between"] > div:nth-child(2) {
  display: none !important;
}

.family-calendar-shell.wall-display-on:not(.wall-options-open) div[class*="xl:justify-between"] > div:first-child > button {
  display: none !important;
}

.family-calendar-shell.wall-display-on:not(.wall-options-open) h1 + div.relative.z-30 {
  display: none !important;
}

.family-calendar-shell.wall-display-on.wall-options-open h1 + div.relative.z-30,
.family-calendar-shell.wall-display-on.wall-options-open div[class*="xl:justify-between"] > div:nth-child(2),
.family-calendar-shell.wall-display-on.wall-options-open div[class*="xl:justify-between"] > div:first-child > button {
  display: flex !important;
}

.family-calendar-shell.wall-display-on.wall-options-open div[class*="xl:justify-between"] {
  position: relative !important;
  z-index: 110 !important;
  padding: 1rem !important;
  border: 1px solid rgb(226 232 240) !important;
  border-radius: 1.5rem !important;
  background: white !important;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18) !important;
}

.family-calendar-shell.wall-display-on div.border-b.border-slate-200.bg-white > div.mt-5 {
  margin-top: 0.75rem !important;
}

.family-calendar-shell.wall-display-on div.border-b.border-slate-200.bg-white > p.mt-4 {
  margin-top: 0.1rem !important;
  margin-bottom: -0.35rem !important;
}

.family-calendar-shell.wall-display-on .grid.border-b.border-slate-200 > div {
  padding-top: 0.65rem !important;
  padding-bottom: 0.65rem !important;
}

@media (max-width: 900px) {
  .family-calendar-shell.wall-display-on h1 {
    font-size: 2rem !important;
  }

  .family-calendar-shell.wall-display-on .mt-5.flex.flex-wrap.items-center.gap-3 button {
    font-size: 1.15rem !important;
  }
}
`;

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
      <style>{wallDisplayStyles}</style>

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
