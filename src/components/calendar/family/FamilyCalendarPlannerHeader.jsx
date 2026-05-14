import { ChevronLeft, ChevronRight, RefreshCcw, Tag, UserRound } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import FamilyCalendarLegend from "@/components/calendar/family/FamilyCalendarLegend";
import FamilyCalendarMonthPicker from "@/components/calendar/family/FamilyCalendarMonthPicker";
import FamilyCalendarFilterDropdown from "@/components/calendar/family/FamilyCalendarFilterDropdown";
import FamilyCalendarWeatherWidget from "@/components/calendar/family/FamilyCalendarWeatherWidget";
import FamilyCalendarFamilySelector from "@/components/calendar/family/FamilyCalendarFamilySelector";
import { ALL_ASSIGNMENT_ID, FAMILY_ASSIGNMENT_ID } from "@/components/calendar/family/hooks/useFamilyCalendarFilters";

const FAMILY_FILTER_COLOR_CLASS = "bg-gradient-to-r from-blue-500 via-emerald-500 to-orange-500";

export function calendarRangeLabel(viewMode, anchorDate, weekStart, weekEnd) {
  if (viewMode === "day") return format(anchorDate, "MMM d, yyyy");
  if (viewMode === "week") return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  return format(anchorDate, "MMMM yyyy");
}

function buildPersonFilterOptions(people = []) {
  return [
    { value: ALL_ASSIGNMENT_ID, label: "All", colorClass: FAMILY_FILTER_COLOR_CLASS },
    { value: FAMILY_ASSIGNMENT_ID, label: "Family", colorClass: FAMILY_FILTER_COLOR_CLASS },
    ...people.map((person) => ({
      value: person.id,
      label: person.displayName,
      colorClass: colorClasses(person.colorId || "family", "slate").dot,
    })),
  ];
}

function buildCategoryFilterOptions(categoryOptions = []) {
  return categoryOptions.map((category) => ({
    value: category.value,
    label: category.label,
    icon: category.emoji || "📌",
  }));
}

function ViewModeSwitch({ viewMode, onViewModeChange }) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {["day", "week", "month"].map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onViewModeChange?.(mode)}
          className={cn(
            "min-w-[76px] px-4 py-2.5 text-sm font-black capitalize transition sm:min-w-[82px] sm:px-5",
            viewMode === mode ? "bg-blue-600 text-white" : "text-slate-800 hover:bg-slate-50"
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
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <button type="button" onClick={onPrevious} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onToday} className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 sm:px-7">
        Today
      </button>
      <button type="button" onClick={onNext} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700">
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
    <header className="bg-white px-4 pt-5 sm:px-6 lg:px-7">
      <div className="grid gap-6 xl:grid-cols-[minmax(320px,1fr)_auto] xl:gap-8">
        <div className="min-w-0">
          <FamilyCalendarFamilySelector />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black leading-none tracking-tight text-slate-950 sm:text-[2.65rem]">Family Calendar</h1>
          </div>

          <div className="mt-5">
            <FamilyCalendarMonthPicker
              anchorDate={anchorDate}
              onChangeMonth={onChangeMonth}
              onPreviousMonth={onPreviousMonth}
              onNextMonth={onNextMonth}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:min-w-[470px] xl:items-end xl:justify-between xl:gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4 xl:block xl:text-right">
            <div className="shrink-0 xl:ml-auto">
              <p className="text-2xl font-black leading-none text-slate-950">{format(now, "h:mm a")}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{format(now, "EEE, MMM d")}</p>
            </div>
            <div className="min-w-[150px] xl:mt-3">
              <FamilyCalendarWeatherWidget />
            </div>
            <button type="button" onClick={onSync} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600 xl:mt-5 xl:border-0 xl:px-0 xl:py-0 xl:shadow-none">
              <RefreshCcw className="h-3.5 w-3.5" /> Sync calendar
            </button>
          </div>

          <div className="family-scroll-x pb-1 xl:w-full">
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

      <div className="mt-6">
        <FamilyCalendarLegend people={people} selectedPersonId={selectedPersonId} onSelectPerson={onSelectPerson} />
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 py-4 lg:mt-8 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-semibold text-slate-500">
          {visibleEventCount} events · {rangeText}
        </p>

        <div className="family-scroll-x pb-1">
          <div className="flex w-max items-center gap-4 pr-2 lg:gap-8">
            <DateNavigation onPrevious={onPrevious} onToday={onToday} onNext={onNext} />
            <ViewModeSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} />
          </div>
        </div>
      </div>
    </header>
  );
}
