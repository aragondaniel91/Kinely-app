import React, { useState } from "react";

import FamilyCalendarView from "@/features/family-calendar/FamilyCalendarView";

export default function Calendar() {
  const [viewMode, setViewMode] = useState("month");

  return <FamilyCalendarView viewMode={viewMode} setViewMode={setViewMode} />;
}
