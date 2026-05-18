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

function SummaryCard({ icon: Icon, title, value, text, to, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <Link to={to}>
      <Card className="rounded-[1.45rem] border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <p className="text-2xl font-black text-slate-950">{value}</p>
              <p className="truncate text-xs font-bold text-slate-500">{text}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
      </Card>
    </Link>
  );
}

function QuickAction({ icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

function CompactItem({ icon: Icon, title, text, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    <div className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white/80 p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{title}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function ChildCard({ todayLabel, hasCustody, nextChange, nextChangeLabel, tasksCount, mealsCount }) {
  return (
    <Card className="overflow-hidden rounded-[1.8rem] border-white/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="bg-[linear-gradient(135deg,#eff6ff_0%,#fff7ed_100%)] p-4">
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

  const calendarPreviewItems = [
    hasCustody
      ? {
          icon: Heart,
          title: todayLabel,
          text: nextChange
            ? `Next exchange with ${nextChangeLabel} in ${nextChange.days} day(s).`
            : "Custody status is available.",
          tone: "rose",
        }
      : null,
    canReadMeals
      ? {
          icon: UtensilsCrossed,
          title: meals.length > 0 ? `${meals.length} meal(s) planned` : "No meals planned yet",
          text: meals.length > 0 ? "Ready to review today." : "Add breakfast, lunch, snack, or dinner.",
          tone: "emerald",
        }
      : null,
    canReadTasks
      ? {
          icon: CheckSquare,
          title: tasks.length > 0 ? `${tasks.length} task(s) pending` : "No pending tasks",
          text: tasks.length > 0 ? "Review today’s family priorities." : "Your task list looks calm.",
          tone: "amber",
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(91,141,239,0.15),transparent_34%),linear-gradient(180deg,#F8F7F4_0%,#FFFFFF_56%,#F8FAFC_100%)] px-4 py-4 md:px-6 md:py-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.07)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,209,102,0.20),transparent_34%),linear-gradient(135deg,#ffffff_0%,#eff6ff_48%,#f8f7f4_100%)] p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Kinly Family Home
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {getGreeting()}, familia
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                  Un resumen calmado de la casa: calendario, tareas, comidas, compras y coordinación familiar.
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-white/80 bg-white/85 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur lg:min-w-[280px]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Today brief</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-blue-50 text-blue-700">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-950">Family day</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-500">
                      {loading ? "Loading family summary..." : "Everything important is here."}
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

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Family calendar</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Today and upcoming</h2>
                </div>
                <Link to="/calendar" className="flex items-center gap-1 text-sm font-black text-primary">
                  Open <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {calendarPreviewItems.map((item) => (
                  <CompactItem
                    key={`${item.title}-${item.text}`}
                    icon={item.icon}
                    title={item.title}
                    text={item.text}
                    tone={item.tone}
                  />
                ))}
                <CompactItem
                  icon={CalendarDays}
                  title="Family schedule"
                  text="Open day, week, or month view."
                  tone="blue"
                />
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Quick actions</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Add what matters</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <QuickAction icon={Plus} label="Add family event" to="/calendar" />
                <QuickAction icon={CheckSquare} label="Add task" to="/tasks" />
                <QuickAction icon={UtensilsCrossed} label="Plan meal" to="/meals" />
                <QuickAction icon={ShoppingCart} label="Open groceries" to="/groceries" />
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
                  />
                )}
                {canReadMeals && (
                  <CompactItem
                    icon={UtensilsCrossed}
                    title={meals.length > 0 ? "Meals planned" : "No meals planned yet"}
                    text={meals.length > 0 ? `${meals.length} meal(s) are planned today.` : "Meal planning can be added."}
                    tone="emerald"
                  />
                )}
                {canReadGroceries && (
                  <CompactItem
                    icon={ShoppingCart}
                    title={groceries.length > 0 ? "Groceries still open" : "Groceries look done"}
                    text={groceries.length > 0 ? `${groceries.length} open grocery item(s).` : "No open grocery items."}
                    tone="violet"
                  />
                )}
                {hasCustody && (
                  <Link to="/custody" className="block">
                    <CompactItem
                      icon={Heart}
                      title="Custody summary"
                      text={nextChange ? `Next exchange with ${nextChangeLabel} in ${nextChange.days} day(s).` : todayLabel}
                      tone="rose"
                    />
                  </Link>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
