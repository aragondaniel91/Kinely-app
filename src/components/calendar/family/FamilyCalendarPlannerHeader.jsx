import { ChevronLeft, ChevronRight, RefreshCcw, Tag, UserRound, CalendarHeart } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import FamilyCalendarLegend from "@/components/calendar/family/FamilyCalendarLegend";
import FamilyCalendarMonthPicker from "@/components/calendar/family/FamilyCalendarMonthPicker";
import FamilyCalendarFilterDropdown from "@/components/calendar/family/FamilyCalendarFilterDropdown";
import { ALL_ASSIGNMENT_ID } from "@/components/calendar/family/hooks/useFamilyCalendarFilters";
import { buildCategoryFilterOptions, buildPersonFilterOptions } from "@/components/calendar/family/familyCalendarFilterOptions";

export function calendarRangeLabel(viewMode, anchorDate, weekStart, weekEnd) {
  if (viewMode === "day") return format(anchorDate, "MMM d, yyyy");
  if (viewMode === "week") return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  return format(anchorDate, "MMMM yyyy");
}

function ViewModeSwitch({ viewMode, onViewModeChange }) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur">
      {["day", "week", "month"].map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onViewModeChange?.(mode)}
          className={cn(
            "min-w-[68px] rounded-[0.85rem] px-3 py-2 text-sm font-black capitalize transition sm:min-w-[76px]",
            viewMode === mode
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
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
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" onClick={onPrevious} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-400 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onToday} className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
        Today
      </button>
      <button type="button" onClick={onNext} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-400 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function FamilyCalendarPlannerHeader({
  people = [],
  now,
  anchorDate,
  viewMode,
  visibleEventCount = 0,
  selectedPersonId = ALL_ASSIGNMENT_ID,
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
  onChangeMonth,
  onPreviousMonth,
  onNextMonth,
}) {
  const rangeText = calendarRangeLabel(viewMode, anchorDate, weekStart, weekEnd);
  const personOptions = buildPersonFilterOptions(people);
  const categoryFilterOptions = buildCategoryFilterOptions(categoryOptions);

  return (
    <header className="kinly-family-gradient p-4 md:p-5 lg:p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100">
              <CalendarHeart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600/80">
                Kinly Planner
              </p>
              <h1 className="mt-1 text-3xl font-black leading-none tracking-tight text-slate-950 sm:text-[2.35rem]">
                Family Calendar
              </h1>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <FamilyCalendarMonthPicker
              anchorDate={anchorDate}
              onChangeMonth={onChangeMonth}
              onPreviousMonth={onPreviousMonth}
              onNextMonth={onNextMonth}
            />
            <div className="hidden text-sm font-semibold text-slate-500 xl:block">
              Family routines, appointments and moments.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:min-w-[560px] xl:items-end">
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="rounded-2xl bg-white/75 px-4 py-2 text-right shadow-sm backdrop-blur">
              <p className="text-xl font-black leading-none text-slate-950">{format(now, "h:mm a")}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{format(now, "EEE, MMM d")}</p>
            </div>
            <button type="button" onClick={onSync} className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/75 px-3 py-2 text-xs font-black text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">
              <RefreshCcw className="h-3.5 w-3.5" /> Sync
            </button>
          </div>

          <div className="family-scroll-x w-full pb-1">
            <div className="flex w-max min-w-full gap-3 xl:justify-end">
              <FamilyCalendarFilterDropdown
                icon={UserRound}
                label="Person"
                value={selectedPersonId}
                options={personOptions}
                onChange={onSelectPerson}
              />
              <FamilyCalendarFilterDropdown
                icon={Tag}
                label="Category"
                value={selectedCategory}
                options={categoryFilterOptions}
                onChange={onSelectCategory}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/70 pt-3">
        <FamilyCalendarLegend people={people} selectedPersonId={selectedPersonId} onSelectPerson={onSelectPerson} />
      </div>

      <div className="mt-3 flex flex-col gap-3 border-t border-white/70 pt-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <DateNavigation onPrevious={onPrevious} onToday={onToday} onNext={onNext} />
          <span className="rounded-full bg-white/75 px-3 py-2 text-sm font-black text-slate-500 shadow-sm">
            {visibleEventCount} events · {rangeText}
          </span>
        </div>
        <ViewModeSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </header>
  );
}
