import React, { useState } from "react";

import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";

export default function Custody() {
  const [activeCalendar, setActiveCalendar] = useState("custody");
  const [viewMode, setViewMode] = useState("month");

  return (
    <div className="min-h-full bg-background pb-28 md:pb-6">
      <CustodyCalendarView
        activeCalendar={activeCalendar}
        setActiveCalendar={setActiveCalendar}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </div>
  );
}
