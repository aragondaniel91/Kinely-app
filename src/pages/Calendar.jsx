import React, { useState } from "react";

import FamilyWallClockWeather from "@/components/FamilyWallClockWeather";
import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV5";

const compactCalendarStyles = `
.family-calendar-shell > div > div.mx-auto {
  max-width: none !important;
  min-height: calc(100vh - 1rem) !important;
  border-radius: 1.5rem !important;
}

.family-calendar-shell div.border-b.border-slate-200.bg-white {
  padding-top: 0.85rem !important;
  padding-bottom: 0.65rem !important;
}

.family-calendar-shell h1 {
  font-size: clamp(2rem, 4vw, 2.75rem) !important;
  line-height: 0.95 !important;
  letter-spacing: -0.04em !important;
}

.family-calendar-shell .mb-5.flex.items-center.gap-3 {
  margin-bottom: 0.65rem !important;
}

.family-calendar-shell .mb-5.flex.items-center.gap-3 .h-10.w-10 {
  height: 2rem !important;
  width: 2rem !important;
  border-radius: 0.85rem !important;
  font-size: 1rem !important;
}

.family-calendar-shell .mb-5.flex.items-center.gap-3 p.text-xl {
  font-size: 1rem !important;
  line-height: 1.1 !important;
}

.family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 {
  margin-top: 0.65rem !important;
}

.family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 button {
  font-size: 1.3rem !important;
}

.family-calendar-shell div[class*="xl:justify-between"] {
  margin-top: -0.75rem !important;
}

.family-calendar-shell div.border-b.border-slate-200.bg-white > div.mt-5 {
  margin-top: 0.8rem !important;
}

.family-calendar-shell div.border-b.border-slate-200.bg-white > p.mt-4 {
  margin-top: 0.1rem !important;
  margin-bottom: -0.35rem !important;
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

.family-calendar-shell div.hidden.items-center.gap-2.md\\:flex {
  display: none !important;
}

@media (max-width: 900px) {
  .family-calendar-shell h1 {
    font-size: 2rem !important;
  }

  .family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 button {
    font-size: 1.15rem !important;
  }

  .family-calendar-clock-weather-slot {
    right: 5rem;
    top: 1rem;
    transform: scale(0.9);
    transform-origin: top right;
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
        <CustodyCalendarView activeCalendar={activeCalendar} setActiveCalendar={setActiveCalendar} />
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
