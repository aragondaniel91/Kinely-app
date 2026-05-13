import { format, isSameMonth, isToday } from "date-fns";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import FamilyEventCard from "@/components/calendar/family/FamilyEventCard";

export default function FamilyCalendarMonthGrid({ monthDays = [], anchorDate, eventsByDay, people = [], onAddDate }) {
  return (
    <div className="border-t border-slate-100 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-black uppercase tracking-wide text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="py-3">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-slate-100/70">
        {monthDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const outsideMonth = !isSameMonth(day, anchorDate);
          const today = isToday(day);

          return (
            <div key={key} className="min-h-[128px] border-b border-r border-slate-100 bg-white p-2 last:border-r-0">
              <button type="button" onClick={() => onAddDate?.(day)} className="mb-2 flex w-full items-center justify-between">
                <span className={cn("text-xs font-black", today ? "rounded-full bg-blue-600 px-2 py-1 text-white" : outsideMonth ? "text-slate-300" : "text-slate-800")}>{format(day, "d")}</span>
                <Plus className="h-3.5 w-3.5 text-slate-300" />
              </button>

              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((event) => (
                  <FamilyEventCard key={event.id} event={event} people={people} variant="pill" />
                ))}
                {dayEvents.length > 4 && (
                  <p className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">+{dayEvents.length - 4} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
