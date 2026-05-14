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
    <label className="flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm">
      <Icon className="h-4 w-4 text-slate-400" />
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="min-w-[88px] bg-transparent text-xs font-black text-slate-500 outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function ViewModeSwitch({ viewMode, onViewModeChange }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {["day", "week", "month"].map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onViewModeChange?.(mode)}
          className={cn(
            "rounded-xl px-5 py-2 text-sm font-black capitalize transition",
            viewMode === mode ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"
          )}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

function DateNavigation({ onPrevious, onToday, onNext }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrevious} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onToday} className="rounded-2xl border border-slate-200 bg-white px-6 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">
        Today
      </button>
      <button type="button" onClick={onNext} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
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
  const rangeText = calendarRangeLabel(viewMode, anchorDate, weekStart, weekEnd);

  return (
    <header className="bg-white px-5 pt-4 md:px-7 md:pt-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <span className="text-base">🏠</span>
            <div>
              <p className="leading-none">Family Wall</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">{familyName(profile)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Family Calendar</h1>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              {visibleEventCount} events · {rangeText}
            </span>
          </div>

          <button type="button" className="mt-3 inline-flex items-center gap-2 text-xl font-black text-slate-800">
            <CalendarDays className="h-5 w-5 text-blue-500" /> {format(anchorDate, "MMM yyyy")}
          </button>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-2xl font-black leading-none text-slate-950">{format(now, "h:mm a")}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{format(now, "EEE, MMM d")}</p>
          <div className="mt-3 flex items-center justify-end gap-4 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><CloudSun className="h-4 w-4" /> --°</span>
            <button type="button" onClick={onSync} className="inline-flex items-center gap-1.5 hover:text-blue-600">
              <RefreshCcw className="h-3.5 w-3.5" /> Sync
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 py-3 md:flex-row md:items-center md:justify-between">
        <DateNavigation onPrevious={onPrevious} onToday={onToday} onNext={onNext} />
        <ViewModeSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </header>
  );
}
