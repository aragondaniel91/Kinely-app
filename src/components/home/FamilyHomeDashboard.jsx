import React from "react";
import { Link } from "react-router-dom";
import {
  Baby,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Heart,
  Plus,
  School,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getSmartBrief({ loading, tasks, meals, groceries, hasCustody, nextChange, nextChangeLabel }) {
  if (loading) {
    return {
      title: "Loading family day",
      text: "Gathering today’s family summary...",
      tone: "blue",
    };
  }

  if (hasCustody && nextChange?.days <= 1) {
    return {
      title: "Custody transition soon",
      text: `Next exchange with ${nextChangeLabel} is coming up soon.`,
      tone: "rose",
    };
  }

  if (tasks.length >= 4 || groceries.length >= 6) {
    return {
      title: "Busy family day",
      text: `${tasks.length} task(s) and ${groceries.length} grocery item(s) may need attention.`,
      tone: "amber",
    };
  }

  if (meals.length > 0 && tasks.length <= 1 && groceries.length <= 2) {
    return {
      title: "Family flow looks calm",
      text: "Meals are planned and today looks manageable.",
      tone: "emerald",
    };
  }

  if (groceries.length > 0) {
    return {
      title: "Groceries need attention",
      text: `${groceries.length} grocery item(s) are still open.`,
      tone: "violet",
    };
  }

  if (tasks.length > 0) {
    return {
      title: "Tasks are waiting",
      text: `${tasks.length} family task(s) are pending today.`,
      tone: "amber",
    };
  }

  return {
    title: "Family day",
    text: "Everything important is here.",
    tone: "blue",
  };
}

function getToneClasses(tone = "blue") {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return tones[tone] || tones.blue;
}

function SectionHeader({ kicker, title, action, to }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{kicker}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
      </div>
      {action && to && (
        <Link to={to} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-black text-primary transition hover:bg-blue-50">
          {action} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value, text, to, tone = "blue" }) {
  return (
    <Link to={to} className="block">
      <Card className="min-h-[132px] rounded-[1.55rem] border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
            <p className="mt-2 truncate text-2xl font-black text-slate-950">{value}</p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-500">{text}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getToneClasses(tone)}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function QuickAction({ icon: Icon, label, text, to, tone = "blue" }) {
  return (
    <Link
      to={to}
      className="group flex min-h-[76px] items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white/90 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${getToneClasses(tone)}`}>
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
    <div className="flex items-center gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-2.5">
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

function ChildCard({ todayLabel, hasCustody, nextChange, nextChangeLabel, tasksCount, mealsCount }) {
  return (
    <Card className="overflow-hidden rounded-[1.8rem] border-white/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="kinly-family-gradient p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-white/85 text-blue-700 shadow-sm">
              <Baby className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Child focus</p>
              <h3 className="mt-0.5 text-xl font-black text-slate-950">Joaquin</h3>
            </div>
          </div>
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
            Today
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.15rem] border border-white/80 bg-white/75 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Status</p>
            <p className="mt-1 truncate text-sm font-black text-slate-900">
              {hasCustody ? todayLabel : "Family day"}
            </p>
          </div>
          <div className="rounded-[1.15rem] border border-white/80 bg-white/75 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Next</p>
            <p className="mt-1 truncate text-sm font-black text-slate-900">
              {nextChange ? `${nextChange.days} day(s) with ${nextChangeLabel}` : "No urgent change"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-3">
        <CompactItem icon={CheckSquare} title="Tasks" text={`${tasksCount} pending`} tone="amber" />
        <CompactItem icon={UtensilsCrossed} title="Meals" text={`${mealsCount} today`} tone="emerald" />
        <CompactItem icon={School} title="School" text="Ready" tone="blue" />
      </div>
    </Card>
  );
}

export default function FamilyHomeDashboard({
  todayLabel,
  nextChange,
  nextChangeLabel,
  todayCustody,
  tasks,
  meals,
  groceries,
  loading,
  canReadTasks,
  canReadMeals,
  canReadGroceries,
}) {
  const hasCustody = Boolean(todayCustody || nextChange);
  const smartBrief = getSmartBrief({
    loading,
    tasks,
    meals,
    groceries,
    hasCustody,
    nextChange,
    nextChangeLabel,
  });

  const calendarPreviewItems = [
    hasCustody
      ? {
          icon: Heart,
          title: todayLabel,
          text: nextChange
            ? `Next exchange with ${nextChangeLabel} in ${nextChange.days} day(s).`
            : "Custody status is available.",
          tone: "rose",
          to: "/custody",
        }
      : null,
    canReadMeals
      ? {
          icon: UtensilsCrossed,
          title: meals.length > 0 ? `${meals.length} meal(s) planned` : "No meals planned yet",
          text: meals.length > 0 ? "Ready to review today." : "Add breakfast, lunch, snack, or dinner.",
          tone: "emerald",
          to: "/meals",
        }
      : null,
    canReadTasks
      ? {
          icon: CheckSquare,
          title: tasks.length > 0 ? `${tasks.length} task(s) pending` : "No pending tasks",
          text: tasks.length > 0 ? "Review today’s family priorities." : "Your task list looks calm.",
          tone: "amber",
          to: "/tasks",
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="kinly-gradient-bg min-h-full px-3 pb-24 pt-3 md:px-5 md:pb-10 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.07)]">
          <div className="kinly-family-gradient p-5 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Kinly Family Home
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  {getGreeting()}, familia
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                  Un resumen calmado de la casa: calendario, tareas, comidas, compras y coordinación familiar.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to="/calendar" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800">
                    Open calendar
                  </Link>
                  <Link to="/tasks" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-700 hover:shadow-md">
                    Add task
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-white/80 bg-white/85 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur lg:min-w-[310px]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Smart brief</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[1.1rem] border ${getToneClasses(smartBrief.tone)}`}>
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-950">{smartBrief.title}</p>
                    <p className="mt-0.5 text-sm font-bold leading-5 text-slate-500">
                      {smartBrief.text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {canReadTasks && (
            <SummaryCard icon={CheckSquare} title="Tasks" value={tasks.length} text="pending" to="/tasks" tone="amber" />
          )}
          {canReadMeals && (
            <SummaryCard icon={UtensilsCrossed} title="Meals" value={meals.length} text="planned today" to="/meals" tone="emerald" />
          )}
          {canReadGroceries && (
            <SummaryCard icon={ShoppingCart} title="Groceries" value={groceries.length} text="open items" to="/groceries" tone="violet" />
          )}
          <SummaryCard icon={CalendarDays} title="Calendar" value="Today" text="family schedule" to="/calendar" tone="blue" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <div className="space-y-4">
            <ChildCard
              todayLabel={todayLabel}
              hasCustody={hasCustody}
              nextChange={nextChange}
              nextChangeLabel={nextChangeLabel}
              tasksCount={tasks.length}
              mealsCount={meals.length}
            />

            <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
              <SectionHeader kicker="Family calendar" title="Today and upcoming" action="Open" to="/calendar" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {calendarPreviewItems.map((item) => (
                  <CompactItem
                    key={`${item.title}-${item.text}`}
                    icon={item.icon}
                    title={item.title}
                    text={item.text}
                    tone={item.tone}
                    to={item.to}
                  />
                ))}
                <CompactItem
                  icon={CalendarDays}
                  title="Family schedule"
                  text="Open day, week, or month view."
                  tone="blue"
                  to="/calendar"
                />
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
              <SectionHeader kicker="Quick actions" title="Add what matters" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <QuickAction icon={Plus} label="Add family event" text="Create a calendar item" to="/calendar" tone="blue" />
                <QuickAction icon={CheckSquare} label="Add task" text="Assign or track a chore" to="/tasks" tone="amber" />
                <QuickAction icon={UtensilsCrossed} label="Plan meal" text="Breakfast, lunch, snack, dinner" to="/meals" tone="emerald" />
                <QuickAction icon={ShoppingCart} label="Open groceries" text="Shared shopping list" to="/groceries" tone="violet" />
              </div>
            </Card>

            <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Family pulse</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">What matters today</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Live soon</span>
              </div>

              <div className="mt-4 space-y-3">
                {canReadTasks && (
                  <CompactItem
                    icon={CheckSquare}
                    title={tasks.length > 0 ? "Tasks need attention" : "Tasks are clear"}
                    text={tasks.length > 0 ? `${tasks.length} pending task(s) are waiting.` : "No pending tasks right now."}
                    tone="amber"
                    to="/tasks"
                  />
                )}
                {canReadMeals && (
                  <CompactItem
                    icon={UtensilsCrossed}
                    title={meals.length > 0 ? "Meals planned" : "No meals planned yet"}
                    text={meals.length > 0 ? `${meals.length} meal(s) are planned today.` : "Meal planning can be added."}
                    tone="emerald"
                    to="/meals"
                  />
                )}
                {canReadGroceries && (
                  <CompactItem
                    icon={ShoppingCart}
                    title={groceries.length > 0 ? "Groceries still open" : "Groceries look done"}
                    text={groceries.length > 0 ? `${groceries.length} open grocery item(s).` : "No open grocery items."}
                    tone="violet"
                    to="/groceries"
                  />
                )}
                {hasCustody && (
                  <CompactItem
                    icon={Heart}
                    title="Custody summary"
                    text={nextChange ? `Next exchange with ${nextChangeLabel} in ${nextChange.days} day(s).` : todayLabel}
                    tone="rose"
                    to="/custody"
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
