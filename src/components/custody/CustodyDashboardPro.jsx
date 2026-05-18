import React from "react";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  HeartHandshake,
  MessageCircle,
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
      className="group flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white/85 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
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

function ReadinessItem({ label, status = "Ready" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <p className="text-sm font-black text-slate-800">{label}</p>
      </div>
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
        {status}
      </span>
    </div>
  );
}

export default function CustodyDashboardPro({ onOpenSchedule, onOpenExchange, onOpenPacking, onOpenNotifications, onOpenBudget, onOpenChat }) {
  return (
    <div className="px-4 pb-8 pt-4 md:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.07)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,123,114,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#eff6ff_52%,#fff7ed_100%)] p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-rose-700 shadow-sm">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Custody command center
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Today’s co-parenting plan
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                  A calm custody overview for schedule, exchanges, packing, reminders, expenses, and communication.
                </p>
              </div>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/85 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur lg:min-w-[310px]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Today</p>
                <p className="mt-2 text-2xl font-black text-slate-950">Custody status ready</p>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-500">
                  Connect this panel next to live custody days so it can show who Joaquin is with today and the next exchange.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Next steps</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Custody tools</h2>
              </div>
              <button type="button" onClick={onOpenSchedule} className="flex items-center gap-1 text-sm font-black text-primary">
                Open schedule <ChevronRight className="h-4 w-4" />
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
                Next pass will connect this dashboard to live custody days, so the card can calculate today’s parent, next exchange, and suggested reminders automatically.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
