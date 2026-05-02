import React, { useState } from "react";
import { CalendarDays, Heart, Users, Layers, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CustodyCalendar from "@/pages/CustodyCalendar";
import FamilyCalendarView from "@/components/calendar/FamilyCalendarView";

const tabs = [
  {
    id: "custody",
    label: "Custody",
    description: "Custody schedule",
    icon: Heart,
  },
  {
    id: "family",
    label: "Family",
    description: "Activities & events",
    icon: Users,
  },
  {
    id: "mixed",
    label: "Mixed",
    description: "Everything together",
    icon: Layers,
  },
];

function MixedCalendarPlaceholder() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold font-heading">Mixed Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Custody, family events, tasks, and meals in one filtered view.
          </p>
        </div>
      </div>

      <Card className="p-5 border-dashed">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-violet-700" />
          </div>

          <div>
            <p className="font-bold">Mixed view will combine everything</p>
            <p className="text-sm text-muted-foreground mt-1">
              This view will show custody days, family events, task due dates,
              and meals together. It will also include filters so you can show
              only what you need.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-3 py-1 font-semibold">
                Custody
              </span>
              <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 font-semibold">
                Events
              </span>
              <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-3 py-1 font-semibold">
                Tasks
              </span>
              <span className="text-xs rounded-full bg-purple-100 text-purple-700 px-3 py-1 font-semibold">
                Meals
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Calendar() {
  const [activeTab, setActiveTab] = useState("custody");

  return (
    <div className="min-h-full bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 py-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>

            <div>
              <h1 className="font-heading font-bold text-base leading-tight">
                Calendar
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Custody, activities, and planning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
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
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== "custody" && (
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 border rounded-xl p-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                This tab is scaffolded now. The next block will connect it to
                Firestore and add real family events.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        {activeTab === "custody" && <CustodyCalendar />}
        {activeTab === "family" && <FamilyCalendarView />}
        {activeTab === "mixed" && <MixedCalendarPlaceholder />}
      </div>
    </div>
  );
}
