import React from "react";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  HeartHandshake,
  MessageCircle,
  School,
  Shirt,
  Truck,
  WalletCards,
} from "lucide-react";

import { Card } from "@/components/ui/card";

function ActionTile({ icon: Icon, label, text, tone = "blue", onClick }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white/85 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{label}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{text}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" />
    </button>
  );
}

function InfoCard({ title, value, text, icon: Icon, tone = "blue", onClick }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[1.6rem] border border-white/80 bg-white p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{text}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

function ReadinessItem({ label, status = "Ready" }) {
  const isReview = status === "Review";
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className={isReview ? "h-4 w-4 text-amber-600" : "h-4 w-4 text-emerald-600"} />
        <p className="text-sm font-black text-slate-800">{label}</p>
      </div>
      <span className={isReview ? "rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700" : "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700"}>
        {status}
      </span>
    </div>
  );
}

function WeekStrip() {
  const days = [
    { day: "Mon", date: "20", tone: "bg-amber-400" },
    { day: "Tue", date: "21", tone: "bg-blue-500" },
    { day: "Wed", date: "22", tone: "bg-amber-400" },
    { day: "Thu", date: "23", tone: "bg-emerald-500" },
    { day: "Fri", date: "24", tone: "bg-emerald-500" },
    { day: "Sat", date: "25", tone: "bg-rose-500" },
    { day: "Sun", date: "26", tone: "bg-rose-500" },
  ];

  return (
    <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">This week</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Custody rhythm</h2>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((item) => (
          <div key={`${item.day}-${item.date}`} className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-2 py-3 text-center">
            <p className="text-xs font-black text-slate-400">{item.day}</p>
            <p className="mt-1 text-sm font-black text-slate-900">{item.date}</p>
            <div className={`mx-auto mt-2 h-2 w-6 rounded-full ${item.tone}`} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function CustodyDashboardPro({ onOpenSchedule, onOpenExchange, onOpenPacking, onOpenNotifications, onOpenBudget, onOpenChat }) {
  return (
    <div className="px-4 pb-8 pt-4 md:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.07)]">
            <div className="relative min-h-[280px] bg-[radial-gradient(circle_at_72%_42%,rgba(91,141,239,0.22),transparent_28%),linear-gradient(135deg,#eff6ff_0%,#fff7ed_100%)] p-5 md:p-6">
              <div className="max-w-md">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-rose-700 shadow-sm">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Today
                </div>
                <p className="text-base font-black text-slate-700">Joaquin is with</p>
                <h1 className="mt-1 text-5xl font-black tracking-tight text-slate-950 md:text-6xl">
                  Mom <span className="text-amber-400">♥</span>
                </h1>
                <p className="mt-5 max-w-sm text-base font-bold leading-7 text-slate-600">
                  Pickup tomorrow at <span className="text-slate-950">8:00 AM</span>. Exchange at school.
                </p>
                <button
                  type="button"
                  onClick={onOpenSchedule}
                  className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-700 hover:shadow-md"
                >
                  View schedule
                </button>
              </div>

              <div className="pointer-events-none absolute bottom-0 right-6 hidden h-56 w-56 rounded-full bg-white/45 blur-2xl md:block" />
              <div className="absolute right-10 top-10 hidden h-4 w-4 rounded-full bg-emerald-400 md:block" />
              <div className="absolute bottom-14 right-20 hidden h-5 w-5 rounded-full bg-emerald-400 md:block" />
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <InfoCard
              title="Next change"
              value="Tomorrow"
              text="8:00 AM · Exchange at school"
              icon={Truck}
              tone="cyan"
              onClick={onOpenExchange}
            />
            <InfoCard
              title="Packing list"
              value="5 items"
              text="Ready to go"
              icon={Shirt}
              tone="emerald"
              onClick={onOpenPacking}
            />
          </div>
        </div>

        <WeekStrip />

        <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Custody tools</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Quick actions</h2>
              </div>
              <button type="button" onClick={onOpenSchedule} className="flex items-center gap-1 text-sm font-black text-primary">
                Schedule <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ActionTile icon={CalendarDays} label="Schedule" text="Calendar and bulk custody days" tone="blue" onClick={onOpenSchedule} />
              <ActionTile icon={Truck} label="Exchange" text="Pickup, dropoff, and handoff notes" tone="cyan" onClick={onOpenExchange} />
              <ActionTile icon={Shirt} label="Packing" text="Clothes, backpack, medicine, gear" tone="emerald" onClick={onOpenPacking} />
              <ActionTile icon={BellRing} label="Reminders" text="Exchange and readiness alerts" tone="orange" onClick={onOpenNotifications} />
              <ActionTile icon={WalletCards} label="Budget" text="Shared expenses and reimbursements" tone="amber" onClick={onOpenBudget} />
              <ActionTile icon={MessageCircle} label="Chat" text="Co-parent notes and messages" tone="violet" onClick={onOpenChat} />
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Exchange readiness</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Before transition</h2>
              <div className="mt-4 space-y-2.5">
                <ReadinessItem label="Backpack" />
                <ReadinessItem label="Medicine / health notes" status="Review" />
                <ReadinessItem label="School items" />
                <ReadinessItem label="Handoff notes" status="Optional" />
              </div>
            </Card>

            <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Smart custody brief</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Coming next</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Next pass will connect this dashboard to live custody days, calculate today’s parent, and show the next exchange automatically.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
