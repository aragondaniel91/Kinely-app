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
  padding: 1rem 1.5rem 0.85rem !important;
}

.family-calendar-shell h1 {
  font-size: clamp(2rem, 4vw, 2.75rem) !important;
  line-height: 0.95 !important;
  letter-spacing: -0.04em !important;
}

/* Header: [Family Wall] left, [Weather/Time] right */
.family-calendar-shell .mb-5.flex.items-center.gap-3 {
  max-width: calc(100% - 24rem) !important;
  margin-bottom: 0.7rem !important;
}

.family-calendar-shell .mb-5.flex.items-center.gap-3 .h-10.w-10 {
  height: 2rem !important;
  width: 2rem !important;
  border-radius: 0.85rem !important;
  font-size: 1rem !important;
}

.family-calendar-shell .mb-5.flex.items-center.gap-3 p.text-xl {
  font-size: 1.05rem !important;
  line-height: 1.1 !important;
}

/* Row 3: [May 2026] left and [Person filter] [Category filter] right */
.family-calendar-shell div[class*="xl:justify-between"] {
  margin-top: 0 !important;
  align-items: center !important;
}

.family-calendar-shell div[class*="xl:justify-between"] > div:last-child {
  margin-left: auto !important;
  justify-content: flex-end !important;
}

/* Row 4: all names/chips by themselves */
.family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 {
  width: 100% !important;
  margin-top: 0.9rem !important;
  justify-content: flex-start !important;
}

.family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 button {
  font-size: 1.15rem !important;
}

.family-calendar-shell div.border-b.border-slate-200.bg-white > div.mt-5 {
  margin-top: 0.85rem !important;
}

/* Row 5: summary left, < Today > center, Day/Week/Month right */
.family-calendar-shell div.border-b.border-slate-200.bg-white > p.mt-4 {
  margin-top: 0.9rem !important;
  margin-bottom: 0 !important;
  font-weight: 800 !important;
}

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

  .family-calendar-shell .mb-5.flex.items-center.gap-3 {
    max-width: 100% !important;
  }

  .family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 button {
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
