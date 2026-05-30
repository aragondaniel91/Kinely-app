import React, { useMemo, useState } from "react";

import {
  family,
  people,
  tasks,
  meals,
  groceries,
  familyEvents,
  custodyToday,
  recentUpdates,
  weather,
  familyNote,
} from "@/prototype/mockData";

import PrototypeTopBar from "@/prototype/components/PrototypeTopBar";
import TodaysRhythm from "@/prototype/components/TodaysRhythm";
import TodayByPerson from "@/prototype/components/TodayByPerson";
import FamilySnapshot from "@/prototype/components/FamilySnapshot";
import TasksNeedAttention from "@/prototype/components/TasksNeedAttention";
import MealPlanCard from "@/prototype/components/MealPlanCard";
import UpcomingEvents from "@/prototype/components/UpcomingEvents";
import FamilyHub from "@/prototype/components/FamilyHub";
import BottomNav from "@/prototype/components/BottomNav";

export default function KinelyHomePrototype() {
  const [dark, setDark] = useState(false);
  const [custodyEnabled, setCustodyEnabled] = useState(family.custodyEnabled);

  const overdueCount = useMemo(() => tasks.filter((task) => task.overdue).length, []);
  const nextEvent = familyEvents[0];

  const summary = useMemo(() => {
    const attention = tasks.length;
    return `${attention} tasks need attention · Dinner is planned · ${nextEvent.title} at ${nextEvent.time}`;
  }, [nextEvent]);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(91,141,239,0.12),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(255,209,102,0.12),transparent_28%),linear-gradient(180deg,#f8f7f4_0%,#ffffff_56%,#f8fafc_100%)] font-body text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,rgba(91,141,239,0.14),transparent_36%),radial-gradient(circle_at_85%_15%,rgba(123,201,161,0.10),transparent_30%),linear-gradient(180deg,#0c1626_0%,#0f1c30_55%,#0b1422_100%)] dark:text-slate-50">
        <PrototypeTopBar
          familyName={family.shortName}
          dark={dark}
          onToggleTheme={() => setDark((value) => !value)}
          custodyEnabled={custodyEnabled}
          onToggleCustody={() => setCustodyEnabled((value) => !value)}
        />

        <main className="mx-auto max-w-7xl px-3 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-3 md:px-5">
          <div className="space-y-4">
            <TodaysRhythm
              familyName={family.name}
              weather={weather}
              summary={summary}
              nextEvent={nextEvent}
              custodyEnabled={custodyEnabled}
              custodyToday={custodyToday}
            />

            {/* Wall-screen command center grid: people + snapshot on the left, the
                day's detail rail on the right. Stacks gracefully on smaller screens. */}
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <TodayByPerson people={people} />
                <FamilySnapshot
                  tasks={tasks.length}
                  overdueCount={overdueCount}
                  nextEvent={nextEvent}
                  dinner={meals.dinner}
                  groceries={groceries}
                  weather={weather}
                  recentUpdate={recentUpdates[0]}
                  custodyEnabled={custodyEnabled}
                  custodyToday={custodyToday}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TasksNeedAttention tasks={tasks} />
                  <MealPlanCard meals={meals} />
                </div>
              </div>

              <div className="space-y-4">
                <UpcomingEvents
                  events={familyEvents}
                  custodyEnabled={custodyEnabled}
                  custodyToday={custodyToday}
                />
                <FamilyHub custodyEnabled={custodyEnabled} familyNote={familyNote} />
              </div>
            </div>
          </div>
        </main>

        <BottomNav custodyEnabled={custodyEnabled} />
      </div>
    </div>
  );
}
