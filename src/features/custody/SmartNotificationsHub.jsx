import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Pill,
  Settings2,
  ShieldCheck,
  Sparkles,
  Truck,
  WalletCards,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppDialog from "@/components/app/AppDialog";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getCustodyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";
import { currency, getBudgetSummary } from "@/data/custodyBudget";
import { getPackingSummary } from "@/data/custodyPacking";

const initialRules = [
  {
    id: "exchange-review",
    title: "Exchange details need review",
    description: "Notify when the next exchange is missing time, location, or confirmation.",
    timing: "Before exchange",
    channel: "Push + Email",
    enabled: true,
    icon: Truck,
    accent: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    id: "packing-missing",
    title: "Packing items missing",
    description: "Notify when important transition items are marked missing or need review.",
    timing: "Evening before",
    channel: "Push",
    enabled: true,
    icon: Pill,
    accent: "bg-rose-50 text-rose-700 border-rose-100",
  },
  {
    id: "packing-readiness",
    title: "Packing readiness below 100%",
    description: "Notify when the checklist is not fully ready before transition day.",
    timing: "Day before",
    channel: "Push",
    enabled: true,
    icon: ShieldCheck,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    id: "budget-pending",
    title: "Shared expenses pending",
    description: "Notify when custody-related expenses still need review or settlement.",
    timing: "Weekly digest",
    channel: "Push + Email",
    enabled: true,
    icon: WalletCards,
    accent: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

function rulesToMap(rules) {
  return rules.reduce((acc, rule) => ({ ...acc, [rule.id]: Boolean(rule.enabled) }), {});
}

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
    date: normalizeDate(data.date),
    is_split: data.is_split || data.isSplit || false,
    with_whom: data.with_whom || data.withWhom || null,
    morning: data.morning || null,
    afternoon: data.afternoon || null,
  };
}

function normalizeExchangeDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    date: normalizeDate(data.date),
    time: data.time || "",
    location: data.location || "",
    fromParent: data.fromParent || "",
    toParent: data.toParent || "",
    pickupBy: data.pickupBy || data.toParent || "",
    notes: data.notes || "",
    status: data.status || "pending",
    source: data.source || "manual",
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

function formatParent(value, dadName, momName) {
  if (value === "dad") return dadName || "Dad";
  if (value === "mom") return momName || "Mom";
  return "Shared";
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  try {
    return format(parseISO(`${value}T12:00:00`), "EEE, MMM d");
  } catch {
    return value;
  }
}

function formatTime(value) {
  if (!value) return "Time needs review";
  const [hourRaw, minute = "00"] = value.split(":");
  const hour = Number(hourRaw);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysUntil(dateKey) {
  if (!dateKey) return null;
  const today = new Date(`${getTodayKey()}T12:00:00`);
  const target = new Date(`${dateKey}T12:00:00`);
  return Math.round((target - today) / 86_400_000);
}

function timeLabelForDate(dateKey) {
  const daysUntil = getDaysUntil(dateKey);
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil > 1) return `In ${daysUntil} days`;
  return "Past due";
}

function getNextSmartExchange(custodyDays, exchanges) {
  const todayKey = getTodayKey();
  const candidate = findNextExchangeFromCalendar(custodyDays, todayKey);

  if (!candidate) {
    return exchanges.find((exchange) => exchange.status !== "completed" && exchange.date >= todayKey) || null;
  }

  const matchedExchange = exchanges.find((exchange) =>
    exchange.date === candidate.date &&
    exchange.fromParent === candidate.fromParent &&
    exchange.toParent === candidate.toParent
  );

  if (matchedExchange) return { ...matchedExchange, source: matchedExchange.source || "confirmed", period: candidate.period };

  return {
    ...candidate,
    location: "",
    notes: "Auto-generated from custody calendar. Confirm details before the exchange.",
    status: "needs_review",
    source: "calendar-default",
  };
}

