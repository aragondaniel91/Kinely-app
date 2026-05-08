import React, { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RefreshCw, Tags, User } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";
import { familyPersonColorMap, getColorMeta } from "@/lib/personColorUtils";

const fallbackPeople = [
  { label: "Daniel Aragon", color: "blue" },
  { label: "Amanda Arraga", color: "yellow" },
  { label: "Joaquin", color: "emerald" },
  { label: "Everyone", color: "family" },
];

const viewOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const monthOptions = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseMonthLabel(label) {
  const [rawMonth, rawYear] = String(label || "").split(/\s+/);
  const monthIndex = monthOptions.findIndex((month) => month.toLowerCase().startsWith(String(rawMonth || "").toLowerCase()));
  const year = Number(rawYear) || new Date().getFullYear();

  return {
    monthIndex: monthIndex >= 0 ? monthIndex : new Date().getMonth(),
    year,
  };
}

function familyDisplayName(family) {
  return family?.family_name || family?.familyName || family?.name || "Family";
}

function LegendDot({ color, colors = [] }) {
  if (color === "family") {
    const familyColors = colors.length > 0 ? colors : fallbackPeople.filter((person) => person.color !== "family").map((person) => person.color);

    return (
      <span className="flex h-4 w-4 overflow-hidden rounded-full border border-white shadow-sm">
        {familyColors.slice(0, 4).map((familyColor, index) => {
          const meta = getColorMeta(familyColor, "slate");
          return <span key={`${familyColor}-${index}`} className={cn("h-full flex-1", meta.dot)} />;
        })}
      </span>
    );
  }

  const meta = getColorMeta(color, "slate");
  return <span className={cn("h-4 w-4 rounded-full", meta.dot)} />;
}

