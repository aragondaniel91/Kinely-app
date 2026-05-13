import { format, isSameMonth, isToday } from "date-fns";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import FamilyEventCard from "@/components/calendar/family/FamilyEventCard";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function FamilyCalendarMonthGrid({ monthDays = [], anchorDate, eventsByDay, people = [], onAddDate }) {
  return (
    <div className="rounded-b-[2rem] border-t border-slate-100 bg-white p-3 md:p-4">
      <div className="grid grid-cols-7 gap-2 pb-2">
        {weekdayLabels.map((day) => (
          <div key={day} className="text-center text-xs font-extrabold uppercase tracking-wide text-slate-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const outsideMonth = !isSameMonth(day, anchorDate);
          const today = isToday(day);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onAddDate?.(day)}
              className={cn(
                "group min-h-[128px] rounded-2xl border border-slate-200 bg-white p-2 text-left transition hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm",
                today && "ring-2 ring-blue-400",
                outsideMonth && "opacity-45"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold",
                    today ? "bg-blue-600 text-white" : "text-slate-800"
                  )}
                >
                  {format(day, "d")}
                </span>
                <Plus className="h-4 w-4 text-slate-300 opacity-70 transition group-hover:text-blue-400 group-hover:opacity-100" />
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div key={event.id} onClick={(e) => e.stopPropagation()}>
                    <FamilyEventCard event={event} people={people} variant="pill" />
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-left text-[10px] font-black text-slate-500">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
