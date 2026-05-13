import React, { useState } from "react";

import FamilyCalendarView from "@/components/calendar/family/FamilyCalendarView";
import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import { cn } from "@/lib/utils";

const calendarTabs = [
  { id: "family", label: "Family Calendar" },
  { id: "custody", label: "Custody Calendar" },
];

export default function Calendar() {
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("month");

  return (
    <div className="min-h-full bg-[#f8fbff] pb-28 md:pb-6">
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {calendarTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCalendar(tab.id)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-black transition",
                activeCalendar === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeCalendar === "custody" ? (
        <CustodyCalendarView
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      ) : (
        <FamilyCalendarView viewMode={viewMode} setViewMode={setViewMode} />
      )}
    </div>
  );
}
