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
  if (value instanceof Date) return value.toISOString().slice(0, 10);
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
  const raw = activity?.created_at || activity?.createdAt || activity?.updated_at || activity?.updatedAt;
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
  return normalizeDate(
    item?.date ||
      item?.dueDate ||
      item?.due_date ||
      item?.due ||
      item?.scheduledDate ||
      item?.scheduled_date ||
      item?.startDate ||
      item?.start_date ||
      item?.start
  );
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
  if (type.includes("task")) return CheckSquare;
  if (type.includes("meal")) return UtensilsCrossed;
  if (type.includes("grocery") || type.includes("list")) return ShoppingCart;
  if (type.includes("travel") || type.includes("calendar") || type.includes("event")) return CalendarDays;
  if (type.includes("custody")) return Heart;
  if (type.includes("deleted")) return AlertCircle;
  return History;
}

function getActivityTone(type = "") {
  if (type.includes("deleted")) return "rose";
  if (type.includes("task")) return "blue";
  if (type.includes("meal")) return "amber";
  if (type.includes("grocery") || type.includes("list")) return "emerald";
  if (type.includes("custody")) return "rose";
  if (type.includes("travel") || type.includes("calendar") || type.includes("event")) return "violet";
  return "slate";
}

function getFamilyMode({ hasChildren, hasCustody }) {
  if (hasCustody) {
    return {
      id: "coparenting",
      label: "Coparenting rhythm",
      headline: "Family rhythm with custody context",
      description: "Custody, kids, tasks, meals, and shared planning.",
      icon: Heart,
      tone: "rose",
    };
  }

  if (hasChildren) {
    return {
      id: "family",
      label: "Family household",
      headline: "Kids, meals, tasks, lists, and events",
      description: "A compact view of what matters today.",
      icon: Home,
      tone: "blue",
    };
  }

  return {
    id: "shared",
    label: "Shared household",
    headline: "Tasks, meals, lists, and shared plans",
    description: "Everything your household needs today.",
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
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{kicker}</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 md:text-xl">{title}</h2>
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

function MetricPill({ icon: Icon, label, value, tone = "blue", to }) {
  const content = (
    <div className="flex min-h-[72px] items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/80 px-3 py-2 shadow-sm transition hover:bg-white hover:shadow-md">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${getToneClasses(tone)}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xl font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 truncate text-[11px] font-bold text-slate-500">{label}</p>
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function CompactItem({ icon: Icon, title, text, tone = "blue", to }) {
  const content = (
    <div className="flex items-center gap-3 rounded-[1.05rem] border border-slate-200 bg-white/80 px-3 py-2.5 transition hover:border-blue-100 hover:bg-white">
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

function AttentionChip({ icon: Icon, title, text, tone = "blue", to }) {
  const content = (
    <div className="flex h-full items-center gap-3 rounded-[1.25rem] border border-white/80 bg-white/85 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-950">{title}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{text}</p>
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function CompactHero({
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

  const ownerLabel =
    todayParent === "dad"
      ? dadName || "Dad"
      : todayParent === "mom"
      ? momName || "Mom"
      : todayParent === "split"
      ? "Split day"
      : "";

  const todayTitle = hasCustody && ownerLabel
    ? `${ownerLabel} today`
    : hasChildren
    ? `${familyName} plan for today`
    : `${familyName} shared plan`;

  const todayText = hasCustody && nextChange
    ? `Next exchange ${formatShortDate(nextChange.date)} with ${nextChangeLabel}.`
    : familyMode.description;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.07)]">
      <div className="kinly-family-gradient p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Family home
          </div>
          <WeatherPill />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr] xl:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 py-2 shadow-sm">
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${getToneClasses(familyMode.tone)}`}>
                <ModeIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Family mode</p>
                <p className="text-xs font-black text-slate-800">{familyMode.label}</p>
              </div>
            </div>

            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 md:text-4xl lg:text-5xl">
              {getGreeting()}, {familyName}
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
              {familyMode.headline}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
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

          <div className="rounded-[1.55rem] border border-white/80 bg-white/88 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Today</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 md:text-2xl">{todayTitle}</h2>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-500">{todayText}</p>
              </div>

              {hasCustody && ownerLabel ? (
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border ${parentClasses.bgStrong} ${parentClasses.textStrong} ${parentClasses.border}`}>
                  <Heart className="h-5 w-5" />
                </div>
              ) : (
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border ${getToneClasses(familyMode.tone)}`}>
                  <Home className="h-5 w-5" />
                </div>
              )}
            </div>

            {hasCustody && ownerLabel && (
              <div className={`mt-3 rounded-2xl border px-3 py-2 ${parentClasses.chip} ${parentClasses.border}`}>
                <p className={`text-sm font-black ${parentClasses.textStrong}`}>{todayLabel}</p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricPill icon={CheckSquare} value={tasks.length} label="Open tasks" tone="blue" to="/tasks" />
              <MetricPill icon={UtensilsCrossed} value={meals.length} label="Meals today" tone="amber" to="/meals" />
              <MetricPill icon={ShoppingCart} value={groceries.length} label="List items" tone="emerald" to="/groceries" />
              <MetricPill icon={CalendarDays} value={nextChange ? formatShortDate(nextChange.date) : "Today"} label={hasCustody ? "Next exchange" : "Calendar"} tone="violet" to="/calendar" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NeedsAttention({ hasCustody, nextChange, nextChangeLabel, tasks, meals, groceries, canReadMeals, canReadGroceries }) {
  const items = [];

  if (hasCustody && nextChange?.days <= 1) {
    items.push({
      icon: Heart,
      title: "Exchange soon",
      text: `${formatShortDate(nextChange.date)} with ${nextChangeLabel}`,
      tone: "rose",
      to: "/custody",
    });
  }

  if (tasks.length > 0) {
    items.push({
      icon: CheckSquare,
      title: `${tasks.length} pending task${tasks.length === 1 ? "" : "s"}`,
      text: "Review family assignments",
      tone: "blue",
      to: "/tasks",
    });
  }

  if (canReadMeals && meals.length === 0) {
    items.push({
      icon: UtensilsCrossed,
      title: "No meals planned",
      text: "Add today’s meals",
      tone: "amber",
      to: "/meals",
    });
  }

  if (canReadGroceries && groceries.length > 0) {
    items.push({
      icon: ShoppingCart,
      title: `${groceries.length} list item${groceries.length === 1 ? "" : "s"}`,
      text: "Shared lists need review",
      tone: "emerald",
      to: "/groceries",
    });
  }

  if (!items.length) {
    items.push({
      icon: Sparkles,
      title: "All calm",
      text: "No urgent family items right now",
      tone: "emerald",
      to: "/calendar",
    });
  }

  return (
    <Card className="rounded-[1.7rem] border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Needs attention" title="Status now" action="View calendar" to="/calendar" />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 4).map((item) => <AttentionChip key={item.title} {...item} />)}
      </div>
    </Card>
  );
}

function ModuleCard({ icon: Icon, title, text, metric, tone, to }) {
  return (
    <Link to={to} className="group rounded-[1.45rem] border border-white/80 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:text-blue-500" />
      </div>
      <p className="mt-3 text-base font-black text-slate-950">{title}</p>
      <p className="mt-1 min-h-[38px] text-xs font-semibold leading-5 text-slate-500">{text}</p>
      <p className="mt-3 text-xl font-black text-slate-900">{metric}</p>
    </Link>
  );
}

function ModulesGrid({ hasCustody, tasks, meals, groceries, nextChange }) {
  const cards = [
    hasCustody
      ? {
          icon: Heart,
          title: "Custody",
          text: nextChange ? `Next exchange ${formatShortDate(nextChange.date)}` : "Schedule and notes",
          metric: nextChange ? formatShortDate(nextChange.date) : "Open",
          tone: "rose",
          to: "/custody",
        }
      : {
          icon: CalendarDays,
          title: "Calendar",
          text: "Events and shared plans",
          metric: "Today",
          tone: "blue",
          to: "/calendar",
        },
    {
      icon: CheckSquare,
      title: "Tasks",
      text: "Assignments and reminders",
      metric: tasks.length,
      tone: "blue",
      to: "/tasks",
    },
    {
      icon: UtensilsCrossed,
      title: "Meals",
      text: "Today and next meals",
      metric: meals.length,
      tone: "amber",
      to: "/meals",
    },
    {
      icon: ShoppingCart,
      title: "Lists",
      text: "Groceries and household lists",
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
      <SectionHeader kicker="Family modules" title="Shared space" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => <ModuleCard key={card.title} {...card} />)}
      </div>
    </section>
  );
}

function FamilySnapshot({ children = [], hasCustody, todayLabel, nextChange, nextChangeLabel, tasksCount, mealsCount }) {
  if (!children.length) return null;

  return (
    <Card className="rounded-[1.7rem] border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Family snapshot" title="Children" action="View all" to="/children" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {children.slice(0, 4).map((child, index) => {
          const name = getChildName(child, index);
          const colorClasses = getChildColorClasses(child, index);
          const status = hasCustody
            ? nextChange
              ? `Next: ${formatShortDate(nextChange.date)} with ${nextChangeLabel}`
              : todayLabel
            : `${tasksCount} tasks · ${mealsCount} meals today`;

          return (
            <Link
              key={`${name}-${index}`}
              to="/children"
              className={`flex items-center gap-3 rounded-[1.3rem] border bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md ${colorClasses.border}`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] text-base font-black shadow-sm ${colorClasses.bgStrong} ${colorClasses.textStrong}`}>
                {getInitials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-slate-950">{name}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{status}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                Active
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function buildNextSevenItems({ calendarEvents, tasks, upcomingMeals, groceries, nextChange, nextChangeLabel, hasCustody }) {
  const today = getTodayKey();
  const nextWeek = new Date(`${today}T12:00:00`);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = nextWeek.toISOString().slice(0, 10);

  const inWindow = (date) => date && date >= today && date <= nextWeekKey;

  const eventItems = calendarEvents
    .filter((event) => inWindow(getItemDate(event)))
    .map((event) => ({
      id: `event-${event.id || getItemTitle(event)}`,
      date: getItemDate(event),
      icon: CalendarDays,
      title: getItemTitle(event, "Family event"),
      text: `Calendar · ${formatShortDate(getItemDate(event))}`,
      tone: "violet",
      to: "/calendar",
    }));

  const taskItems = tasks
    .filter((task) => inWindow(getItemDate(task)))
    .map((task) => ({
      id: `task-${task.id || getItemTitle(task)}`,
      date: getItemDate(task),
      icon: CheckSquare,
      title: getItemTitle(task, "Task"),
      text: `Task · ${formatShortDate(getItemDate(task))}`,
      tone: "blue",
      to: "/tasks",
    }));

  const mealItems = upcomingMeals
    .filter((meal) => inWindow(getItemDate(meal)))
    .map((meal) => ({
      id: `meal-${meal.id || getItemTitle(meal)}`,
      date: getItemDate(meal),
      icon: UtensilsCrossed,
      title: getItemTitle(meal, "Meal planned"),
      text: `Meal · ${formatShortDate(getItemDate(meal))}`,
      tone: "amber",
      to: "/meals",
    }));

  const custodyItems =
    hasCustody && nextChange
      ? [{
          id: "custody-next-change",
          date: normalizeDate(nextChange.date),
          icon: Heart,
          title: `Exchange with ${nextChangeLabel}`,
          text: `${formatShortDate(nextChange.date)} · custody`,
          tone: "rose",
          to: "/custody",
        }]
      : [];

  const groceryItems = groceries.length
    ? [{
        id: "grocery-open-items",
        date: today,
        icon: ShoppingCart,
        title: `${groceries.length} open list item${groceries.length === 1 ? "" : "s"}`,
        text: "Shared lists · Today",
        tone: "emerald",
        to: "/groceries",
      }]
    : [];

  return [...custodyItems, ...eventItems, ...taskItems, ...mealItems, ...groceryItems]
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
}

function NextSevenDaysCard({ calendarEvents, nextChange, nextChangeLabel, tasks, upcomingMeals, groceries, hasCustody }) {
  const items = buildNextSevenItems({ calendarEvents, nextChange, nextChangeLabel, tasks, upcomingMeals, groceries, hasCustody });

  return (
    <Card className="rounded-[1.7rem] border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Next 7 days" title="Calendar flow" action="View calendar" to="/calendar" />
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

function TaskPreviewCard({ tasks }) {
  const visibleTasks = tasks.slice(0, 4);

  return (
    <Card className="rounded-[1.7rem] border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
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

function MealsPreviewCard({ upcomingMeals }) {
  const items = upcomingMeals.slice(0, 4);

  return (
    <Card className="rounded-[1.7rem] border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Meals" title="Today + next days" action="Plan meals" to="/meals" />
      <div className="mt-4 space-y-2.5">
        {items.length ? (
          items.map((meal, index) => (
            <CompactItem
              key={meal.id || `${getItemTitle(meal)}-${index}`}
              icon={UtensilsCrossed}
              title={getItemTitle(meal, "Meal")}
              text={`${formatShortDate(getItemDate(meal))} · ${meal.meal_type || meal.mealType || "Meal"}`}
              tone="amber"
              to="/meals"
            />
          ))
        ) : (
          <CompactItem icon={UtensilsCrossed} title="No meals planned" text="Add meals for the next few days." tone="amber" to="/meals" />
        )}
      </div>
    </Card>
  );
}

function ActivityItem({ item }) {
  const Icon = getActivityIcon(item.type || item.category || "");
  const tone = getActivityTone(item.type || item.category || "");
  const actor = item.actorName || item.actor_name || item.actorEmail || "Family";

  return (
    <div className="flex items-start gap-3 rounded-[1.05rem] border border-slate-200 bg-white/80 px-3 py-2.5">
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

function FamilyActivityCard({ activity = [] }) {
  return (
    <Card className="rounded-[1.7rem] border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Activity" title="Family updates" />
      <div className="mt-4 space-y-2.5">
        {activity.length ? (
          activity.slice(0, 4).map((item, index) => (
            <ActivityItem key={item.id || `${item.type}-${index}`} item={item} />
          ))
        ) : (
          <CompactItem icon={History} title="No activity yet" text="Family updates will appear here." tone="slate" />
        )}
      </div>
    </Card>
  );
}

export default function FamilyHomeDashboard({
  familyName = "Family",
  todayLabel = "",
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
  upcomingMeals = [],
  groceries = [],
  activity = [],
  calendarEvents = [],
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
        <CompactHero
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

        <NeedsAttention
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

        <FamilySnapshot
          children={children}
          hasCustody={hasCustody}
          todayLabel={todayLabel}
          nextChange={nextChange}
          nextChangeLabel={nextChangeLabel}
          tasksCount={tasks.length}
          mealsCount={meals.length}
        />

        <div className="grid gap-4 xl:grid-cols-3">
          {canReadTasks && <TaskPreviewCard tasks={tasks} />}
          <NextSevenDaysCard
            calendarEvents={calendarEvents}
            nextChange={nextChange}
            nextChangeLabel={nextChangeLabel}
            tasks={tasks}
            upcomingMeals={upcomingMeals}
            groceries={groceries}
            hasCustody={hasCustody}
          />
          {canReadMeals ? <MealsPreviewCard upcomingMeals={upcomingMeals} /> : <FamilyActivityCard activity={activity} />}
        </div>

        {canReadMeals && <FamilyActivityCard activity={activity} />}
      </div>
    </div>
  );
}
