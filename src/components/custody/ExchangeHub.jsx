import React, { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Backpack,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquareText,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFamily } from "@/lib/FamilyContext";

const defaultChecklist = [
  { id: "backpack", label: "Backpack", done: true, icon: Backpack },
  { id: "medicine", label: "Medicine", done: false, icon: ShieldCheck },
  { id: "clothes", label: "Extra clothes", done: false, icon: CheckCircle2 },
  { id: "homework", label: "Homework folder", done: true, icon: MessageSquareText },
];

const defaultTimeline = [
  {
    id: "confirm",
    title: "Confirm exchange details",
    description: "Time, location, and pickup person are visible for both homes.",
    status: "done",
  },
  {
    id: "pack",
    title: "Prepare transition items",
    description: "Backpack, medicine, clothes, and school items.",
    status: "active",
  },
  {
    id: "handoff",
    title: "Complete handoff",
    description: "Mark exchange complete once the child is with the next parent.",
    status: "pending",
  },
];

function StatusPill({ status }) {
  const styles = {
    done: "border-emerald-200 bg-emerald-50 text-emerald-700",
    active: "border-blue-200 bg-blue-50 text-blue-700",
    pending: "border-slate-200 bg-slate-50 text-slate-500",
  };

  const label = {
    done: "Done",
    active: "In progress",
    pending: "Pending",
  }[status];

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles[status]}`}>
      {label}
    </span>
  );
}

function ExchangeSummaryCard({ dadName, momName }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(91,141,239,0.18),transparent_36%),linear-gradient(135deg,#ffffff_0%,#eff6ff_52%,#f8f7f4_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Exchange Hub
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Next exchange
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Keep the transition calm with pickup details, handoff notes, and everything that needs to travel with the child.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Transition
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-950">
                  {dadName || "Dad"} → {momName || "Mom"}
                </p>
                <p className="text-sm font-bold text-slate-500">Tomorrow · 8:00 AM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DetailCard({ icon: Icon, label, value, helper }) {
  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>}
        </div>
      </div>
    </Card>
  );
}

function ChecklistItem({ item, onToggle }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.done ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-900">{item.label}</p>
        <p className="text-xs font-semibold text-slate-400">Tap to update readiness</p>
      </div>
      <CheckCircle2 className={`h-5 w-5 ${item.done ? "fill-emerald-100 text-emerald-700" : "text-slate-300"}`} />
    </button>
  );
}

export default function ExchangeHub() {
  const { dadName, momName } = useFamily();
  const [checklist, setChecklist] = useState(defaultChecklist);

  const completedCount = useMemo(
    () => checklist.filter((item) => item.done).length,
    [checklist]
  );

  const readiness = Math.round((completedCount / checklist.length) * 100);

  const toggleItem = (id) => {
    setChecklist((items) =>
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <ExchangeSummaryCard dadName={dadName} momName={momName} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailCard icon={Clock3} label="Time" value="8:00 AM" helper="Suggested reminder: 30 min before" />
          <DetailCard icon={MapPin} label="Location" value="Daycare pickup" helper="Update later with saved places" />
          <DetailCard icon={Car} label="Pickup by" value={momName || "Mom"} helper="Visible to connected homes" />
          <DetailCard icon={CalendarClock} label="Readiness" value={`${readiness}% ready`} helper={`${completedCount} of ${checklist.length} items complete`} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Transition checklist
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Ready to go
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Keep handoff items clear so the child moves between homes with less stress.
                </p>
              </div>
              <Badge className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50">
                {readiness}%
              </Badge>
            </div>

            <div className="space-y-3">
              {checklist.map((item) => (
                <ChecklistItem key={item.id} item={item} onToggle={toggleItem} />
              ))}
            </div>

            <Button type="button" variant="outline" className="mt-4 w-full rounded-full gap-2">
              <Plus className="h-4 w-4" />
              Add exchange item
            </Button>
          </Card>

          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Calm transition flow
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">
                Exchange timeline
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                A simple, low-conflict flow for what needs to happen before and during the handoff.
              </p>
            </div>

            <div className="space-y-4">
              {defaultTimeline.map((step, index) => (
                <div key={step.id} className="flex gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${step.status === "done" ? "bg-emerald-100 text-emerald-700" : step.status === "active" ? "bg-blue-100 text-blue-700" : "bg-white text-slate-400"}`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-slate-950">{step.title}</h4>
                      <StatusPill status={step.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-start gap-3">
                <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="text-sm font-black text-blue-900">Handoff note</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    Remember to send the medicine bag and confirm tomorrow morning pickup.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
