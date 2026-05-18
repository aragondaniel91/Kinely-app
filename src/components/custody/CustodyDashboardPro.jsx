import React, { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import { collection, getDocs, query, where } from "firebase/firestore";
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
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getPackingSummary, initialCustodyPackingItems } from "@/data/custodyPacking";

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value?.toDate) return format(value.toDate(), "yyyy-MM-dd");
  return String(value).slice(0, 10);
}

function normalizeCustodyDay(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    date: normalizeDate(data.date),
    is_split: data.is_split || data.isSplit || false,
    with_whom: data.with_whom || data.withWhom || null,
    morning: data.morning || null,
    afternoon: data.afternoon || null,
  };
}

function getParentLabel(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Dad";
  if (parent === "mom") return momName || "Mom";
  return "Split day";
}

function getDayOwner(day) {
  if (!day) return "none";
  if (day.is_split) return "split";
  return day.with_whom || "none";
}

function getChangeOwner(day) {
  if (!day) return "none";
  if (day.is_split) return day.morning || day.afternoon || "split";
  return day.with_whom || "none";
}

function summarizeToday(todayCustody, dadName, momName) {
  if (!todayCustody) return "Not scheduled";

  if (todayCustody.is_split) {
    return `AM ${getParentLabel(todayCustody.morning, dadName, momName)} / PM ${getParentLabel(todayCustody.afternoon, dadName, momName)}`;
  }

  return getParentLabel(todayCustody.with_whom, dadName, momName);
}

function findNextChange(sortedDays, todayKey, currentOwner) {
  if (!currentOwner || currentOwner === "none") return null;

  return sortedDays.find((day) => {
    const dateKey = normalizeDate(day.date);
    if (!dateKey || dateKey <= todayKey) return false;

    const nextOwner = getChangeOwner(day);
    if (!nextOwner || nextOwner === "none") return false;

    return nextOwner !== currentOwner;
  });
}

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
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-2 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{text}</p>
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
  const isMissing = status === "Missing";

  const iconClassName = isMissing
    ? "h-4 w-4 text-rose-600"
    : isReview
      ? "h-4 w-4 text-amber-600"
      : "h-4 w-4 text-emerald-600";

  const badgeClassName = isMissing
    ? "rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700"
    : isReview
      ? "rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700"
      : "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700";

  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className={iconClassName} />
        <p className="text-sm font-black text-slate-800">{label}</p>
      </div>
      <span className={badgeClassName}>{status}</span>
    </div>
  );
}

