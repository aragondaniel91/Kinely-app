import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckSquare, ChevronRight, Heart, Plus, ShoppingCart, Sparkles, UtensilsCrossed, Users } from "lucide-react";

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
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };

  const content = (
    <Card className="rounded-[1.7rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{text}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </div>
    </Card>
  );

  return <Link to={to}>{content}</Link>;
}

function QuickAction({ icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
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

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(91,141,239,0.15),transparent_34%),linear-gradient(180deg,#F8F7F4_0%,#FFFFFF_56%,#F8FAFC_100%)] px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,209,102,0.22),transparent_34%),linear-gradient(135deg,#ffffff_0%,#eff6ff_48%,#f8f7f4_100%)] p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Kinly Family Home
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  {getGreeting()}, familia
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                  Un resumen calmado de la casa: calendario, tareas, comidas, compras y coordinación familiar en un solo lugar.
                </p>
              </div>

              <div className="rounded-[1.8rem] border border-white/80 bg-white/85 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur lg:min-w-[300px]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Today brief</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-blue-50 text-blue-700">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-950">Family day</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {loading ? "Loading family summary..." : "Everything important is here."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {canReadTasks && (
            <SummaryCard icon={CheckSquare} title="Tasks" value={tasks.length} text="pending task(s)" to="/tasks" tone="amber" />
          )}
          {canReadMeals && (
            <SummaryCard icon={UtensilsCrossed} title="Meals" value={meals.length} text="planned today" to="/meals" tone="emerald" />
          )}
          {canReadGroceries && (
            <SummaryCard icon={ShoppingCart} title="Groceries" value={groceries.length} text="open item(s)" to="/groceries" tone="violet" />
          )}
          <SummaryCard icon={CalendarDays} title="Calendar" value="Today" text="family schedule" to="/calendar" tone="blue" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Family flow</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">What matters today</h2>
              </div>
              <Link to="/calendar" className="flex items-center gap-1 text-sm font-black text-primary">
                Open calendar <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Household rhythm</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Tasks, meals, groceries, and family events stay visible without turning the app into a work dashboard.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Smart family insight</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {tasks.length > 0
                    ? `You have ${tasks.length} pending task(s) to review today.`
                    : "Your family flow looks calm right now."}
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {hasCustody && (
              <Link to="/custody" className="block">
                <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <Heart className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Custody summary</p>
                      <h2 className="mt-1 text-xl font-black text-slate-950">{todayLabel}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {nextChange ? `Next exchange with ${nextChangeLabel} in ${nextChange.days} day(s).` : "No upcoming exchange found."}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </Card>
              </Link>
            )}

            <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Quick actions</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Add what matters</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <QuickAction icon={Plus} label="Add family event" to="/calendar" />
                <QuickAction icon={CheckSquare} label="Add task" to="/tasks" />
                <QuickAction icon={UtensilsCrossed} label="Plan meal" to="/meals" />
                <QuickAction icon={ShoppingCart} label="Open groceries" to="/groceries" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
