import React, { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  HeartHandshake,
  Shirt,
  Sparkles,
  Truck,
  WalletCards,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFamily } from "@/lib/FamilyContext";
import { getCustodyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";
import { canReadModule } from "@/lib/modulePermissions";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";
import { getPackingSummary } from "@/data/custodyPacking";
import { currency, getBudgetSummary } from "@/data/custodyBudget";

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

function normalizePackingDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || "Packing item",
    category: data.category || "General",
    owner: data.owner || "Shared",
    status: data.status || "review",
    important: Boolean(data.important),
    order: data.order ?? 999,
  };
}

function normalizeExpenseDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title || "Expense",
    category: data.category || "General",
    amount: Number(data.amount || 0),
    paidBy: data.paidBy || "Shared",
    split: data.split || "50/50",
    status: data.status || "review",
    due: data.due || "",
    recurring: Boolean(data.recurring),
    order: data.order ?? 999,
  };
}

function normalizeExchangeDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    date: normalizeDate(data.date || data.custodyDate),
    custodyDate: normalizeDate(data.custodyDate || data.date),
    time: data.time || "",
    location: data.location || "",
    fromParent: data.fromParent || "",
    toParent: data.toParent || "",
    pickupBy: data.pickupBy || data.toParent || "",
    notes: data.notes || "",
    status: data.status || "pending",
    period: data.period || "",
    order: data.order ?? 999,
  };
}

function getParentLabel(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Dad";
  if (parent === "mom") return momName || "Mom";
  if (parent === "split") return "Split day";
  return "Not scheduled";
}

function getDayOwner(day) {
  if (!day) return "none";
  if (day.is_split) return "split";
  return day.with_whom || "none";
}

function getDaySegments(day) {
  if (!day) return [];

  if (day.is_split) {
    return [
      { period: "AM", owner: day.morning || null, suggestedTime: "08:00" },
      { period: "PM", owner: day.afternoon || null, suggestedTime: "12:00" },
    ].filter((segment) => segment.owner && segment.owner !== "none");
  }

  const owner = day.with_whom || null;
  return owner && owner !== "none" ? [{ period: "All day", owner, suggestedTime: "18:00" }] : [];
}

function getEndOfDayOwner(day) {
  const segments = getDaySegments(day);
  return segments.at(-1)?.owner || "none";
}

function findCurrentOwner(sortedDays, todayKey) {
  let owner = "none";

  sortedDays.forEach((day) => {
    const dateKey = normalizeDate(day.date);
    if (dateKey && dateKey <= todayKey) owner = getEndOfDayOwner(day) || owner;
  });

  return owner;
}

function findNextExchangeFromCalendar(sortedDays, todayKey) {
  let previousOwner = findCurrentOwner(sortedDays, todayKey);
  if (!previousOwner || previousOwner === "none") return null;

  for (const day of sortedDays) {
    const dateKey = normalizeDate(day.date);
    if (!dateKey || dateKey <= todayKey) continue;

    const segments = getDaySegments(day);
    for (const segment of segments) {
      if (segment.owner && segment.owner !== previousOwner) {
        return {
          date: dateKey,
          custodyDate: dateKey,
          fromParent: previousOwner,
          toParent: segment.owner,
          pickupBy: segment.owner,
          time: segment.suggestedTime || "18:00",
          period: segment.period,
        };
      }
      if (segment.owner) previousOwner = segment.owner;
    }
  }

  return null;
}

function summarizeToday(todayCustody, dadName, momName) {
  if (!todayCustody) return "Not scheduled";

  if (todayCustody.is_split) {
    return `AM ${getParentLabel(todayCustody.morning, dadName, momName)} / PM ${getParentLabel(todayCustody.afternoon, dadName, momName)}`;
  }

  return getParentLabel(todayCustody.with_whom, dadName, momName);
}

function packingStatusLabel(status) {
  if (status === "packed") return "Ready";
  if (status === "missing") return "Missing";
  return "Review";
}

function formatExchangeTime(value) {
  if (!value) return "Time needs review";
  const [hourRaw, minute = "00"] = value.split(":");
  const hour = Number(hourRaw);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function statusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "issue") return "Issue";
  if (status === "confirmed") return "Confirmed";
  return "Needs review";
}

