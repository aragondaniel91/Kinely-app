import { CalendarDays, ChevronLeft, ChevronRight, CloudSun, RefreshCcw, Tag, UserRound } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import FamilyCalendarLegend from "@/components/calendar/family/FamilyCalendarLegend";

const FAMILY_ASSIGNMENT_ID = "family";

function familyName(profile) {
  return profile?.family_name || profile?.familyName || profile?.name || "Family";
}

export function calendarRangeLabel(viewMode, anchorDate, weekStart, weekEnd) {
  if (viewMode === "day") return format(anchorDate, "MMM d, yyyy");
  if (viewMode === "week") return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  return format(anchorDate, "MMMM yyyy");
}

export default function FamilyCalendarPlannerHeader({
  profile,
  people = [],
  now,
  anchorDate,
  viewMode,
  visibleEventCount = 0,
  selectedPersonId = FAMILY_ASSIGNMENT_ID,
  selectedCategory = "all",
  categoryOptions = [],
  weekStart,
  weekEnd,
  onSelectPerson,
  onSelectCategory,
  onPrevious,
  onToday,
  onNext,
  onViewModeChange,
  onSync,
}) {
  return (
    <div className="px-6 pt-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <span>🏠</span> Family Wall
          </div>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">{familyName(profile)}</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Family Calendar</h1>
          <button type="button" className="mt-4 inline-flex items-center gap-2 text-xl font-black text-slate-800">
            <CalendarDays className="h-5 w-5 text-blue-500" /> {format(anchorDate, "MMMM yyyy")}
          </button>
        </div>

        <div className="text-right">
          <p className="text-2xl font-black text-slate-950">{format(now, "h:mm a")}</p>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{format(now, "EEE, MMM d")}</p>
          <div className="mt-4 flex items-center justify-end gap-2 text-xs font-bold text-slate-500">
            <CloudSun className="h-4 w-4" /> --°
          </div>
          <button type="button" onClick={onSync} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600">
            <RefreshCcw className="h-3.5 w-3.5" /> Sync calendar
          </button>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <FamilyCalendarLegend people={people} selectedPersonId={selectedPersonId} onSelectPerson={onSelectPerson} />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm">
            <UserRound className="h-4 w-4 text-slate-400" />
            <span>Person</span>
            <select value={selectedPersonId} onChange={(event) => onSelectPerson?.(event.target.value)} className="bg-transparent text-slate-400 outline-none">
              <option value={FAMILY_ASSIGNMENT_ID}>All</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
            </select>
          </div>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm">
            <Tag className="h-4 w-4 text-slate-400" />
            <span>Category</span>
            <select value={selectedCategory} onChange={(event) => onSelectCategory?.(event.target.value)} className="bg-transparent text-slate-400 outline-none">
              {categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">
          {visibleEventCount} events · {calendarRangeLabel(viewMode, anchorDate, weekStart, weekEnd)}
        </p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onPrevious} className="rounded-full px-3 py-2 text-slate-400 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={onToday} className="rounded-xl border border-slate-200 bg-white px-6 py-2 text-sm font-black text-slate-700 shadow-sm">
            Today
          </button>
          <button type="button" onClick={onNext} className="rounded-full px-3 py-2 text-slate-400 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="ml-3 flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {["day", "week", "month"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange?.(mode)}
                className={cn(
                  "px-6 py-2 text-sm font-black capitalize",
                  viewMode === mode ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
