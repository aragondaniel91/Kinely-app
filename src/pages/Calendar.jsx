import React, { useState } from "react";

import FamilyCalendarView from "@/components/calendar/FamilyCalendarView";

export default function Calendar() {
  const [viewMode, setViewMode] = useState("week");
  const [showFilters, setShowFilters] = useState(true);

  return (
    <div className="min-h-full bg-background">
      <div className="pb-28 md:pb-6">
        <FamilyCalendarView
          viewMode={viewMode}
          setViewMode={setViewMode}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
        />
      </div>
    </div>
  );
}