function buildAlerts({ nextExchange, packingItems, expenses, dadName, momName }) {
  const alerts = [];
  const packingSummary = getPackingSummary(packingItems);
  const budgetSummary = getBudgetSummary(expenses);
  const missingItems = packingItems.filter((item) => item.status === "missing");
  const reviewItems = packingItems.filter((item) => item.status === "review");

  if (nextExchange) {
    const from = formatParent(nextExchange.fromParent, dadName, momName);
    const to = formatParent(nextExchange.toParent, dadName, momName);
    const when = `${timeLabelForDate(nextExchange.date)} · ${formatDate(nextExchange.date)}${nextExchange.period ? ` (${nextExchange.period})` : ""}`;
    const missingDetails = !nextExchange.location || !nextExchange.time || nextExchange.status === "needs_review" || nextExchange.status === "pending";

    alerts.push({
      id: "next-exchange",
      ruleId: "exchange-review",
      title: `${when} exchange`,
      message: `${from} → ${to} at ${formatTime(nextExchange.time)}. ${nextExchange.location || "Location needs review."}`,
      type: "Exchange",
      time: when,
      priority: missingDetails ? "high" : "normal",
      icon: Truck,
    });

    if (missingDetails) {
      alerts.push({
        id: "exchange-review",
        ruleId: "exchange-review",
        title: "Exchange details need review",
        message: "Confirm the time, location, pickup person, and handoff notes before the next transition.",
        type: "Action needed",
        time: when,
        priority: "high",
        icon: AlertTriangle,
      });
    }

    if (nextExchange.status === "issue") {
      alerts.push({
        id: "exchange-issue",
        ruleId: "exchange-review",
        title: "Exchange issue reported",
        message: "One exchange is marked as issue. Review the handoff note and resolve it with the co-parent.",
        type: "Exchange",
        time: "Now",
        priority: "high",
        icon: AlertTriangle,
      });
    }
  }

  if (missingItems.length) {
    const names = missingItems.slice(0, 3).map((item) => item.name).join(", ");
    alerts.push({
      id: "packing-missing",
      ruleId: "packing-missing",
      title: `${missingItems.length} packing item${missingItems.length === 1 ? "" : "s"} missing`,
      message: `${names}${missingItems.length > 3 ? " and more" : ""} still need attention before the exchange.`,
      type: "Packing",
      time: "Before transition",
      priority: "high",
      icon: Pill,
    });
  }

  if (reviewItems.length || packingSummary.readiness < 100) {
    alerts.push({
      id: "packing-review",
      ruleId: "packing-readiness",
      title: `Packing is ${packingSummary.readiness}% ready`,
      message: `${packingSummary.packedCount} packed · ${packingSummary.reviewCount} review · ${packingSummary.missingCount} missing.`,
      type: "Packing",
      time: "Before transition",
      priority: packingSummary.missingCount ? "high" : "normal",
      icon: ShieldCheck,
    });
  }

  if (budgetSummary.pending > 0) {
    alerts.push({
      id: "budget-pending",
      ruleId: "budget-pending",
      title: `${currency(budgetSummary.pending)} pending in shared expenses`,
      message: `${budgetSummary.pendingCount} pending and ${budgetSummary.reviewCount} item(s) needing review.`,
      type: "Budget",
      time: "Weekly digest",
      priority: "normal",
      icon: WalletCards,
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "all-clear",
      ruleId: "all-clear",
      title: "No urgent reminders right now",
      message: "Exchange, packing, and budget signals look calm for the selected custody group.",
      type: "All clear",
      time: "Now",
      priority: "low",
      icon: CheckCircle2,
    });
  }

  return alerts;
}

