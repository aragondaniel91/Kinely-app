import React, { useState } from "react";

import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV4";

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

@media (max-width: 900px) {
  .family-calendar-shell h1 {
    font-size: 2rem !important;
  }

  .family-calendar-shell .mt-5.flex.flex-wrap.items-center.gap-3 button {
    font-size: 1.15rem !important;
  }
}
`;

export default function Calendar() {
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");

  return (
    <div className="family-calendar-shell min-h-full bg-background pb-28 md:pb-6">
      <style>{compactCalendarStyles}</style>

      <FamilyCalendarView
        activeCalendar={activeCalendar}
        setActiveCalendar={setActiveCalendar}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </div>
  );
}
