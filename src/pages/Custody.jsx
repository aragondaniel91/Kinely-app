import React, { useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Repeat,
  Shirt,
  Trash2,
  Truck,
} from "lucide-react";

import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resetCustodyDays } from "@/lib/resetCustodyData";
import { useFamily } from "@/lib/FamilyContext";

const custodyTabs = [
  {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDays,
    description: "Custody calendar, manual days, and bulk schedule.",
  },
  {
    id: "templates",
    label: "Templates",
    icon: Repeat,
    description: "2-2-3, 2-5-5-2, week on/off, and custom rotations.",
  },
  {
    id: "exchange",
    label: "Exchange",
    icon: Truck,
    description: "Pickup/dropoff days, handoff notes, and reminders.",
  },
  {
    id: "packing",
    label: "Packing List",
    icon: Shirt,
    description: "Items needed for custody change days.",
  },
  {
    id: "budget",
    label: "Budget",
    icon: CreditCard,
    description: "Child expenses, cost split, purchases, and recurring payments.",
  },
];

function ComingSoonPanel({ icon: Icon, title, description, bullets }) {
  return (
    <div className="px-3 pb-8 pt-2 md:px-6">
      <Card className="mx-auto max-w-5xl rounded-[2rem] border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
            <Icon className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
              Coming next
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
              {description}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {bullets.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Custody() {
  const [activeCalendar, setActiveCalendar] = useState("custody");
  const [viewMode, setViewMode] = useState("month");
  const [activeSection, setActiveSection] = useState("schedule");
  const [isResetting, setIsResetting] = useState(false);
  const { user, familyId, isAdmin, isOwner } = useFamily();

  const canResetCustody = Boolean(user && familyId && (isAdmin || isOwner));
  const activeTab = custodyTabs.find((tab) => tab.id === activeSection) || custodyTabs[0];

  const handleResetCustody = async () => {
    if (!canResetCustody || isResetting) return;

    const confirmed = window.confirm(
      "This will permanently delete the existing custody days for the selected custody scope and start the custody calendar from zero. Continue?"
    );

    if (!confirmed) return;

    setIsResetting(true);

    try {
      const result = await resetCustodyDays({
        familyId,
        userId: user.uid,
      });

      window.alert(`Custody reset completed. Deleted ${result.deleted} day(s).`);
      window.location.reload();
    } catch (error) {
      console.error("Error resetting custody data:", error);
      window.alert(`Could not reset custody data: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-full bg-background pb-28 md:pb-6">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
                Custody
              </p>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                Shared co-parenting hub
              </h1>
            </div>

            {activeSection === "schedule" && canResetCustody && (
              <Button
                type="button"
                variant="outline"
                disabled={isResetting}
                onClick={handleResetCustody}
                className="w-fit gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
                {isResetting ? "Resetting..." : "Reset custody data"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3">
            <span className="hidden text-xs font-black uppercase tracking-[0.16em] text-slate-400 md:inline">
              Submenu
            </span>

            <div className="flex min-w-fit gap-1 rounded-2xl bg-slate-100 p-1">
              {custodyTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeSection === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id)}
                    className={`flex min-w-fit items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition md:text-sm ${
                      active
                        ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <p className="hidden truncate text-xs font-semibold text-slate-400 lg:block">
              {activeTab.description}
            </p>
          </div>
        </div>
      </div>

      {activeSection === "schedule" && (
        <CustodyCalendarView
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

      {activeSection === "templates" && (
        <ComingSoonPanel
          icon={activeTab.icon}
          title="Custody schedule templates"
          description="This section will generate custody schedules automatically from a selected rotation and date range."
          bullets={[
            "2-2-3 rotating schedule",
            "2-5-5-2 rotating schedule",
            "Week on / week off",
            "Custom rotation builder",
            "Start date and end date",
            "Preview before applying",
          ]}
        />
      )}

      {activeSection === "exchange" && (
        <ComingSoonPanel
          icon={activeTab.icon}
          title="Exchange days"
          description="This section will organize custody transitions, pickup/dropoff notes, and reminders."
          bullets={[
            "Pickup and dropoff location",
            "Exchange time",
            "Special notes",
            "Reminder before exchange",
            "Who is picking up",
            "Change-day status",
          ]}
        />
      )}

      {activeSection === "packing" && (
        <ComingSoonPanel
          icon={activeTab.icon}
          title="Packing list"
          description="This section will keep track of what needs to move with the child during custody changes."
          bullets={[
            "Clothes and shoes",
            "School backpack",
            "Medicine",
            "Sports gear",
            "Favorite toys",
            "Checklist per exchange day",
          ]}
        />
      )}

      {activeSection === "budget" && (
        <ComingSoonPanel
          icon={activeTab.icon}
          title="Child budget and shared expenses"
          description="This section will track purchases, split costs, reimbursements, and recurring payments."
          bullets={[
            "Who bought it",
            "Who needs to pay",
            "50/50 or custom split",
            "Daycare recurring payment",
            "Soccer / martial arts / activities",
            "Suggested purchase list",
          ]}
        />
      )}
    </div>
  );
}
