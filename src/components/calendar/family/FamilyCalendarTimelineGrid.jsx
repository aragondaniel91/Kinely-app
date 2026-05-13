import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import FamilyEventCard from "@/components/calendar/family/FamilyEventCard";

const hours = Array.from({ length: 13 }, (_, index) => index + 7);

function timeToMinutes(value = "") {
  if (!value) return 9 * 60;
  const [hour = "9", minute = "0"] = String(value).split(":");
  return Number(hour) * 60 + Number(minute);
}

function hourLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour;
  return `${display} ${suffix}`;
}

function eventHeight(event = {}) {
  if (event.isAllDay || event.is_all_day) return 24;
  const start = timeToMinutes(event.startTime || event.start_time);
  const end = timeToMinutes(event.endTime || event.end_time) || start + 60;
  return Math.max(44, ((end - start) / 60) * 76);
}

function eventTop(event = {}) {
  if (event.isAllDay || event.is_all_day) return 0;
  const start = timeToMinutes(event.startTime || event.start_time);
  return Math.max(0, ((start - 7 * 60) / 60) * 76);
}

export default function FamilyCalendarTimelineGrid({ viewMode = "week", timelineDays = [], eventsByDay, people = [], onAddDate }) {
  return (
    <div className="border-t border-slate-100 bg-white">
      <div className={cn("grid border-b border-slate-100", viewMode === "day" ? "grid-cols-[72px_1fr]" : "grid-cols-[72px_repeat(7,minmax(0,1fr))]") }>
        <div className="border-r border-slate-100" />
        {timelineDays.map((day) => (
          <div key={format(day, "yyyy-MM-dd")} className="border-r border-slate-100 px-3 py-3 text-center last:border-r-0">
            <p className="text-xs font-black text-slate-400">{format(day, "EEE")}</p>
            <p className={cn("mt-1 text-sm font-black", isToday(day) ? "text-blue-600" : "text-slate-950")}>{format(day, "d")}</p>
            <p className="text-[10px] font-bold text-slate-400">{format(day, "MMM")}</p>
          </div>
        ))}
      </div>

      <div className={cn("grid", viewMode === "day" ? "grid-cols-[72px_1fr]" : "grid-cols-[72px_repeat(7,minmax(0,1fr))]") }>
        <div className="border-r border-slate-100 bg-white">
          <div className="h-9 border-b border-slate-100 px-2 py-2 text-[11px] font-bold text-slate-400">All-day</div>
          {hours.map((hour) => (
            <div key={hour} className="h-[76px] border-b border-slate-100 px-2 pt-2 text-right text-[11px] font-bold text-slate-400">
              {hourLabel(hour)}
            </div>
          ))}
        </div>

        {timelineDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const allDayEvents = dayEvents.filter((event) => event.isAllDay || event.is_all_day);
          const timedEvents = dayEvents.filter((event) => !(event.isAllDay || event.is_all_day));

          return (
            <div key={key} className="group relative border-r border-slate-100 last:border-r-0">
              <div className="h-9 border-b border-slate-100 p-1">
                {allDayEvents.slice(0, 1).map((event) => (
                  <FamilyEventCard key={event.id} event={event} people={people} variant="pill" />
                ))}
              </div>

              <button type="button" onClick={() => onAddDate?.(day)} className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-1 text-slate-300 opacity-0 shadow-sm transition hover:text-blue-600 group-hover:opacity-100">
                <Plus className="h-3.5 w-3.5" />
              </button>

              <div className="relative h-[988px] bg-white">
                {hours.map((hour) => <div key={hour} className="h-[76px] border-b border-slate-100" />)}
                {timedEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="absolute left-2 right-2"
                    style={{
                      top: eventTop(event),
                      height: eventHeight(event),
                      transform: `translateX(${(index % 3) * 8}px)`,
                      width: `calc(100% - ${16 + (index % 3) * 8}px)`,
                    }}
                  >
                    <FamilyEventCard event={event} people={people} variant="timeline" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
