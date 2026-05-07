import React, { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  MessageCircle,
  Shirt,
  Trash2,
} from "lucide-react";

import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resetCustodyDays } from "@/lib/resetCustodyData";
import { useFamily } from "@/lib/FamilyContext";

const custodyModules = [
  {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDays,
    description: "Custody calendar, manual days, bulk schedule, and future templates.",
    accent: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: "packing",
    label: "Packing List",
    icon: Shirt,
    description: "Checklist for clothes, backpack, medicine, sports gear, and exchange-day items.",
    accent: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: "budget",
    label: "Budget",
    icon: CreditCard,
    description: "Shared expenses, split costs, who paid, who owes, and recurring payments.",
    accent: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
    description: "Co-parent messages, important notes, and custody-related communication.",
    accent: "bg-violet-50 text-violet-600 border-violet-100",
  },
];

function ModuleCard({ module, onClick }) {
  const Icon = module.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[2rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-3xl border ${module.accent}`}>
          <Icon className="h-7 w-7" />
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 transition group-hover:bg-blue-100 group-hover:text-blue-700">
          Open
        </span>
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
        {module.label}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {module.description}
      </p>
    </button>
  );
}

function ComingSoonPanel({ icon: Icon, title, description, bullets }) {
  return (
    <div className="px-3 pb-8 pt-4 md:px-6">
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
  const [activeModule, setActiveModule] = useState("hub");
  const [isResetting, setIsResetting] = useState(false);
  const { user, familyId, isAdmin, isOwner } = useFamily();

  const canResetCustody = Boolean(user && familyId && (isAdmin || isOwner));
  const selectedModule = custodyModules.find((module) => module.id === activeModule);

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

  if (activeModule === "hub") {
    return (
      <div className="min-h-full bg-background px-4 pb-28 pt-5 md:px-8 md:pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
              Custody
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Shared co-parenting hub
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500 md:text-base">
              Manage the custody schedule, packing needs, child expenses, and co-parent communication from one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {custodyModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onClick={() => setActiveModule(module.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background pb-28 md:pb-6">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveModule("hub")}
              className="shrink-0 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Hub
            </Button>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
                Custody
              </p>
              <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {selectedModule?.label || "Custody"}
              </h1>
            </div>
          </div>

          {activeModule === "schedule" && canResetCustody && (
            <Button
              type="button"
              variant="outline"
              disabled={isResetting}
              onClick={handleResetCustody}
              className="w-fit gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
              {isResetting ? "Resetting..." : "Reset"}
            </Button>
          )}
        </div>
      </div>

      {activeModule === "schedule" && (
        <CustodyCalendarView
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

      {activeModule === "packing" && (
        <ComingSoonPanel
          icon={Shirt}
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

      {activeModule === "budget" && (
        <ComingSoonPanel
          icon={CreditCard}
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

      {activeModule === "chat" && (
        <ComingSoonPanel
          icon={MessageCircle}
          title="Co-parent chat"
          description="This section will keep custody-related messages and important notes organized by custody group."
          bullets={[
            "Custody-specific message thread",
            "Important pinned notes",
            "Exchange-day messages",
            "Budget and receipt comments",
            "Read status",
            "Future notification support",
          ]}
        />
      )}
    </div>
  );
}
