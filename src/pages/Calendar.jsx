import React, { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Filter,
  Heart,
  Layers,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import CustodyCalendar from "@/pages/CustodyCalendar";
import FamilyCalendarView from "@/components/calendar/FamilyCalendarView";
import MixedCalendarView from "@/components/calendar/MixedCalendarView";

const tabs = [
  {
    id: "custody",
    label: "Custody",
    icon: Heart,
  },
  {
    id: "family",
    label: "Family",
    icon: Users,
  },
  {
    id: "mixed",
    label: "Mixed",
    icon: Layers,
  },
];

const viewModes = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export default function Calendar() {
  const [activeTab, setActiveTab] = useState("custody");
  const [viewMode, setViewMode] = useState("week");
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveTabIcon = activeTabData.icon;

  const activeViewLabel =
    viewModes.find((mode) => mode.id === viewMode)?.label || "Week";

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setShowViewMenu(false);
  };

  const handleViewChange = (nextViewMode) => {
    setViewMode(nextViewMode);
    setShowViewMenu(false);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 md:px-5 py-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-primary" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-heading font-black text-sm sm:text-base leading-tight">
                      Calendar
                    </p>

                    <span className="hidden sm:inline text-muted-foreground">
                      /
                    </span>

                    <div className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                      <ActiveTabIcon className="w-3.5 h-3.5" />
                      {activeTabData.label}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate sm:hidden">
                    {activeTabData.label} · {activeViewLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowViewMenu((prev) => !prev)}
                    className="h-8 sm:h-9 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-bold text-foreground shadow-sm hover:border-primary/40 active:scale-95 transition"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <span className="hidden sm:inline">Vista:</span>
                    <span>{activeViewLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>

                  {showViewMenu && (
                    <div className="absolute right-0 mt-2 w-40 rounded-2xl border bg-popover shadow-xl p-1 z-50">
                      {viewModes.map((mode) => {
                        const active = viewMode === mode.id;

                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => handleViewChange(mode.id)}
                            className={cn(
                              "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <span>{mode.label}</span>
                            {active && <Check className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className={cn(
                    "h-8 sm:h-9 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-bold shadow-sm active:scale-95 transition",
                    showFilters
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 p-1 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5",
                          active
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        )}
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-28 md:pb-6">
        {activeTab === "custody" && (
          <CustodyCalendar viewMode={viewMode} showFilters={showFilters} />
        )}

        {activeTab === "family" && (
          <FamilyCalendarView viewMode={viewMode} showFilters={showFilters} />
        )}

        {activeTab === "mixed" && (
          <MixedCalendarView viewMode={viewMode} showFilters={showFilters} />
        )}
      </div>
    </div>
  );
}
