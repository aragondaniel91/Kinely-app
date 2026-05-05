import React, { useState } from "react";
import { CalendarDays, HeartHandshake, Layers } from "lucide-react";

import FamilyCalendarView from "@/components/calendar/FamilyCalendarView";
import { cn } from "@/lib/utils";

const calendarTypes = [
  {
    id: "family",
    label: "Family Calendar",
    description: "Daily activities, school, sports, appointments, and family events.",
    icon: CalendarDays,
  },
  {
    id: "custody",
    label: "Custody Calendar",
    description: "Parenting schedule and custody blocks. Existing custody view will live here.",
    icon: HeartHandshake,
  },
  {
    id: "all",
    label: "All Calendar",
    description: "Combined view for Family, Custody, Tasks, Meals, Grocery, and Notes.",
    icon: Layers,
  },
];

function CalendarTypeSelector({ activeCalendar, setActiveCalendar }) {
  return (
    <div className="mx-auto max-w-[1500px] px-2 pt-3 md:px-4 md:pt-4">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {calendarTypes.map((type) => {
          const Icon = type.icon;
          const isActive = activeCalendar === type.id;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setActiveCalendar(type.id)}
              className={cn(
                "flex min-w-[210px] flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isActive ? "bg-white/20" : "bg-blue-50 text-blue-600"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">
                  {type.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-xs font-semibold",
                    isActive ? "text-blue-50" : "text-slate-400"
                  )}
                >
                  {type.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarComingSoon({ type }) {
  const selected = calendarTypes.find((item) => item.id === type);
  const Icon = selected?.icon || CalendarDays;

  return (
    <div className="min-h-full bg-[#f8fbff] p-2 md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-[1500px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="max-w-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
            <Icon className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-black text-slate-950">
            {selected?.label || "Calendar"}
          </h1>

          <p className="mt-3 text-base font-semibold text-slate-500">
            {type === "custody"
              ? "This section is reserved for the existing Custody Calendar view. We will plug the original custody calendar component here without changing its current behavior."
              : "This combined view will show Family, Custody, Tasks, Meals, Grocery, and Notes together once those modules are connected."}
          </p>

          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            For now, use Family Calendar for family events. The next step is to restore/connect the existing custody calendar component here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Calendar() {
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");

  return (
    <div className="min-h-full bg-background pb-28 md:pb-6">
      <CalendarTypeSelector
        activeCalendar={activeCalendar}
        setActiveCalendar={setActiveCalendar}
      />

      {activeCalendar === "family" ? (
        <FamilyCalendarView viewMode={viewMode} setViewMode={setViewMode} />
      ) : (
        <CalendarComingSoon type={activeCalendar} />
      )}
    </div>
  );
}
