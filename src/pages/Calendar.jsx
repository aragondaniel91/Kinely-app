import React, { useState } from "react";
import { CalendarDays, Heart, Users, Layers, Plus, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CustodyCalendar from "@/pages/CustodyCalendar";

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

function FamilyCalendarPlaceholder() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold font-heading">Family Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Activities, school events, appointments, practices, pickups, and
            family notes.
          </p>
        </div>

        <Button disabled className="gap-2">
          <Plus className="w-4 h-4" />
          Add Event
        </Button>
      </div>

      <Card className="p-5 border-dashed">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-blue-700" />
          </div>

          <div>
            <p className="font-bold">Family events are coming next</p>
            <p className="text-sm text-muted-foreground mt-1">
              In the next block we will create a Firestore collection called{" "}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                familyEvents
              </span>{" "}
              and add a modal to create activities like baseball practice,
              school events, doctor appointments, birthdays, pickup notes, and
              family reminders.
            </p>

            <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
              Example: “Pick up Joaquín at 3:00 PM for baseball practice.”
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

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
      <div className="sticky top-[45px] z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>

            <div>
              <h1 className="font-heading font-bold text-lg leading-tight">
                Calendar
              </h1>
              <p className="text-xs text-muted-foreground">
                Custody, family activities, and mixed planning
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-2xl border px-2 py-2.5 text-left transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        active
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    />

                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{tab.label}</p>
                      <p
                        className={cn(
                          "text-[10px] truncate hidden sm:block",
                          active
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {tab.description}
                      </p>
                    </div>
                  </div>
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
        {activeTab === "family" && <FamilyCalendarPlaceholder />}
        {activeTab === "mixed" && <MixedCalendarPlaceholder />}
      </div>
    </div>
  );
}