function SectionHeader({ kicker, title, action, onAction }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{kicker}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
      </div>
      {action && (
        <button type="button" onClick={onAction} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-black text-primary transition hover:bg-blue-50">
          {action} <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function MetricCard({ title, value, text, icon: Icon, tone = "blue", onClick }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[132px] rounded-[1.55rem] border border-white/80 bg-white p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-2 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-500">{text}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

function ActionTile({ icon: Icon, label, text, tone = "blue", onClick, disabled = false }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex min-h-[76px] items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white/90 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{label}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{text}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500 group-disabled:group-hover:text-slate-300" />
    </button>
  );
}

function ReadinessItem({ label, status = "Ready", owner }) {
  const classes = {
    Ready: "bg-emerald-50 text-emerald-700",
    Review: "bg-amber-50 text-amber-700",
    Missing: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-2.5">
      <div className="min-w-0 flex items-center gap-2">
        <CheckCircle2 className={status === "Missing" ? "h-4 w-4 text-rose-600" : status === "Review" ? "h-4 w-4 text-amber-600" : "h-4 w-4 text-emerald-600"} />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-800">{label}</p>
          {owner && <p className="truncate text-[11px] font-bold text-slate-400">{owner}</p>}
        </div>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${classes[status] || classes.Review}`}>{status}</span>
    </div>
  );
}

function WeekStrip({ weekDays, dadColor = "blue", momColor = "amber" }) {
  const dadClasses = getColorClasses(normalizeColorId(dadColor, "blue"), "blue");
  const momClasses = getColorClasses(normalizeColorId(momColor, "amber"), "amber");

  const ownerClasses = {
    dad: {
      card: `${dadClasses.border} ${dadClasses.bg}`,
      day: dadClasses.textStrong,
      dot: dadClasses.dot,
    },
    mom: {
      card: `${momClasses.border} ${momClasses.bg}`,
      day: momClasses.textStrong,
      dot: momClasses.dot,
    },
    split: {
      card: "border-emerald-200 bg-emerald-50",
      day: "text-emerald-900",
      dot: "",
      split: true,
    },
    none: {
      card: "border-slate-200 bg-slate-50",
      day: "text-slate-900",
      dot: "bg-slate-300",
    },
  };

  return (
    <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="This week" title="Custody rhythm" />
      <div className="mt-4 grid grid-cols-7 gap-2">
        {weekDays.map((item) => {
          const tone = ownerClasses[item.owner] || ownerClasses.none;

          return (
            <div
              key={item.dateKey}
              className={`rounded-[1.05rem] border px-1.5 py-3 text-center transition ${tone.card}`}
            >
              <p className="text-[11px] font-black text-slate-400 sm:text-xs">{item.day}</p>
              <p className={`mt-1 text-sm font-black ${tone.day}`}>{item.date}</p>

              {tone.split ? (
                <div className="mx-auto mt-2 flex h-2 w-8 overflow-hidden rounded-full">
                  <div className={`h-full flex-1 ${dadClasses.dot}`} />
                  <div className={`h-full flex-1 ${momClasses.dot}`} />
                </div>
              ) : (
                <div className={`mx-auto mt-2 h-2 w-6 rounded-full ${tone.dot}`} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function getCustodyChildDisplayName(custodyChildren = []) {
  const children = Array.isArray(custodyChildren) ? custodyChildren.filter(Boolean) : [];

  if (!children.length) return "Child";

  const names = children
    .map((child) => {
      if (typeof child === "string") return child;
      return child.name || child.fullName || child.displayName || child.childName || child.firstName || "";
    })
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  if (!names.length) return "Child";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;

  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export default function CustodyDashboardPro({ onOpenSchedule, onOpenExchange, onOpenPacking, onOpenNotifications, onOpenBudget }) {
  const {
    user,
    familyId,
    custodyGroupId,
    dadName,
    momName,
    dadColor,
    momColor,
    custodyDadColor,
    custodyMomColor,
    custodyParentOverride,
    perms,
    custodyChildren,
  } = useFamily();
  const custodyScopeId = custodyGroupId || familyId;
  const custodyChildDisplayName = getCustodyChildDisplayName(custodyChildren);
  const dashboardDadColor = custodyParentOverride?.dadColor || custodyDadColor || dadColor || "blue";
  const dashboardMomColor = custodyParentOverride?.momColor || custodyMomColor || momColor || "amber";
  const [custodyDays, setCustodyDays] = useState([]);
  const [packingItems, setPackingItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPacking, setLoadingPacking] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [loadingExchanges, setLoadingExchanges] = useState(true);

  const canRead = canReadModule(perms, "custody");
  const canReadBudget = canReadModule(perms, "budget");
  const packingSummary = useMemo(() => getPackingSummary(packingItems), [packingItems]);
  const budgetSummary = useMemo(() => getBudgetSummary(expenses), [expenses]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustodyDays() {
      if (!user || !custodyScopeId || !canRead) {
        setCustodyDays([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const docs = await getCustodyScopedDocSnaps("custodyDays", custodyScopeId);
        const data = docs.map(normalizeCustodyDay).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        if (!cancelled) setCustodyDays(data);
      } catch (error) {
        console.error("Error loading custody dashboard:", error);
        if (!cancelled) setCustodyDays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustodyDays();
    return () => { cancelled = true; };
  }, [user?.uid, custodyScopeId, canRead]);

  useEffect(() => {
    let cancelled = false;

    async function loadPackingItems() {
      if (!user || !custodyScopeId) {
        setPackingItems([]);
        setLoadingPacking(false);
        return;
      }

      setLoadingPacking(true);
      try {
        const docs = await getCustodyScopedDocSnaps("custodyPackingItems", custodyScopeId);
        const data = docs.map(normalizePackingDoc).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        if (!cancelled) setPackingItems(data);
      } catch (error) {
        console.error("Error loading packing dashboard summary:", error);
        if (!cancelled) setPackingItems([]);
      } finally {
        if (!cancelled) setLoadingPacking(false);
      }
    }

    loadPackingItems();
    return () => { cancelled = true; };
  }, [user?.uid, custodyScopeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadBudgetExpenses() {
      if (!user || !custodyScopeId || !canReadBudget) {
        setExpenses([]);
        setLoadingBudget(false);
        return;
      }

      setLoadingBudget(true);
      try {
        const docs = await getCustodyScopedDocSnaps("custodyExpenses", custodyScopeId);
        const data = docs.map(normalizeExpenseDoc).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        if (!cancelled) setExpenses(data);
      } catch (error) {
        console.error("Error loading budget dashboard summary:", error);
        if (!cancelled) setExpenses([]);
      } finally {
        if (!cancelled) setLoadingBudget(false);
      }
    }

    loadBudgetExpenses();
    return () => { cancelled = true; };
  }, [user?.uid, custodyScopeId, canReadBudget]);

  useEffect(() => {
    let cancelled = false;

    async function loadExchanges() {
      if (!user || !custodyScopeId) {
        setExchanges([]);
        setLoadingExchanges(false);
        return;
      }

      setLoadingExchanges(true);
      try {
        const docs = await getCustodyScopedDocSnaps("custodyExchanges", custodyScopeId);
        const data = docs
          .map(normalizeExchangeDoc)
          .sort((a, b) => `${a.date || "9999-12-31"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-12-31"} ${b.time || "99:99"}`));
        if (!cancelled) setExchanges(data);
      } catch (error) {
        console.error("Error loading exchange dashboard summary:", error);
        if (!cancelled) setExchanges([]);
      } finally {
        if (!cancelled) setLoadingExchanges(false);
      }
    }

    loadExchanges();
    return () => { cancelled = true; };
  }, [user?.uid, custodyScopeId]);

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
    const currentOwner = findCurrentOwner(sortedDays, todayKey);
    const nextExchangeCandidate = findNextExchangeFromCalendar(sortedDays, todayKey);
    const nextChangeDate = nextExchangeCandidate?.date ? parseISO(`${nextExchangeCandidate.date}T12:00:00`) : null;
    const daysUntil = nextChangeDate ? differenceInCalendarDays(nextChangeDate, today) : null;
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
      currentOwner,
      currentOwnerLabel: getParentLabel(currentOwner, dadName, momName),
      nextParent: nextExchangeCandidate?.toParent || null,
      nextChange: nextExchangeCandidate,
      nextChangeLabel: getParentLabel(nextExchangeCandidate?.toParent, dadName, momName),
      nextChangeDayLabel: nextChangeDate ? format(nextChangeDate, "EEE, MMM d") : "Not scheduled",
      nextChangePeriod: nextExchangeCandidate?.period || "",
      suggestedTime: nextExchangeCandidate?.time || "",
      daysUntil,
      weekDays,
    };
  }, [custodyDays, dadName, momName]);

  const smartExchange = useMemo(() => {
    if (!dashboard.nextChange || !dashboard.currentOwner || !dashboard.nextParent) return null;

    const date = normalizeDate(dashboard.nextChange.date);
    const matchedExchange = exchanges.find((exchange) =>
      (exchange.date === date || exchange.custodyDate === date) &&
      exchange.fromParent === dashboard.currentOwner &&
      exchange.toParent === dashboard.nextParent
    );

    if (matchedExchange) {
      return {
        ...matchedExchange,
        source: "confirmed",
        period: matchedExchange.period || dashboard.nextChangePeriod,
        needsReview: matchedExchange.status === "pending" || !matchedExchange.time || !matchedExchange.location,
      };
    }

    return {
      id: `default-${date}-${dashboard.currentOwner}-${dashboard.nextParent}`,
      date,
      custodyDate: date,
      time: dashboard.suggestedTime,
      location: "Location needs review",
      fromParent: dashboard.currentOwner,
      toParent: dashboard.nextParent,
      pickupBy: dashboard.nextParent,
      notes: `Default exchange preview generated from the custody calendar${dashboard.nextChangePeriod ? ` (${dashboard.nextChangePeriod})` : ""}. Confirm time, location, and handoff notes.`,
      status: "needs_review",
      source: "calendar-default",
      needsReview: true,
      period: dashboard.nextChangePeriod,
    };
  }, [dashboard.nextChange, dashboard.currentOwner, dashboard.nextParent, dashboard.suggestedTime, dashboard.nextChangePeriod, exchanges]);

  const nextChangeText = dashboard.nextChange
    ? `${dashboard.daysUntil === 0 ? "Today" : dashboard.daysUntil === 1 ? "Tomorrow" : `In ${dashboard.daysUntil} days`} · ${dashboard.nextChangeDayLabel}${dashboard.nextChangePeriod ? ` (${dashboard.nextChangePeriod})` : ""}`
    : "No upcoming exchange found";

  const readinessItems = useMemo(
    () => packingItems.slice(0, 4).map((item) => ({
      id: item.id,
      label: item.name,
      owner: item.owner ? `Responsible: ${item.owner}` : "",
      status: packingStatusLabel(item.status),
    })),
    [packingItems]
  );

  const heroSummary = loading
    ? "Loading custody status..."
    : smartExchange
      ? `${nextChangeText}. ${dashboard.currentOwnerLabel} → ${dashboard.nextChangeLabel}. ${smartExchange.needsReview ? "Details need review." : "Details confirmed."}`
      : "No upcoming exchange is currently scheduled.";

  return (
    <div className="bg-[#F8F7F4] px-3 pb-24 pt-3 md:px-5 md:pb-10 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.07)]">
            <div className="relative min-h-[245px] bg-[radial-gradient(circle_at_78%_32%,rgba(91,141,239,0.22),transparent_28%),radial-gradient(circle_at_88%_80%,rgba(255,209,102,0.22),transparent_24%),linear-gradient(135deg,#ffffff_0%,#eff6ff_48%,#fff7ed_100%)] p-5 md:p-7">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-rose-700 shadow-sm">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Custody today
                </div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">{custodyChildDisplayName} is with</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
                  {loading ? "..." : dashboard.todayLabel}
                </h1>
                <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-slate-600 md:text-base">
                  {heroSummary}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={onOpenExchange} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800">
                    Review exchange
                  </button>
                  <button type="button" onClick={onOpenSchedule} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-700 hover:shadow-md">
                    View schedule
                  </button>
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-0 right-6 hidden h-56 w-56 rounded-full bg-white/45 blur-2xl md:block" />
              <div className="absolute right-10 top-10 hidden h-4 w-4 rounded-full bg-emerald-400 md:block" />
              <div className="absolute bottom-14 right-20 hidden h-5 w-5 rounded-full bg-amber-400 md:block" />
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard
              title={smartExchange?.source === "calendar-default" ? "Suggested exchange" : "Next exchange"}
              value={smartExchange ? (dashboard.daysUntil === 1 ? "Tomorrow" : dashboard.nextChangeDayLabel) : "None"}
              text={loadingExchanges ? "Checking exchange details..." : smartExchange ? `${dashboard.currentOwnerLabel} → ${dashboard.nextChangeLabel} · ${formatExchangeTime(smartExchange.time)} · ${smartExchange.location || "Location needs review"}` : "No upcoming exchange found"}
              icon={Truck}
              tone={smartExchange?.needsReview ? "rose" : "blue"}
              onClick={onOpenExchange}
            />
            <MetricCard
              title="Packing readiness"
              value={loadingPacking ? "Loading" : `${packingSummary.readiness}%`}
              text={loadingPacking ? "Checking packing checklist..." : `${packingSummary.packedCount} ready · ${packingSummary.reviewCount} review · ${packingSummary.missingCount} missing`}
              icon={Shirt}
              tone={packingSummary.missingCount ? "rose" : "emerald"}
              onClick={onOpenPacking}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <WeekStrip
            weekDays={dashboard.weekDays}
            dadColor={dashboardDadColor}
            momColor={dashboardMomColor}
          />

          <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
            <SectionHeader kicker="Custody tools" title="Quick actions" action="Schedule" onAction={onOpenSchedule} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ActionTile icon={CalendarDays} label="Schedule" text="Calendar and custody days" tone="blue" onClick={onOpenSchedule} />
              <ActionTile icon={Truck} label="Exchange" text={smartExchange?.needsReview ? "Review handoff details" : "Pickup and dropoff notes"} tone="rose" onClick={onOpenExchange} />
              <ActionTile icon={Shirt} label="Packing" text="Clothes, backpack, medicine" tone="emerald" onClick={onOpenPacking} />
              <ActionTile icon={BellRing} label="Reminders" text="Smart custody alerts" tone="amber" onClick={onOpenNotifications} />
              <ActionTile
                icon={WalletCards}
                label="Budget"
                text={!canReadBudget ? "Restricted" : loadingBudget ? "Loading expenses" : `${currency(budgetSummary.pending)} pending`}
                tone="amber"
                onClick={onOpenBudget}
                disabled={!canReadBudget}
              />
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
            <SectionHeader kicker="Before transition" title="Exchange readiness" action="Packing" onAction={onOpenPacking} />
            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              {smartExchange && (
                <ReadinessItem
                  label={`${dashboard.currentOwnerLabel} → ${dashboard.nextChangeLabel}${smartExchange.period ? ` (${smartExchange.period})` : ""}`}
                  owner={`${formatExchangeTime(smartExchange.time)} · ${smartExchange.location || "Location needs review"}`}
                  status={smartExchange.needsReview ? "Review" : "Ready"}
                />
              )}
              {loadingPacking ? (
                <ReadinessItem label="Loading packing checklist" status="Review" />
              ) : readinessItems.length ? (
                readinessItems.map((item) => (
                  <ReadinessItem key={item.id} label={item.label} owner={item.owner} status={item.status} />
                ))
              ) : (
                <ReadinessItem label="No packing items yet" owner="Create your first checklist item" status="Review" />
              )}
            </div>
          </Card>

          <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
            <SectionHeader kicker="Budget status" title="Shared expenses" action={canReadBudget ? "Budget" : ""} onAction={canReadBudget ? onOpenBudget : undefined} />
            {!canReadBudget ? (
              <div className="mt-4 rounded-[1.25rem] border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                Budget details are restricted for this custody group.
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Total</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{loadingBudget ? "..." : currency(budgetSummary.total)}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-700/70">Pending</p>
                    <p className="mt-1 text-lg font-black text-amber-800">{loadingBudget ? "..." : currency(budgetSummary.pending)}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700/70">Settled</p>
                    <p className="mt-1 text-lg font-black text-emerald-800">{loadingBudget ? "..." : currency(budgetSummary.settled)}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                      {budgetSummary.pendingCount} pending
                    </Badge>
                    <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {budgetSummary.reviewCount} review
                    </Badge>
                    <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      {budgetSummary.settledCount} settled
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-5 text-slate-500">
                    Keep reimbursements visible so both homes know what is pending, reviewed, or settled.
                  </p>
                </div>
              </>
            )}
          </Card>
        </div>

        <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">Smart custody brief</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                  {smartExchange?.needsReview
                    ? "The next transition needs a quick review. Confirm location, pickup person, and any handoff notes."
                    : smartExchange
                      ? "The next transition looks organized. Keep packing and budget items updated before the handoff."
                      : "Add custody days to unlock exchange previews, reminders, and readiness checks."}
                </p>
              </div>
            </div>
            <button type="button" onClick={onOpenNotifications} className="rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100">
              View reminders
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
