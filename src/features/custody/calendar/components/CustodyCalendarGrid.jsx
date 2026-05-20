import { format, isSameMonth } from "date-fns";

import CustodyDayCard from "@/features/custody/calendar/components/CustodyDayCard";
import { normalizeDate } from "@/features/custody/calendar/utils/custodyDateUtils";

export default function CustodyCalendarGrid({
  viewMode,
  period,
  weekLabels,
  anchorDate,
  visibleCustodyMap,
  visibleCustodyDays,
  specialEventsByDate,
  travelPlansByDate,
  canWrite,
  setSelectedDate,
  dadTheme,
  momTheme,
  dadName,
  momName,
}) {
  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekLabels.map((d) => (
          <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-gray-400 py-1 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {period.days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const custody = visibleCustodyMap[key];
          const originalCustody = visibleCustodyDays.find((item) => normalizeDate(item.date) === key);
          const filteredOut = originalCustody && !custody;
          const inMonth = viewMode === "month" ? isSameMonth(day, anchorDate) : true;

          return (
            <CustodyDayCard key={key} day={day} custody={custody} specialEvents={specialEventsByDate[key] || []} travelPlans={travelPlansByDate[key] || []} canWrite={canWrite} onClick={() => canWrite && setSelectedDate(day)} dadTheme={dadTheme} momTheme={momTheme} dadName={dadName} momName={momName} compact={viewMode === "month"} inMonth={inMonth && !filteredOut} />
          );
        })}
      </div>
    </>
  );
}
