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
    shortLabel: "Custody",
    icon: Heart,
  },
  {
    id: "family",
    label: "Family",
    shortLabel: "Family",
    icon: Users,
  },
  {
    id: "mixed",
    label: "Mixed",
    shortLabel: "Mixed",
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
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const activeViewLabel =
    viewModes.find((mode) => mode.id === viewMode)?.label || "Week";

  const handleViewChange = (nextViewMode) => {
    setViewMode(nextViewMode);
    setShowScheduleMenu(false);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-3 md:px-5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>

              <div className="min-w-0">
                <h1 className="font-heading font-black text-lg leading-tight">
                  Calendar
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  Custody, activities, and planning
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowScheduleMenu((prev) => !prev)}
                  className="h-9 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-bold text-foreground shadow-sm hover:border-primary/40 transition"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Schedule</span>
                  <span>{activeViewLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                {showScheduleMenu && (
                  <div className="absolute right-0 mt-2 w-40 rounded-2xl border bg-popover shadow-lg p-1 z-50">
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
                  "h-9 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-bold shadow-sm transition",
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

          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
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
                  <span>{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
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
