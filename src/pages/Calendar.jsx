import React, { useState } from "react";

import FamilyWallClockWeather from "@/components/FamilyWallClockWeather";
import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV9";
import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";

const compactCalendarStyles = `
.family-calendar-shell > div > div.mx-auto {
  max-width: none !important;
  min-height: calc(100vh - 1rem) !important;
  border-radius: 1.5rem !important;
}

.family-calendar-shell div.border-b.border-slate-200.bg-white {
  position: relative !important;
  display: grid !important;
  grid-template-columns: minmax(280px, 1fr) auto !important;
  grid-template-areas:
    "brand sync"
    "month filters"
    "people people"
    "summary views" !important;
  column-gap: 1.5rem !important;
  row-gap: 0.85rem !important;
  padding: 1rem 1.5rem 0.85rem !important;
}

.family-calendar-shell h1 {
  font-size: clamp(2rem, 4vw, 2.75rem) !important;
  line-height: 0.95 !important;
  letter-spacing: -0.04em !important;
}

/* Row 1/2 left: [Family Wall] / Family Calendar */
.family-calendar-shell .mb-5.flex.items-center.gap-3 {
  grid-area: brand !important;
  margin: 0 !important;
  align-self: start !important;
  max-width: none !important;
}

.family-calendar-shell .mb-5.flex.items-center.gap-3 .h-10.w-10,
.family-calendar-shell .mb-5.flex.items-center.gap-3 .h-11.w-11 {
  height: 2.25rem !important;
  width: 2.25rem !important;
  border-radius: 0.9rem !important;
}

.family-calendar-shell .mb-5.flex.items-center.gap-3 p.text-xl,
.family-calendar-shell .mb-5.flex.items-center.gap-3 p.truncate {
  font-size: 1.1rem !important;
  line-height: 1.1 !important;
}

.family-calendar-shell .mb-5.flex.items-center.gap-3 p.text-xs,
.family-calendar-shell .mb-5.flex.items-center.gap-3 p.text-sm {
  font-size: 0.8rem !important;
  line-height: 1.05rem !important;
}

/* Row 2 right: sync calendar */
.family-calendar-shell div.border-b.border-slate-200.bg-white button:has(svg[class*="RefreshCw"]),
.family-calendar-shell div.border-b.border-slate-200.bg-white button:has(svg) {
  white-space: nowrap !important;
}

/* Month + filters row */
.family-calendar-shell div[class*="xl:justify-between"] {
  display: contents !important;
}

.family-calendar-shell div[class*="xl:justify-between"] > div:first-child {
  grid-area: month !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  min-width: 0 !important;
}

.family-calendar-shell div[class*="xl:justify-between"] > div:last-child {
  grid-area: filters !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 0.75rem !important;
  min-width: 0 !important;
}

/* Keep only the person/category filters visually in the filters area */
.family-calendar-shell div[class*="xl:justify-between"] > div:last-child > button,
.family-calendar-shell div[class*="xl:justify-between"] > div:last-child > div {
  flex-shrink: 0 !important;
}

/* All names row */
.family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3,
.family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-2 {
  grid-area: people !important;
  width: 100% !important;
  margin: 0 !important;
  justify-content: flex-start !important;
}

.family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 button,
.family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-2 button {
  font-size: 1.05rem !important;
}

/* Summary + view controls row */
.family-calendar-shell div.border-b.border-slate-200.bg-white > p.mt-4 {
  grid-area: summary !important;
  margin: 0 !important;
  align-self: center !important;
  font-weight: 800 !important;
}

.family-calendar-shell div.border-b.border-slate-200.bg-white > div.mt-5,
.family-calendar-shell div.border-b.border-slate-200.bg-white > div:last-of-type {
  grid-area: views !important;
  margin: 0 !important;
  align-self: center !important;
  justify-self: end !important;
}

/* Calendar grid compacting */
.family-calendar-shell .grid.border-b.border-slate-200 > div {
  padding-top: 0.65rem !important;
  padding-bottom: 0.65rem !important;
}

.family-calendar-shell div.space-y-1.overflow-hidden.border-b.border-slate-200.p-2 > button {
  padding-top: 0.1rem !important;
  padding-bottom: 0.1rem !important;
  min-height: 0 !important;
}

.family-calendar-shell div.space-y-1.overflow-hidden.border-b.border-slate-200.p-2 > button p:first-child {
  font-size: 0.62rem !important;
  line-height: 0.82rem !important;
}

.family-calendar-shell div.space-y-1.overflow-hidden.border-b.border-slate-200.p-2 > button p:last-child {
  display: none !important;
}

.family-calendar-shell div.space-y-1.overflow-hidden.border-b.border-slate-200.p-2 > div.border-dashed {
  padding-top: 0.08rem !important;
  padding-bottom: 0.08rem !important;
  font-size: 0.62rem !important;
  line-height: 0.8rem !important;
}

.family-calendar-clock-weather-slot {
  position: absolute;
  right: 5.7rem;
  top: 1.25rem;
  z-index: 35;
}

.family-calendar-clock-weather-slot .family-wall-clock-weather {
  padding: 0 !important;
  justify-content: flex-end !important;
}

.family-calendar-clock-weather-slot .family-wall-clock-weather > div {
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
}

@media (max-width: 900px) {
  .family-calendar-shell h1 {
    font-size: 2rem !important;
  }

  .family-calendar-shell div.border-b.border-slate-200.bg-white {
    display: flex !important;
    flex-direction: column !important;
  }

  .family-calendar-shell div[class*="xl:justify-between"] {
    display: flex !important;
    flex-direction: column !important;
    gap: 0.75rem !important;
  }

  .family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 button,
  .family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-2 button {
    font-size: 1rem !important;
  }

  .family-calendar-clock-weather-slot {
    position: static;
    display: flex;
    justify-content: flex-end;
    padding: 0.75rem 1rem 0;
    transform: none;
  }
}
`;

export default function Calendar() {
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");

  return (
    <div className="family-calendar-shell relative min-h-full bg-background pb-28 md:pb-6">
      <style>{compactCalendarStyles}</style>
      <div className="family-calendar-clock-weather-slot">
        <FamilyWallClockWeather />
      </div>

      {activeCalendar === "custody" ? (
        <CustodyCalendarView
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      ) : (
        <FamilyCalendarView
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}
    </div>
  );
}
