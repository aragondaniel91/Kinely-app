import React, { useState } from "react";
import { Heart, Layers, Users } from "lucide-react";

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

export default function Calendar() {
  const [activeTab, setActiveTab] = useState("family");
  const [viewMode, setViewMode] = useState("week");
  const [showFilters, setShowFilters] = useState(true);

  return (
    <div className="min-h-full bg-background">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 md:px-5 py-2">
          <div className="flex justify-center">
            <div className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 p-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
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

      <div className="pb-28 md:pb-6">
        {activeTab === "custody" && (
          <CustodyCalendar
            viewMode={viewMode}
            setViewMode={setViewMode}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        )}

        {activeTab === "family" && (
          <FamilyCalendarView
            viewMode={viewMode}
            setViewMode={setViewMode}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        )}

        {activeTab === "mixed" && (
          <MixedCalendarView
            viewMode={viewMode}
            setViewMode={setViewMode}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        )}
      </div>
    </div>
  );
}
