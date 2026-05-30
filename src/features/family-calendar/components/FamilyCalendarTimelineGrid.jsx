import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import FamilyEventCard from "@/features/family-calendar/components/FamilyEventCard";
import {
  FAMILY_CALENDAR_ALL_DAY_HEIGHT,
  FAMILY_CALENDAR_HOUR_HEIGHT,
  buildTimelineHourRange,
  hourLabel,
} from "@/features/family-calendar/utils/familyCalendarUi";
import { buildTimelineLayout } from "@/features/family-calendar/utils/familyCalendarLayout";

function columnClass(viewMode) {
  return viewMode === "day"
    ? "grid-cols-[74px_minmax(520px,760px)] justify-center"
    : "grid-cols-[74px_repeat(7,minmax(126px,1fr))]";
}

function minWidthClass(viewMode) {
  return viewMode === "day" ? "min-w-[760px]" : "min-w-[980px]";
}

function splitDayEvents(dayEvents = []) {
  const allDayEvents = dayEvents.filter((event) => event.isAllDay || event.is_all_day || !event.startTime);
  const timedEvents = dayEvents.filter((event) => !(event.isAllDay || event.is_all_day) && event.startTime);
  return { allDayEvents, timedEvents };
}

export default function FamilyCalendarTimelineGrid({
  viewMode = "week",
  timelineDays = [],
  eventsByDay,
  people = [],
  canWrite = false,
  onAddDate,
  onEventSelect,
  onOverflowSelect,
}) {
  const allTimedEvents = timelineDays.flatMap((day) => {
    const key = format(day, "yyyy-MM-dd");
    const dayEvents = eventsByDay.get(key) || [];
    return splitDayEvents(dayEvents).timedEvents;
  });
  const timelineRange = buildTimelineHourRange(allTimedEvents);
  const timelineHours = timelineRange.hours;
  const timelineHeight = FAMILY_CALENDAR_ALL_DAY_HEIGHT + timelineHours.length * FAMILY_CALENDAR_HOUR_HEIGHT;

  return (
    <div className="relative overflow-x-auto rounded-b-[2rem] bg-white">
      <div className={cn(viewMode === "day" && "flex justify-center")}>
        <div className={cn("w-full", viewMode === "day" ? "max-w-[760px]" : minWidthClass(viewMode))}>
          <div className={cn("grid border-b border-slate-200", columnClass(viewMode))}>
            <div className="border-r border-slate-200 bg-white" />
            {timelineDays.map((day) => {
              const today = isToday(day);
              return (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className={cn(
                    "border-r border-slate-200 py-4 text-center last:border-r-0",
                    today && "bg-blue-50/60"
                  )}
                >
                  <p className="text-base font-extrabold text-slate-900">{format(day, "EEE d")}</p>
                  <p className="text-xs font-semibold text-slate-500">{format(day, "MMM")}</p>
                </div>
              );
            })}
          </div>

          <div
            className={cn("grid", columnClass(viewMode))}
            style={{ height: timelineHeight }}
          >
            <div className="relative border-r border-slate-200 bg-white">
              <div
                className="flex items-center justify-center border-b border-slate-200 text-xs font-semibold text-slate-500"
                style={{ height: FAMILY_CALENDAR_ALL_DAY_HEIGHT }}
              >
                All-day
              </div>
              {timelineHours.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-slate-100 pr-2 pt-2 text-right text-sm font-semibold text-slate-500"
                  style={{ height: FAMILY_CALENDAR_HOUR_HEIGHT }}
                >
                  {hourLabel(hour)}
                </div>
              ))}
            </div>

            {timelineDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const today = isToday(day);
              const dayEvents = eventsByDay.get(key) || [];
              const { allDayEvents, timedEvents } = splitDayEvents(dayEvents);
              const { layoutMap, overflowBadges } = buildTimelineLayout(timedEvents, { timelineRange });

              return (
                <div
                  key={key}
                  className={cn(
                    "group relative border-r border-slate-200 last:border-r-0",
                    canWrite ? "cursor-pointer" : "cursor-default",
                    today && "bg-blue-50/30"
                  )}
                  onClick={() => {
                    if (canWrite) onAddDate?.(day);
                  }}
                >
                  <div
                    className="space-y-1 overflow-hidden border-b border-slate-200 p-2"
                    style={{ height: FAMILY_CALENDAR_ALL_DAY_HEIGHT }}
                  >
                    {allDayEvents.slice(0, 2).map((event) => (
                      <div key={event.id} onClick={(e) => e.stopPropagation()}>
                        <FamilyEventCard
                          event={event}
                          people={people}
                          variant="pill"
                          onClick={(selectedEvent, anchorRect) => onEventSelect?.(selectedEvent, anchorRect)}
                        />
                      </div>
                    ))}
                    {allDayEvents.length > 2 && (
                      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-center text-[10px] font-extrabold leading-4 text-slate-500">
                        +{allDayEvents.length - 2} more
                      </p>
                    )}
                  </div>

                  {canWrite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddDate?.(day);
                      }}
                      className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-slate-300 opacity-0 shadow-sm ring-1 ring-slate-100 transition hover:text-blue-600 group-hover:opacity-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {timelineHours.map((hour) => (
                    <div key={hour} className="border-b border-slate-100" style={{ height: FAMILY_CALENDAR_HOUR_HEIGHT }} />
                  ))}

                  {timedEvents.map((event) => {
                    const layout = layoutMap.get(event.id);
                    if (!layout) return null;

                    return (
                      <div
                        key={event.id}
                        className="absolute"
                        onClick={(e) => e.stopPropagation()}
                        style={layout}
                      >
                        <FamilyEventCard
                          event={event}
                          people={people}
                          variant="timeline"
                          onClick={(selectedEvent, anchorRect) => onEventSelect?.(selectedEvent, anchorRect)}
                        />
                      </div>
                    );
                  })}

                  {overflowBadges.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      aria-label={badge.ariaLabel}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOverflowSelect?.(badge, e.currentTarget.getBoundingClientRect());
                      }}
                      className="absolute flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-sm font-black text-slate-700 shadow-md shadow-slate-900/10 transition hover:scale-105 hover:bg-slate-50"
                      style={{
                        top: badge.top,
                        right: badge.right,
                        zIndex: badge.zIndex,
                      }}
                    >
                      +{badge.count}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
