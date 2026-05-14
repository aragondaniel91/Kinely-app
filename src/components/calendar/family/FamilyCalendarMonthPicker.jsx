import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const months = Array.from({ length: 12 }, (_, index) => index);

export default function FamilyCalendarMonthPicker({ anchorDate, onChangeMonth, onPreviousMonth, onNextMonth }) {
  const currentYear = anchorDate.getFullYear();
  const currentMonth = anchorDate.getMonth();
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);

  return (
    <div className="group relative inline-block">
      <button
        type="button"
        className="inline-flex items-center gap-2 text-2xl font-black text-slate-900"
      >
        <CalendarDays className="h-5 w-5 text-blue-500" /> {format(anchorDate, "MMM yyyy")}
      </button>

      <div className="invisible absolute left-0 top-full z-[70] mt-3 w-[360px] rounded-3xl border border-slate-200 bg-white p-4 opacity-0 shadow-2xl shadow-slate-900/15 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={onPreviousMonth} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-black text-slate-900">Jump to month</p>
          <button type="button" onClick={onNextMonth} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => onChangeMonth?.(new Date(year, currentMonth, 1))}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-black transition",
                year === currentYear ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {year}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {months.map((month) => (
            <button
              key={month}
              type="button"
              onClick={() => onChangeMonth?.(new Date(currentYear, month, 1))}
              className={cn(
                "rounded-2xl border px-3 py-3 text-sm font-black transition",
                month === currentMonth
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {format(new Date(currentYear, month, 1), "MMM")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
