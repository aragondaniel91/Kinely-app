import { useMemo } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

function toDateKey(date) {
  return format(date, "yyyy-MM-dd");
}

function getSummaryDateRange(viewMode, anchorDate, weekStart, weekEnd) {
  if (viewMode === "month") {
    return {
      startKey: toDateKey(startOfMonth(anchorDate)),
      endKey: toDateKey(endOfMonth(anchorDate)),
    };
  }

  if (viewMode === "day") {
    const dayKey = toDateKey(anchorDate);
    return {
      startKey: dayKey,
      endKey: dayKey,
    };
  }

  return {
    startKey: toDateKey(weekStart),
    endKey: toDateKey(weekEnd),
  };
}

function eventIsInsideDateRange(event = {}, range = {}) {
  if (!event.date || !range.startKey || !range.endKey) return false;
  return event.date >= range.startKey && event.date <= range.endKey;
}

export function useFamilyCalendarDateRange({ anchorDate, viewMode = "week", filteredEvents = [] } = {}) {
  const weekStart = useMemo(() => startOfWeek(anchorDate, { weekStartsOn: 1 }), [anchorDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const timelineDays = viewMode === "day" ? [anchorDate] : weekDays;

  const summaryDateRange = useMemo(
    () => getSummaryDateRange(viewMode, anchorDate, weekStart, weekEnd),
    [viewMode, anchorDate, weekStart, weekEnd]
  );

  const summaryEventsForCurrentView = useMemo(
    () => filteredEvents.filter((event) => eventIsInsideDateRange(event, summaryDateRange)),
    [filteredEvents, summaryDateRange]
  );

  return {
    weekStart,
    weekEnd,
    monthDays,
    weekDays,
    timelineDays,
    summaryDateRange,
    summaryEventsForCurrentView,
  };
}
