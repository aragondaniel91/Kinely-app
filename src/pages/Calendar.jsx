import React, { useMemo, useState } from "react";

import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV10";
import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import { useFamily } from "@/lib/FamilyContext";
import { familyColorIds, colorHex, colorSoftHex } from "@/lib/personColorUtils";
import { cn } from "@/lib/utils";

export default function Calendar() {
  const { user, profile } = useFamily();
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");

  const familyGradientVariables = useMemo(() => {
    const colorIds = familyColorIds(profile || {}, user);
    const strongColors = colorIds.map((color) => colorHex(color));
    const softColors = colorIds.map((color) => colorSoftHex(color));

    return {
      "--family-gradient": `linear-gradient(to right, ${strongColors.join(", ")})`,
      "--family-gradient-vertical": `linear-gradient(to bottom, ${strongColors.join(", ")})`,
      "--family-soft-gradient": `linear-gradient(to right, ${softColors.join(", ")})`,
    };
  }, [profile, user]);

  return (
    <div className="family-calendar-shell min-h-full bg-background pb-28 md:pb-6" style={familyGradientVariables}>
      <div className="mx-auto mb-4 flex w-full max-w-7xl items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Family Wall</p>
          <h1 className="text-xl font-black text-slate-900">Calendar</h1>
        </div>

        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveCalendar("family")}
            className={cn(
              "h-10 min-w-[104px] border-r border-slate-200 px-4 text-sm font-black transition",
              activeCalendar === "family" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            Family
          </button>
          <button
            type="button"
            onClick={() => setActiveCalendar("custody")}
            className={cn(
              "h-10 min-w-[104px] px-4 text-sm font-black transition",
              activeCalendar === "custody" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            Custody
          </button>
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