function dedupePeopleByLabel(people) {
  const seen = new Set();

  return people.filter((person) => {
    const key = String(person.label || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function FamilyCalendarHeader({
  viewMode = "week",
  monthLabel = "May 2026",
  eventSummary = "17 events · May 2026",
  selectedPersonLabel = "All People",
  selectedCategoryLabel = "All Categories",
  currentTimeLabel = "--:--",
  currentDateLabel = "Today",
  weatherLabel = "--°",
  weatherDescription = "Weather",
  familyName = "Family",
  families = [],
  activeFamilyId = "",
  onFamilyChange = () => {},
  onViewModeChange = () => {},
  onPrevious = () => {},
  onToday = () => {},
  onNext = () => {},
  onMonthSelect = () => {},
  onPersonFilterClick = () => {},
  onCategoryFilterClick = () => {},
  onLegendPersonClick = () => {},
}) {
  const { user, profile } = useFamily();
  const parsedMonth = useMemo(() => parseMonthLabel(monthLabel), [monthLabel]);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [familyPickerOpen, setFamilyPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(parsedMonth.year);
  const familyOptions = families.length > 0 ? families : [{ id: activeFamilyId || "active-family", family_name: familyName }];
  const activeFamily = familyOptions.find((family) => family.id === activeFamilyId) || familyOptions[0];

  const { people: familyPeople } = useMemo(
    () => familyPersonColorMap(profile || {}, user, user?.email || ""),
    [profile, user]
  );
  const familyColors = useMemo(
    () => dedupePeopleByLabel(familyPeople).map((person) => person.color).filter(Boolean),
    [familyPeople]
  );
  const legendPeople = useMemo(() => {
    const mappedPeople = familyPeople.map((person) => ({
      label: person.label,
      color: person.color,
    }));

    return mappedPeople.length > 0
      ? dedupePeopleByLabel([...mappedPeople, { label: "Everyone", color: "family" }])
      : fallbackPeople;
  }, [familyPeople]);

  return (
    <div className="border-b border-slate-100 bg-white px-10 pb-2 pt-7">
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-10 gap-y-3">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="text-xl leading-none">🏠</span>
          <div className="relative">
            <p className="text-lg font-black leading-tight text-slate-900">Family Wall</p>
            <button
              type="button"
              onClick={() => familyOptions.length > 1 && setFamilyPickerOpen((open) => !open)}
              className="flex max-w-[280px] items-center gap-1 rounded-lg px-1 py-0.5 text-xs font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            >
              <span className="truncate">{familyDisplayName(activeFamily)}</span>
              {familyOptions.length > 1 && <span className="shrink-0 text-slate-400">⌄</span>}
            </button>

            {familyPickerOpen && familyOptions.length > 1 && (
              <div className="absolute left-0 top-14 z-[130] w-[300px] rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl">
                <p className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-wide text-slate-400">Switch family</p>
                <div className="space-y-1">
                  {familyOptions.map((family) => {
                    const active = family.id === activeFamilyId;
                    return (
                      <button
                        key={family.id}
                        type="button"
                        onClick={() => {
                          onFamilyChange(family.id);
                          setFamilyPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition",
                          active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{familyDisplayName(family)}</p>
                          <p className="text-[11px] font-semibold text-slate-400">Family space</p>
                        </div>
                        {active && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-end gap-8 text-right">
          <div>
            <p className="text-xl font-black leading-tight text-slate-950">{currentTimeLabel}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{currentDateLabel}</p>
          </div>
          <div>
            <p className="text-xl font-black leading-tight text-slate-950">{weatherLabel}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{weatherDescription}</p>
          </div>
        </div>

        <h1 className="text-[42px] font-black leading-none tracking-tight text-slate-950">
          Family Calendar
        </h1>

        <div className="flex justify-end gap-2">
          <button type="button" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span>Sync calendar</span>
          </button>
        </div>

        <div className="relative mt-2 w-fit">
          <button
            type="button"
            onClick={() => {
              setPickerYear(parsedMonth.year);
              setMonthPickerOpen((open) => !open);
            }}
            className="flex w-fit items-center gap-2 rounded-xl px-1 text-2xl font-bold text-slate-800 hover:bg-slate-50"
          >
            <span className="text-xl leading-none">🗓️</span>
            {monthLabel}
            <span className="text-base text-slate-400">⌄</span>
          </button>

          {monthPickerOpen && (
            <div className="absolute left-0 top-11 z-[120] w-[340px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => setPickerYear((year) => year - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-lg font-black text-slate-900">{pickerYear}</p>
                <button type="button" onClick={() => setPickerYear((year) => year + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {monthOptions.map((month, index) => {
                  const active = parsedMonth.monthIndex === index && parsedMonth.year === pickerYear;
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => {
                        onMonthSelect(index, pickerYear);
                        setMonthPickerOpen(false);
                      }}
                      className={cn(
                        "rounded-2xl px-3 py-3 text-sm font-extrabold",
                        active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                      )}
                    >
                      {month.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <button type="button" onClick={onPersonFilterClick} className="flex h-11 min-w-[220px] items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 text-left text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <User className="h-4 w-4 text-slate-500" />
            Person
            <span className="text-xs font-semibold text-slate-400">{selectedPersonLabel}</span>
            <span className="ml-auto text-slate-400">⌄</span>
          </button>
          <button type="button" onClick={onCategoryFilterClick} className="flex h-11 min-w-[230px] items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 text-left text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <Tags className="h-4 w-4 text-slate-500" />
            Category
            <span className="text-xs font-semibold text-slate-400">{selectedCategoryLabel}</span>
            <span className="ml-auto text-slate-400">⌄</span>
          </button>
        </div>

        <div className="col-span-2 flex mt-2 flex-wrap items-center gap-4 pt-1">
          {legendPeople.map((person) => {
            const active = selectedPersonLabel === person.label;
            return (
              <button
                key={person.label}
                type="button"
                onClick={() => onLegendPersonClick(person.label)}
                className={cn(
                  "flex items-center gap-3 rounded-full border px-3 py-1.5 transition",
                  active
                    ? "border-blue-600 bg-blue-50 shadow-sm"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                )}
              >
                <LegendDot color={person.color} colors={familyColors} />
                <span className={cn("text-base font-semibold", active ? "text-blue-700" : "text-slate-800")}>{person.label}</span>
              </button>
            );
          })}
        </div>

        <div className="self-center mt-3 pb-1 text-base font-semibold text-slate-600">
          {eventSummary}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-5 pb-1">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onPrevious} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={onToday} className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Today</button>
            <button type="button" onClick={onNext} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            {viewOptions.map((view) => (
              <button
                key={view.value}
                type="button"
                onClick={() => onViewModeChange(view.value)}
                className={
                  viewMode === view.value
                    ? 'min-w-[86px] border-r border-slate-200 bg-blue-600 px-5 py-3 text-sm font-black capitalize text-white last:border-r-0'
                    : 'min-w-[86px] border-r border-slate-200 bg-white px-5 py-3 text-sm font-black capitalize text-slate-700 hover:bg-slate-50 last:border-r-0'
                }
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
