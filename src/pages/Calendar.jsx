import React, { useState } from "react";

import FamilyCalendarView from "@/components/calendar/FamilyCalendarView";

export default function Calendar() {
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");

  return (
    <div className="min-h-full bg-background pb-28 md:pb-6">
      <FamilyCalendarView
        activeCalendar={activeCalendar}
        setActiveCalendar={setActiveCalendar}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </div>
  );
}
