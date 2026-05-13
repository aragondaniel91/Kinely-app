import React, { useState } from "react";

import FamilyCalendarView from "@/components/calendar/family/FamilyCalendarView";

export default function Calendar() {
  const [viewMode, setViewMode] = useState("month");

  return <FamilyCalendarView viewMode={viewMode} setViewMode={setViewMode} />;
}