function WeekStrip({ weekDays }) {
  const ownerTones = {
    dad: "bg-blue-500",
    mom: "bg-amber-400",
    split: "bg-emerald-500",
    none: "bg-slate-300",
  };

  return (
    <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">This week</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Custody rhythm</h2>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {weekDays.map((item) => (
          <div key={item.dateKey} className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-2 py-3 text-center">
            <p className="text-xs font-black text-slate-400">{item.day}</p>
            <p className="mt-1 text-sm font-black text-slate-900">{item.date}</p>
            <div className={`mx-auto mt-2 h-2 w-6 rounded-full ${ownerTones[item.owner] || ownerTones.none}`} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function CustodyDashboardPro({ onOpenSchedule, onOpenExchange, onOpenPacking, onOpenNotifications, onOpenBudget, onOpenChat }) {
  const { user, familyId, dadName, momName, perms } = useFamily();
  const [custodyDays, setCustodyDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const packingSummary = useMemo(() => getPackingSummary(initialCustodyPackingItems), []);

  const canRead = perms?.calendar?.read !== false;

  useEffect(() => {
    let cancelled = false;

    async function loadCustodyDays() {
      if (!user || !familyId || !canRead) {
        setCustodyDays([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const q = query(collection(db, "custodyDays"), where("familyId", "==", familyId));
        const snap = await getDocs(q);
        const data = snap.docs.map(normalizeCustodyDay).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        if (!cancelled) setCustodyDays(data);
      } catch (error) {
        console.error("Error loading custody dashboard:", error);
        if (!cancelled) setCustodyDays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustodyDays();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, familyId, canRead]);

  const dashboard = useMemo(() => {
    const today = new Date();
    const todayKey = format(today, "yyyy-MM-dd");
    const allCustodyMap = {};

    custodyDays.forEach((day) => {
      const key = normalizeDate(day.date);
      if (key) allCustodyMap[key] = day;
    });

    const sortedDays = [...custodyDays].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const todayCustody = allCustodyMap[todayKey];
    const currentOwner = getChangeOwner(todayCustody);
    const nextChange = findNextChange(sortedDays, todayKey, currentOwner);
    const nextChangeDate = nextChange?.date ? parseISO(`${nextChange.date}T12:00:00`) : null;
    const daysUntil = nextChangeDate ? differenceInCalendarDays(nextChangeDate, today) : null;
    const nextParent = nextChange ? getChangeOwner(nextChange) : null;

    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(weekStart, index);
      const dateKey = format(date, "yyyy-MM-dd");
      const day = allCustodyMap[dateKey];
      return {
        dateKey,
        day: format(date, "EEE"),
        date: format(date, "d"),
        owner: getDayOwner(day),
      };
    });

    return {
      todayLabel: summarizeToday(todayCustody, dadName, momName),
      nextChange,
      nextChangeLabel: getParentLabel(nextParent, dadName, momName),
      nextChangeDayLabel: nextChangeDate ? format(nextChangeDate, "EEE, MMM d") : "Not scheduled",
      daysUntil,
      weekDays,
    };
  }, [custodyDays, dadName, momName]);

  const nextChangeText = dashboard.nextChange
    ? `${dashboard.daysUntil === 0 ? "Today" : dashboard.daysUntil === 1 ? "Tomorrow" : `In ${dashboard.daysUntil} days`} · ${dashboard.nextChangeDayLabel}`
    : "No upcoming exchange found";

  return (
    <div className="px-4 pb-24 pt-4 md:px-6 md:pb-10">
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
                  {loading ? "..." : dashboard.todayLabel} <span className="text-amber-400">♥</span>
                </h1>
                <p className="mt-5 max-w-sm text-base font-bold leading-7 text-slate-600">
                  {loading
                    ? "Loading custody status..."
                    : dashboard.nextChange
                      ? `Next change: ${nextChangeText} with ${dashboard.nextChangeLabel}.`
                      : "No upcoming exchange is currently scheduled."}
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
              value={dashboard.nextChange ? (dashboard.daysUntil === 1 ? "Tomorrow" : dashboard.nextChangeDayLabel) : "None"}
              text={dashboard.nextChange ? `With ${dashboard.nextChangeLabel}` : "No upcoming exchange found"}
              icon={Truck}
              tone="cyan"
              onClick={onOpenExchange}
            />
            <InfoCard
              title="Packing list"
              value={`${packingSummary.totalCount} items`}
              text={`${packingSummary.packedCount} packed · ${packingSummary.reviewCount} review · ${packingSummary.missingCount} missing`}
              icon={Shirt}
              tone="emerald"
              onClick={onOpenPacking}
            />
          </div>
        </div>

        <WeekStrip weekDays={dashboard.weekDays} />

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
                <ReadinessItem label="Medicine bag" status={packingSummary.missingCount > 0 ? "Missing" : "Ready"} />
                <ReadinessItem label="School items" status={packingSummary.reviewCount > 0 ? "Review" : "Ready"} />
                <ReadinessItem label="Handoff notes" status="Optional" />
              </div>
            </Card>

            <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Smart custody brief</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {dashboard.nextChange ? "Plan the next exchange" : "Schedule looks calm"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {dashboard.nextChange
                  ? `${nextChangeText}. Packing is ${packingSummary.readiness}% ready with ${packingSummary.missingCount} missing item(s).`
                  : "No upcoming exchange was found in the current custody schedule."}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
