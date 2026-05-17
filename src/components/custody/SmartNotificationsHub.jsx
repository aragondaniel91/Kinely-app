import React, { useMemo, useState } from "react";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Pill,
  Settings2,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const initialRules = [
  {
    id: "exchange-tomorrow",
    title: "Exchange tomorrow morning",
    description: "Remind both homes about pickup time, location, and handoff notes.",
    timing: "Tomorrow · 7:30 AM",
    channel: "Push + Email",
    enabled: true,
    icon: Truck,
    accent: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    id: "medicine-missing",
    title: "Medicine still not packed",
    description: "Send a reminder if medicine remains missing before the exchange.",
    timing: "Today · 8:00 PM",
    channel: "Push",
    enabled: true,
    icon: Pill,
    accent: "bg-rose-50 text-rose-700 border-rose-100",
  },
  {
    id: "packing-review",
    title: "Packing list needs review",
    description: "Notify when checklist readiness is under 100% before transition day.",
    timing: "Today · 6:00 PM",
    channel: "Push",
    enabled: true,
    icon: ShieldCheck,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    id: "school-reminder",
    title: "School items reminder",
    description: "Remind about backpack, homework folder, lunchbox, and school forms.",
    timing: "Weekdays · 7:00 AM",
    channel: "Push",
    enabled: false,
    icon: CalendarClock,
    accent: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

const upcomingAlerts = [
  {
    id: "alert-1",
    title: "Exchange tomorrow at 8:00 AM",
    message: "Pickup details and checklist will be sent tonight.",
    type: "Exchange",
    time: "Today · 7:30 PM",
  },
  {
    id: "alert-2",
    title: "Medicine bag missing",
    message: "This item is marked missing in Packing PRO.",
    type: "Packing",
    time: "Today · 8:00 PM",
  },
  {
    id: "alert-3",
    title: "Handoff note reminder",
    message: "Remember to confirm the morning pickup note.",
    type: "Note",
    time: "Tomorrow · 7:15 AM",
  },
];

function NotificationHero({ enabledCount, totalCount }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,209,102,0.28),transparent_34%),linear-gradient(135deg,#ffffff_0%,#fff7ed_46%,#f8f7f4_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-amber-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Smart Notifications
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Calm reminders before things get stressful
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Kinly can turn custody schedules, packing status, and exchange notes into proactive reminders for connected homes.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Active rules
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-amber-50 text-2xl font-black text-amber-700">
                {enabledCount}
              </div>
              <div>
                <p className="text-lg font-black text-slate-950">
                  {enabledCount} of {totalCount} enabled
                </p>
                <p className="text-sm font-bold text-slate-500">Notification rules</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RuleCard({ rule, onToggle }) {
  const Icon = rule.icon;

  return (
    <button
      type="button"
      onClick={() => onToggle(rule.id)}
      className="w-full rounded-[1.6rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${rule.accent}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-950">{rule.title}</h3>
            <Badge className={`rounded-full ${rule.enabled ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}`}>
              {rule.enabled ? "On" : "Off"}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
            {rule.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              {rule.timing}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
              <Mail className="h-3.5 w-3.5" />
              {rule.channel}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function AlertCard({ alert }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">{alert.title}</p>
            <Badge variant="secondary" className="rounded-full bg-white text-slate-600 hover:bg-white">
              {alert.type}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">{alert.message}</p>
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">
            {alert.time}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SmartNotificationsHub() {
  const [rules, setRules] = useState(initialRules);

  const enabledCount = useMemo(
    () => rules.filter((rule) => rule.enabled).length,
    [rules]
  );

  const toggleRule = (id) => {
    setRules((current) =>
      current.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <NotificationHero enabledCount={enabledCount} totalCount={rules.length} />

        <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Automation rules
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Smart reminder logic
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Toggle the reminders Kinly should prepare around custody transitions.
                </p>
              </div>

              <Button type="button" variant="outline" className="rounded-full gap-2">
                <Settings2 className="h-4 w-4" />
                Preferences
              </Button>
            </div>

            <div className="space-y-3">
              {rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} onToggle={toggleRule} />
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Upcoming alerts
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Next reminders
                </h3>
              </div>

              <div className="space-y-3">
                {upcomingAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </Card>

            <Card className="rounded-[2rem] border-amber-100 bg-amber-50/70 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] md:p-6">
              <div className="flex items-start gap-4">
                <MessageSquare className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-black text-amber-900">
                    Future backend connection
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
                    V1 is local UI. Next step is saving preferences to Firestore and using scheduled reminders with email/push support.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
