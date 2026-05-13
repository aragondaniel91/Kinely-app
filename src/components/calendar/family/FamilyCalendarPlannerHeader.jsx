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

function FilterSelect({ icon: Icon, label, value, onChange, children }) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="hidden sm:inline">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="min-w-[92px] bg-transparent text-sm font-black text-slate-500 outline-none"
      >
        {children}
      </select>
    </label>
  );
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
    <header className="px-5 pt-4 md:px-8 md:pt-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50 text-base">🏠</span>
            <div>
              <p className="leading-none">Family Wall</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">{familyName(profile)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end">
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Family Calendar
            </h1>
            <span className="mb-1 inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              {visibleEventCount} events · {calendarRangeLabel(viewMode, anchorDate, weekStart, weekEnd)}
            </span>
          </div>

          <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-xl font-black text-slate-800">
            <CalendarDays className="h-5 w-5 text-blue-500" /> {format(anchorDate, "MMMM yyyy")}
          </button>
        </div>

        <div className="flex items-start justify-between gap-5 xl:block xl:text-right">
          <div>
            <p className="text-2xl font-black text-slate-950">{format(now, "h:mm a")}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{format(now, "EEE, MMM d")}</p>
          </div>
          <div className="xl:mt-4">
            <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-500">
              <CloudSun className="h-4 w-4" /> --°
            </div>
            <button type="button" onClick={onSync} className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm hover:text-blue-600">
              <RefreshCcw className="h-3.5 w-3.5" /> Sync calendar
            </button>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <FamilyCalendarLegend people={people} selectedPersonId={selectedPersonId} onSelectPerson={onSelectPerson} />

        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect icon={UserRound} label="Person" value={selectedPersonId} onChange={onSelectPerson}>
            <option value={FAMILY_ASSIGNMENT_ID}>All</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </FilterSelect>

          <FilterSelect icon={Tag} label="Category" value={selectedCategory} onChange={onSelectCategory}>
            {categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </FilterSelect>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevious} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={onToday} className="rounded-2xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">
            Today
          </button>
          <button type="button" onClick={onNext} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex w-fit overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {["day", "week", "month"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange?.(mode)}
              className={cn(
                "rounded-xl px-5 py-2 text-sm font-black capitalize transition",
                viewMode === mode ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
