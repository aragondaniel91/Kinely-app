import React, { useState } from "react";

import FamilyCalendarHeader from "@/components/calendar/FamilyCalendarHeader";
import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV9";
import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";

const compactCalendarStyles = `
.family-calendar-live-body > div > div.mx-auto > div.border-b.border-slate-200.bg-white:first-child {
  display: none !important;
}

.family-calendar-live-body > div > div.mx-auto {
  max-width: none !important;
  min-height: calc(100vh - 1rem) !important;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}
`;

export default function Calendar() {
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");

  return (
    <div className="family-calendar-shell relative min-h-full bg-background pb-28 md:pb-6">
      <style>{compactCalendarStyles}</style>

      {activeCalendar === "custody" ? (
        <CustodyCalendarView
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      ) : (
        <div className="mx-auto max-w-none overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <FamilyCalendarHeader viewMode={viewMode} onViewModeChange={setViewMode} />
          <div className="family-calendar-live-body">
            <FamilyCalendarView
              activeCalendar={activeCalendar}
              setActiveCalendar={setActiveCalendar}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </div>
          <button
            type="button"
            className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-4xl font-light leading-none text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 hover:bg-blue-700 active:scale-95"
            aria-label="Add event"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
