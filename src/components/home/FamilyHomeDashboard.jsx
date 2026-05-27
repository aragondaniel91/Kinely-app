import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Clock,
  Heart,
  History,
  Home,
  Plus,
  School,
  ShoppingCart,
  Sparkles,
  Sun,
  UtensilsCrossed,
  Users,
  WalletCards,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatShortDate(value) {
  const dateKey = normalizeDate(value);
  if (!dateKey) return "Soon";

  const today = new Date(`${getTodayKey()}T12:00:00`);
  const target = new Date(`${dateKey}T12:00:00`);
  const days = Math.round((target - today) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days <= 7) return target.toLocaleDateString([], { weekday: "short" });

  return target.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatActivityTime(activity) {
  const raw = activity?.created_at || activity?.createdAt;
  const date = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;

  if (!date || Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getItemTitle(item, fallback = "Item") {
  return item?.title || item?.name || item?.label || item?.task || item?.meal || item?.item || fallback;
}

function getItemDate(item) {
  return normalizeDate(item?.date || item?.dueDate || item?.due_date || item?.due || item?.scheduledDate || item?.scheduled_date);
}

function getChildName(child, index) {
  if (typeof child === "string") return child;
  return child?.name || child?.fullName || child?.displayName || child?.firstName || child?.childName || `Child ${index + 1}`;
}

function getInitials(name) {
  return String(name || "K")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getChildColorClasses(child, index = 0) {
  const fallbackColors = ["blue", "rose", "green", "violet", "amber", "teal"];
  const rawColor =
    typeof child === "object" && child !== null
      ? child.colorId ||
        child.color_id ||
        child.color ||
        child.familyColor ||
        child.family_color ||
        child.calendarColor ||
        child.calendar_color
      : "";

  const fallback = fallbackColors[index % fallbackColors.length];
  return getColorClasses(normalizeColorId(rawColor || fallback, fallback), fallback);
}

function getToneClasses(tone = "blue") {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return tones[tone] || tones.blue;
}

function getActivityIcon(type = "") {
  if (type.includes("travel")) return CalendarDays;
  if (type.includes("special_event")) return Sparkles;
  if (type.includes("deleted")) return AlertCircle;
  if (type.includes("custody")) return Heart;
  return History;
}

function getActivityTone(type = "") {
  if (type.includes("deleted")) return "rose";
  if (type.includes("travel")) return "blue";
  if (type.includes("special_event")) return "amber";
  if (type.includes("custody")) return "violet";
  return "slate";
}

function getFamilyMode({ hasChildren, hasCustody }) {
  if (hasCustody) {
    return {
      id: "coparenting",
      label: "Coparenting rhythm",
      title: "Today’s family rhythm",
      description: "Custody, tasks, meals, and shared planning in one calm view.",
      icon: Heart,
      tone: "rose",
    };
  }

  if (hasChildren) {
    return {
      id: "family",
      label: "Family household",
      title: "Today’s family plan",
      description: "Kids, tasks, meals, lists, and calendar moments in one place.",
      icon: Home,
      tone: "blue",
    };
  }

  return {
    id: "shared",
    label: "Shared household",
    title: "Today’s shared plan",
    description: "Tasks, meals, groceries, events, and home rhythm for everyone.",
    icon: Users,
    tone: "emerald",
  };
}

function WeatherPill() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
      <span className="text-sm font-black text-slate-900">
        {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </span>
      <span className="h-1 w-1 rounded-full bg-slate-300" />
      <Sun className="h-4 w-4 text-amber-400" />
      <span className="hidden text-sm font-bold text-slate-500 sm:inline">Today</span>
    </div>
  );
}

function SectionHeader({ kicker, title, action, to }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{kicker}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
      </div>

      {action && to && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-black text-primary transition hover:bg-blue-50"
        >
          {action} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "blue", to }) {
  const content = (
    <div className="group flex min-h-[92px] items-center gap-3 rounded-[1.35rem] border border-white/80 bg-white/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getToneClasses(tone)}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 truncate text-xs font-bold text-slate-500">{label}</p>
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function QuickAction({ icon: Icon, label, text, to, tone = "blue" }) {
  return (
    <Link
      to={to}
      className="group flex min-h-[76px] items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white/90 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getToneClasses(tone)}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">{label}</span>
        <span className="block truncate text-xs font-semibold text-slate-500">{text}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" />
    </Link>
  );
}

function CompactItem({ icon: Icon, title, text, tone = "blue", to }) {
  const content = (
    <div className="flex items-center gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-2.5 transition hover:border-blue-100 hover:bg-white">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{title}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{text}</p>
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{content}</Link> : content;
}

function TodayHero({
  familyName,
  familyMode,
  hasCustody,
  hasChildren,
  todayLabel,
  todayParent,
  dadName,
  momName,
  dadColor,
  momColor,
  nextChange,
  nextChangeLabel,
  tasks,
  meals,
  groceries,
  canReadCalendar,
}) {
  const ModeIcon = familyMode.icon;

  const parentColor =
    todayParent === "dad"
      ? dadColor || "blue"
      : todayParent === "mom"
      ? momColor || "amber"
      : familyMode.tone;

  const parentClasses = getColorClasses(normalizeColorId(parentColor, familyMode.tone), familyMode.tone);

  const heroTitle = hasCustody
    ? todayLabel || "Custody rhythm available"
    : hasChildren
    ? `${familyName} plan for today`
    : `${familyName} shared home`;

  const heroSubtitle = hasCustody
    ? nextChange
      ? `Next exchange: ${formatShortDate(nextChange.date)} with ${nextChangeLabel}.`
      : "Custody schedule is available for this family."
    : hasChildren
    ? "Kids, meals, tasks, lists, and events are organized here."
    : "Tasks, meals, groceries, and shared events are organized here.";

  const ownerLabel =
    todayParent === "dad"
      ? dadName || "Dad"
      : todayParent === "mom"
      ? momName || "Mom"
      : todayParent === "split"
      ? "Split day"
      : null;

  return (
    <section className="overflow-hidden rounded-[2.2rem] border border-white/80 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.07)]">
      <div className="kinly-family-gradient p-5 md:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Kinly family home
          </div>
          <WeatherPill />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 py-2 shadow-sm">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${getToneClasses(familyMode.tone)}`}>
                <ModeIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Family mode</p>
                <p className="text-sm font-black text-slate-800">{familyMode.label}</p>
              </div>
            </div>

            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
              {getGreeting()}, {familyName}
            </h1>

            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">
              {familyMode.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {canReadCalendar && (
                <Link to="/calendar" className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800">
                  Open calendar
                </Link>
              )}
              <Link to="/tasks" className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-700 hover:shadow-md">
                Add task
              </Link>
              <Link to="/groceries" className="rounded-2xl bg-white/80 px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-emerald-700 hover:shadow-md">
                Open lists
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Today at a glance</p>
                <h2 className="mt-1.5 text-2xl font-black text-slate-950">{heroTitle}</h2>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-500">{heroSubtitle}</p>
              </div>

              {ownerLabel ? (
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border ${parentClasses.bgStrong} ${parentClasses.textStrong} ${parentClasses.border}`}>
                  <Heart className="h-5 w-5" />
                </div>
              ) : (
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border ${getToneClasses(familyMode.tone)}`}>
                  <Home className="h-5 w-5" />
                </div>
              )}
            </div>

            {ownerLabel && (
              <div className={`mt-4 rounded-2xl border px-3 py-2 ${parentClasses.chip} ${parentClasses.border}`}>
                <p className={`text-sm font-black ${parentClasses.textStrong}`}>Today: {ownerLabel}</p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MetricCard icon={CheckSquare} value={tasks.length} label="Open tasks" tone="blue" to="/tasks" />
              <MetricCard icon={UtensilsCrossed} value={meals.length} label="Meals today" tone="amber" to="/meals" />
              <MetricCard icon={ShoppingCart} value={groceries.length} label="List items" tone="emerald" to="/groceries" />
              <MetricCard icon={CalendarDays} value={nextChange ? formatShortDate(nextChange.date) : "Today"} label={hasCustody ? "Next exchange" : "Calendar"} tone="violet" to="/calendar" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AttentionSection({ hasCustody, nextChange, nextChangeLabel, tasks, meals, groceries, canReadMeals, canReadGroceries }) {
  const attentionItems = [];

  if (hasCustody && nextChange?.days <= 1) {
    attentionItems.push({
      icon: Heart,
      title: "Custody exchange soon",
      text: `Next exchange ${formatShortDate(nextChange.date)} with ${nextChangeLabel}.`,
      tone: "rose",
      to: "/custody",
    });
  }

  if (tasks.length > 0) {
    attentionItems.push({
      icon: CheckSquare,
      title: `${tasks.length} task${tasks.length === 1 ? "" : "s"} pending`,
      text: "Review family tasks and assignments.",
      tone: "blue",
      to: "/tasks",
    });
  }

  if (canReadMeals && meals.length === 0) {
    attentionItems.push({
      icon: UtensilsCrossed,
      title: "No meals planned today",
      text: "Add breakfast, lunch, dinner, or snacks.",
      tone: "amber",
      to: "/meals",
    });
  }

  if (canReadGroceries && groceries.length > 0) {
    attentionItems.push({
      icon: ShoppingCart,
      title: `${groceries.length} list item${groceries.length === 1 ? "" : "s"}`,
      text: "Open shared lists and review what is needed.",
      tone: "emerald",
      to: "/groceries",
    });
  }

  if (!attentionItems.length) {
    attentionItems.push({
      icon: Sparkles,
      title: "Everything looks calm",
      text: "No urgent family items need attention right now.",
      tone: "emerald",
      to: "/calendar",
    });
  }

  return (
    <Card className="rounded-[1.9rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Needs attention" title="What matters now" action="View calendar" to="/calendar" />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {attentionItems.slice(0, 4).map((item) => (
          <Link key={item.title} to={item.to} className="flex min-h-[132px] flex-col justify-between rounded-[1.35rem] border border-slate-200 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${getToneClasses(item.tone)}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{item.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function ChildrenSection({ children = [], hasCustody, todayLabel, nextChange, nextChangeLabel, tasksCount, mealsCount }) {
  if (!children.length) return null;

  return (
    <Card className="rounded-[1.9rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Family members" title="Children" action="View all" to="/children" />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {children.slice(0, 4).map((child, index) => {
          const name = getChildName(child, index);
          const colorClasses = getChildColorClasses(child, index);
          const nextText = hasCustody
            ? nextChange
              ? `Next exchange: ${formatShortDate(nextChange.date)} with ${nextChangeLabel}`
              : todayLabel
            : `${tasksCount} tasks · ${mealsCount} meals today`;

          return (
            <Link
              key={`${name}-${index}`}
              to="/children"
              className={`group overflow-hidden rounded-[1.45rem] border bg-white transition hover:-translate-y-0.5 hover:shadow-md ${colorClasses.border}`}
            >
              <div className={`h-1.5 ${colorClasses.stripe}`} />
              <div className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.15rem] text-lg font-black shadow-sm ${colorClasses.bgStrong} ${colorClasses.textStrong}`}>
                    {getInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xl font-black text-slate-950">{name}</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-500">Family profile</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        Active
                      </span>
                    </div>
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                      <p className="truncate text-xs font-black text-slate-800">{nextText}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {hasCustody ? `${tasksCount} tasks · ${mealsCount} meals today` : "Household rhythm"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function ModuleCard({ icon: Icon, title, text, metric, tone, to }) {
  return (
    <Link to={to} className="group rounded-[1.55rem] border border-white/80 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:text-blue-500" />
      </div>
      <p className="mt-4 text-lg font-black text-slate-950">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{text}</p>
      <p className="mt-4 text-2xl font-black text-slate-900">{metric}</p>
    </Link>
  );
}

function ModulesGrid({ hasCustody, tasks, meals, groceries, nextChange }) {
  const cards = [
    hasCustody
      ? {
          icon: Heart,
          title: "Custody",
          text: nextChange ? `Next exchange ${formatShortDate(nextChange.date)}` : "Review custody calendar",
          metric: nextChange ? formatShortDate(nextChange.date) : "Open",
          tone: "rose",
          to: "/custody",
        }
      : {
          icon: CalendarDays,
          title: "Calendar",
          text: "Family events and shared plans",
          metric: "Today",
          tone: "blue",
          to: "/calendar",
        },
    {
      icon: CheckSquare,
      title: "Tasks",
      text: "Assignments, routines, and reminders",
      metric: tasks.length,
      tone: "blue",
      to: "/tasks",
    },
    {
      icon: UtensilsCrossed,
      title: "Meals",
      text: "Today’s meal plan",
      metric: meals.length,
      tone: "amber",
      to: "/meals",
    },
    {
      icon: ShoppingCart,
      title: "Lists",
      text: "Groceries and shared household lists",
      metric: groceries.length,
      tone: "emerald",
      to: "/groceries",
    },
    {
      icon: WalletCards,
      title: "Budget",
      text: "Expenses and reimbursements",
      metric: "Open",
      tone: "violet",
      to: "/custody?tab=budget",
    },
  ];

  return (
    <section>
      <SectionHeader kicker="Family modules" title="Your shared space" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => <ModuleCard key={card.title} {...card} />)}
      </div>
    </section>
  );
}

function ActivityItem({ item }) {
  const Icon = getActivityIcon(item.type);
  const tone = getActivityTone(item.type);
  const actor = item.actorName || item.actor_name || item.actorEmail || "Someone";

  return (
    <div className="flex items-start gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-2.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-black text-slate-950">{item.title || "Family activity"}</p>
          <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatActivityTime(item)}</span>
        </div>
        <p className="truncate text-xs font-semibold text-slate-500">{item.description || "Updated family information"}</p>
        <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">by {actor}</p>
      </div>
    </div>
  );
}

function RecentActivityCard({ activity = [] }) {
  return (
    <Card className="rounded-[1.9rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Activity" title="Recent activity" />
      <div className="mt-4 space-y-2.5">
        {activity.length ? (
          activity.slice(0, 4).map((item, index) => (
            <ActivityItem key={item.id || `${item.type}-${index}`} item={item} />
          ))
        ) : (
          <CompactItem icon={History} title="No activity yet" text="Create or edit family plans to see activity here." tone="slate" />
        )}
      </div>
    </Card>
  );
}

function TaskPreviewCard({ tasks }) {
  const visibleTasks = tasks.slice(0, 4);

  return (
    <Card className="rounded-[1.9rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Today’s tasks" title={tasks.length ? `${tasks.length} pending` : "All clear"} action="View all" to="/tasks" />
      <div className="mt-4 space-y-2.5">
        {visibleTasks.length ? (
          visibleTasks.map((task, index) => (
            <CompactItem
              key={task.id || `${getItemTitle(task)}-${index}`}
              icon={CheckSquare}
              title={getItemTitle(task, "Family task")}
              text={getItemDate(task) ? `Due ${formatShortDate(getItemDate(task))}` : task.assignedTo || task.owner || "Pending"}
              tone="blue"
              to="/tasks"
            />
          ))
        ) : (
          <CompactItem icon={CheckSquare} title="No pending tasks" text="The family list looks calm." tone="emerald" />
        )}
      </div>
    </Card>
  );
}

function NextSevenDaysCard({ nextChange, nextChangeLabel, tasks, meals, groceries, hasCustody }) {
  const today = getTodayKey();
  const nextWeek = new Date(`${today}T12:00:00`);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = nextWeek.toISOString().slice(0, 10);

  const taskEvents = tasks
    .filter((task) => {
      const date = getItemDate(task);
      return date && date >= today && date <= nextWeekKey;
    })
    .slice(0, 3)
    .map((task) => ({
      id: `task-${task.id || getItemTitle(task)}`,
      icon: CheckSquare,
      title: getItemTitle(task, "Task"),
      text: `Task · ${formatShortDate(getItemDate(task))}`,
      tone: "blue",
      to: "/tasks",
    }));

  const mealEvents = meals.slice(0, 2).map((meal) => ({
    id: `meal-${meal.id || getItemTitle(meal)}`,
    icon: UtensilsCrossed,
    title: getItemTitle(meal, "Meal planned"),
    text: `Meal · ${formatShortDate(meal.date || today)}`,
    tone: "amber",
    to: "/meals",
  }));

  const custodyEvent =
    hasCustody && nextChange
      ? [{
          id: "custody-next-change",
          icon: Heart,
          title: `Exchange with ${nextChangeLabel}`,
          text: `${formatShortDate(nextChange.date)} · in ${nextChange.days} day(s)`,
          tone: "rose",
          to: "/custody",
        }]
      : [];

  const groceryEvent = groceries.length
    ? [{
        id: "grocery-open-items",
        icon: ShoppingCart,
        title: `${groceries.length} open list item${groceries.length === 1 ? "" : "s"}`,
        text: "Pending shared list",
        tone: "emerald",
        to: "/groceries",
      }]
    : [];

  const items = [...custodyEvent, ...taskEvents, ...mealEvents, ...groceryEvent].slice(0, 5);

  return (
    <Card className="rounded-[1.9rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Next 7 days" title="Coming up" action="View calendar" to="/calendar" />
      <div className="mt-4 space-y-2.5">
        {items.length ? (
          items.map((item) => <CompactItem key={item.id} icon={item.icon} title={item.title} text={item.text} tone={item.tone} to={item.to} />)
        ) : (
          <CompactItem icon={CalendarDays} title="No major events" text="The next week looks calm." tone="blue" to="/calendar" />
        )}
      </div>
    </Card>
  );
}

function QuickActionsCard({ hasCustody, canReadCalendar }) {
  const quickActions = [
    canReadCalendar ? { icon: CalendarDays, label: "Add event", text: "Family calendar", to: "/calendar", tone: "blue" } : null,
    { icon: CheckSquare, label: "Add task", text: "Assign or remind", to: "/tasks", tone: "blue" },
    { icon: UtensilsCrossed, label: "Plan meals", text: "Today’s meals", to: "/meals", tone: "amber" },
    { icon: ShoppingCart, label: "Open lists", text: "Groceries and more", to: "/groceries", tone: "emerald" },
    hasCustody ? { icon: Heart, label: "Custody", text: "Schedule and notes", to: "/custody", tone: "rose" } : null,
    { icon: Plus, label: "Family profile", text: "Members and settings", to: "/profile", tone: "violet" },
  ].filter(Boolean);

  return (
    <Card className="rounded-[1.9rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Quick actions" title="Add or open" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {quickActions.map((action) => <QuickAction key={action.label} {...action} />)}
      </div>
    </Card>
  );
}

export default function FamilyHomeDashboard({
  familyName = "Family",
  todayLabel,
  todayParent,
  dadName,
  momName,
  dadColor,
  momColor,
  nextChange,
  nextChangeLabel,
  todayCustody,
  children = [],
  tasks = [],
  meals = [],
  groceries = [],
  activity = [],
  loading = false,
  canReadTasks = true,
  canReadMeals = true,
  canReadGroceries = true,
  canReadCalendar = true,
}) {
  const hasChildren = children.length > 0;
  const hasCustody = Boolean(todayCustody || nextChange);
  const familyMode = getFamilyMode({ hasChildren, hasCustody });

  return (
    <div className="kinly-gradient-bg min-h-full px-3 pb-24 pt-2 md:px-5 md:pb-10 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <TodayHero
          familyName={familyName}
          familyMode={familyMode}
          hasCustody={hasCustody}
          hasChildren={hasChildren}
          todayLabel={todayLabel}
          todayParent={todayParent}
          dadName={dadName}
          momName={momName}
          dadColor={dadColor}
          momColor={momColor}
          nextChange={nextChange}
          nextChangeLabel={nextChangeLabel}
          tasks={tasks}
          meals={meals}
          groceries={groceries}
          canReadCalendar={canReadCalendar}
        />

        <AttentionSection
          hasCustody={hasCustody}
          nextChange={nextChange}
          nextChangeLabel={nextChangeLabel}
          tasks={tasks}
          meals={meals}
          groceries={groceries}
          canReadMeals={canReadMeals}
          canReadGroceries={canReadGroceries}
        />

        <ModulesGrid
          hasCustody={hasCustody}
          tasks={tasks}
          meals={meals}
          groceries={groceries}
          nextChange={nextChange}
        />

        <ChildrenSection
          children={children}
          hasCustody={hasCustody}
          todayLabel={todayLabel}
          nextChange={nextChange}
          nextChangeLabel={nextChangeLabel}
          tasksCount={tasks.length}
          mealsCount={meals.length}
        />

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1fr_0.95fr]">
          {canReadTasks && <TaskPreviewCard tasks={tasks} />}
          <NextSevenDaysCard
            nextChange={nextChange}
            nextChangeLabel={nextChangeLabel}
            tasks={tasks}
            meals={meals}
            groceries={groceries}
            hasCustody={hasCustody}
          />
          <QuickActionsCard hasCustody={hasCustody} canReadCalendar={canReadCalendar} />
        </div>

        <RecentActivityCard activity={activity} />
      </div>
    </div>
  );
}