function NotificationHero({ enabledCount, totalCount, alertCount, highPriorityCount, prefsLoaded }) {
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
              Kinely turns the custody calendar, exchange details, packing readiness, and shared expenses into proactive reminders for connected homes.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Active signals
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-amber-50 text-2xl font-black text-amber-700">
                {alertCount}
              </div>
              <div>
                <p className="text-lg font-black text-slate-950">
                  {highPriorityCount ? `${highPriorityCount} action needed` : "Looks calm"}
                </p>
                <p className="text-sm font-bold text-slate-500">
                  {enabledCount} of {totalCount} rules enabled · {prefsLoaded ? "Saved" : "Loading prefs"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RuleCard({ rule, onToggle, saving }) {
  const Icon = rule.icon;

  return (
    <button
      type="button"
      onClick={() => onToggle(rule.id)}
      disabled={saving}
      className="w-full rounded-[1.6rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
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
  const Icon = alert.icon || BellRing;
  const priorityClassName = alert.priority === "high"
    ? "border-rose-100 bg-rose-50 text-rose-700"
    : alert.priority === "low"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : "border-amber-100 bg-amber-50 text-amber-700";

  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm ${priorityClassName}`}>
          <Icon className="h-5 w-5" />
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
  const {
    user,
    familyId,
    actualFamilyId,
    householdFamilyId,
    custodyGroupId,
    selectedCustodyGroup,
    dadName,
    momName,
  } = useFamily();
  const custodyScopeId = custodyGroupId || familyId;
  const householdScopeId = householdFamilyId || actualFamilyId || (custodyGroupId ? "" : familyId);
  const [rules, setRules] = useState(initialRules);
  const [custodyDays, setCustodyDays] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [packingItems, setPackingItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticeDialog, setNoticeDialog] = useState(null);

  const showNotice = ({ tone = "info", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPrefs() {
      setPrefsLoaded(false);

      if (!user || !custodyScopeId) {
        setRules(initialRules);
        setPrefsLoaded(true);
        return;
      }

      try {
        const prefsRef = doc(db, "custodyNotificationPrefs", custodyScopeId);
        const snap = await getDoc(prefsRef);
        const savedRules = snap.exists() ? snap.data()?.rules || {} : {};

        if (cancelled) return;

        setRules(initialRules.map((rule) => ({
          ...rule,
          enabled: typeof savedRules[rule.id] === "boolean" ? savedRules[rule.id] : rule.enabled,
        })));
      } catch (error) {
        console.error("Error loading custody notification preferences:", error);
        if (!cancelled) setRules(initialRules);
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    }

    loadPrefs();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, custodyScopeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSignals() {
      if (!user || !custodyScopeId) {
        setCustodyDays([]);
        setExchanges([]);
        setPackingItems([]);
        setExpenses([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [dayDocs, exchangeDocs, packingDocs, expenseDocs] = await Promise.all([
          getCustodyScopedDocSnaps("custodyDays", custodyScopeId),
          getCustodyScopedDocSnaps("custodyExchanges", custodyScopeId),
          getCustodyScopedDocSnaps("custodyPackingItems", custodyScopeId),
          getCustodyScopedDocSnaps("custodyExpenses", custodyScopeId),
        ]);

        if (cancelled) return;

        setCustodyDays(dayDocs.map(normalizeCustodyDay).sort((a, b) => (a.date || "").localeCompare(b.date || "")));
        setExchanges(exchangeDocs.map(normalizeExchangeDoc).sort((a, b) => `${a.date || "9999-12-31"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-12-31"} ${b.time || "99:99"}`)));
        setPackingItems(packingDocs.map(normalizePackingDoc).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
        setExpenses(expenseDocs.map(normalizeExpenseDoc).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
      } catch (error) {
        console.error("Error loading smart notification signals:", error);
        if (!cancelled) {
          setCustodyDays([]);
          setExchanges([]);
          setPackingItems([]);
          setExpenses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSignals();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, custodyScopeId]);

  const nextExchange = useMemo(
    () => getNextSmartExchange(custodyDays, exchanges),
    [custodyDays, exchanges]
  );

  const ruleMap = useMemo(() => rulesToMap(rules), [rules]);

  const generatedAlerts = useMemo(() => {
    const alerts = buildAlerts({ nextExchange, packingItems, expenses, dadName, momName });
    const filtered = alerts.filter((alert) => alert.ruleId === "all-clear" || ruleMap[alert.ruleId] !== false);
    return filtered.length ? filtered : [{
      id: "all-clear-filtered",
      ruleId: "all-clear",
      title: "No active reminders right now",
      message: "Existing signals are currently muted by your notification preferences.",
      type: "All clear",
      time: "Now",
      priority: "low",
      icon: CheckCircle2,
    }];
  }, [nextExchange, packingItems, expenses, dadName, momName, ruleMap]);

  const enabledCount = useMemo(
    () => rules.filter((rule) => rule.enabled).length,
    [rules]
  );

  const highPriorityCount = generatedAlerts.filter((alert) => alert.priority === "high").length;

  const savePrefs = async (nextRules) => {
    if (!user || !custodyScopeId) return;

    setSavingPrefs(true);

    try {
      await setDoc(doc(db, "custodyNotificationPrefs", custodyScopeId), {
        familyId: householdScopeId || custodyScopeId,
        custodyGroupId: custodyScopeId,
        householdFamilyId: householdScopeId || "",
        custodyGroupName: selectedCustodyGroup?.name || "",
        module: "custody",
        visibility: "custody",
        rules: rulesToMap(nextRules),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error saving custody notification preferences:", error);
      showNotice({
        tone: "danger",
        title: "Could not save notification preferences",
        message: error.message,
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleRule = (id) => {
    const nextRules = rules.map((rule) =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    );

    setRules(nextRules);
    savePrefs(nextRules);
  };

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <NotificationHero
          enabledCount={enabledCount}
          totalCount={rules.length}
          alertCount={generatedAlerts.length}
          highPriorityCount={highPriorityCount}
          prefsLoaded={prefsLoaded}
        />

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
                  Toggle which reminder signals Kinely should prepare around custody transitions. Preferences are saved for this custody group.
                </p>
              </div>

              <Button type="button" variant="outline" className="rounded-full gap-2" disabled={savingPrefs}>
                <Settings2 className="h-4 w-4" />
                {savingPrefs ? "Saving..." : "Preferences"}
              </Button>
            </div>

            <div className="space-y-3">
              {rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} onToggle={toggleRule} saving={savingPrefs || !prefsLoaded} />
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Live alerts
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  {loading ? "Checking signals..." : "Next reminders"}
                </h3>
              </div>

              <div className="space-y-3">
                {generatedAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </Card>

            <Card className="rounded-[2rem] border-amber-100 bg-amber-50/70 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] md:p-6">
              <div className="flex items-start gap-4">
                <MessageSquare className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-black text-amber-900">
                    Preferences now persist
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
                    Rule toggles are saved to Firestore for the selected custody group. The next backend step is scheduled email/push delivery.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <AppDialog
        open={Boolean(noticeDialog)}
        tone={noticeDialog?.tone}
        title={noticeDialog?.title}
        message={noticeDialog?.message}
        confirmLabel="Got it"
        onCancel={() => setNoticeDialog(null)}
        onConfirm={() => setNoticeDialog(null)}
      />
    </div>
  );
}
