import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import FamilyEventCard from "@/components/calendar/family/FamilyEventCard";

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 82;
const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);

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
  return Math.max(52, ((end - start) / 60) * HOUR_HEIGHT);
}

function eventTop(event = {}) {
  if (event.isAllDay || event.is_all_day) return 0;
  const start = timeToMinutes(event.startTime || event.start_time);
  return Math.max(0, ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT);
}

function columnClass(viewMode) {
  return viewMode === "day" ? "grid-cols-[76px_minmax(520px,760px)] justify-center" : "grid-cols-[76px_repeat(7,minmax(160px,1fr))]";
}

export default function FamilyCalendarTimelineGrid({ viewMode = "week", timelineDays = [], eventsByDay, people = [], onAddDate }) {
  return (
    <div className="border-t border-slate-100 bg-white">
      <div className="overflow-x-auto">
        <div className={cn("grid min-w-[1120px] border-b border-slate-100", columnClass(viewMode))}>
          <div className="border-r border-slate-100 bg-white" />
          {timelineDays.map((day) => {
            const today = isToday(day);
            return (
              <div key={format(day, "yyyy-MM-dd")} className={cn("border-r border-slate-100 px-3 py-3 text-center last:border-r-0", today && "bg-blue-50/40")}>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{format(day, "EEE")}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <p className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-black", today ? "bg-blue-600 text-white" : "text-slate-950")}>{format(day, "d")}</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400">{format(day, "MMM")}</p>
              </div>
            );
          })}
        </div>

        <div className={cn("grid min-w-[1120px]", columnClass(viewMode))}>
          <div className="border-r border-slate-100 bg-white">
            <div className="h-10 border-b border-slate-100 px-2 py-2 text-[11px] font-bold text-slate-400">All-day</div>
            {hours.map((hour) => (
              <div key={hour} className="border-b border-slate-100 px-2 pt-2 text-right text-[11px] font-bold text-slate-400" style={{ height: HOUR_HEIGHT }}>
                {hourLabel(hour)}
              </div>
            ))}
          </div>

          {timelineDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const today = isToday(day);
            const dayEvents = eventsByDay.get(key) || [];
            const allDayEvents = dayEvents.filter((event) => event.isAllDay || event.is_all_day);
            const timedEvents = dayEvents.filter((event) => !(event.isAllDay || event.is_all_day));

            return (
              <div key={key} className={cn("group relative border-r border-slate-100 last:border-r-0", today && "bg-blue-50/20")}>
                <div className="h-10 border-b border-slate-100 p-1.5">
                  <div className="flex gap-1 overflow-hidden">
                    {allDayEvents.slice(0, 2).map((event) => (
                      <FamilyEventCard key={event.id} event={event} people={people} variant="pill" />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddDate?.(day)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-slate-300 opacity-0 shadow-sm ring-1 ring-slate-100 transition hover:text-blue-600 group-hover:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                <div className="relative bg-white/70" style={{ height: hours.length * HOUR_HEIGHT }}>
                  {hours.map((hour) => (
                    <div key={hour} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }}>
                      <div className="h-1/2 border-b border-dashed border-slate-100/80" />
                    </div>
                  ))}

                  {timedEvents.map((event, index) => {
                    const lane = index % 3;
                    return (
                      <div
                        key={event.id}
                        className="absolute"
                        style={{
                          top: eventTop(event),
                          height: eventHeight(event),
                          left: 8 + lane * 10,
                          right: 8,
                          zIndex: 10 + lane,
                        }}
                      >
                        <FamilyEventCard event={event} people={people} variant="timeline" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
