import React, { useEffect, useMemo, useState } from "react";
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
  Sun,
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

function getChildAge(child) {
  if (!child || typeof child === "string") return "";
  if (child.age) return `${child.age} años`;
  if (child.birthdate || child.birthday || child.dateOfBirth) {
    const raw = child.birthdate || child.birthday || child.dateOfBirth;
    const date = raw?.toDate ? raw.toDate() : new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - date.getFullYear();
      const monthDiff = now.getMonth() - date.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1;
      return age > 0 ? `${age} años` : "";
    }
  }
  return "";
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

function getSmartBrief({ loading, tasks, meals, groceries, hasCustody, nextChange, nextChangeLabel }) {
  if (loading) return { title: "Cargando el día familiar", text: "Preparando el resumen de hoy...", tone: "blue" };
  if (hasCustody && nextChange?.days <= 1) return { title: "Transición cerca", text: `Próximo intercambio con ${nextChangeLabel}.`, tone: "rose" };
  if (tasks.length >= 4 || groceries.length >= 6) return { title: "Día ocupado", text: `${tasks.length} tarea(s) y ${groceries.length} compra(s) necesitan atención.`, tone: "amber" };
  if (groceries.length > 0) return { title: "Compras por revisar", text: `${groceries.length} artículo(s) siguen pendientes.`, tone: "violet" };
  if (tasks.length > 0) return { title: "Tareas pendientes", text: `${tasks.length} tarea(s) familiares siguen abiertas.`, tone: "amber" };
  if (meals.length > 0) return { title: "Día organizado", text: "Hay comida planificada y el día se ve manejable.", tone: "emerald" };
  return { title: "Día familiar", text: "Lo importante está organizado aquí.", tone: "blue" };
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

function WeatherPill() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
      <span className="text-sm font-black text-slate-900">
        {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </span>
      <span className="h-1 w-1 rounded-full bg-slate-300" />
      <span className="text-sm font-bold text-slate-500">68°</span>
      <Sun className="h-4 w-4 text-amber-400" />
      <span className="hidden text-sm font-bold text-slate-500 sm:inline">Sunny</span>
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
        <Link to={to} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-black text-primary transition hover:bg-blue-50">
          {action} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, text, to, tone = "blue" }) {
  return (
    <Link to={to} className="group flex min-h-[72px] items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white/90 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
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

function StatPill({ icon: Icon, value, label, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/75 px-3 py-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${getToneClasses(tone)}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function HeroPanel({ smartBrief, tasks, meals, groceries, hasCustody }) {
  return (
    <div className="rounded-[1.8rem] border border-white/80 bg-white/82 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Resumen inteligente</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{smartBrief.title}</h2>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-500">{smartBrief.text}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] border ${getToneClasses(smartBrief.tone)}`}>
          <Users className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatPill icon={CheckSquare} value={tasks.length} label="Tareas pendientes" tone="blue" />
        <StatPill icon={CalendarDays} value={hasCustody ? 1 : meals.length} label="Eventos importantes" tone="blue" />
        <StatPill icon={ShoppingCart} value={groceries.length} label="Compras abiertas" tone="emerald" />
        <StatPill icon={Heart} value="✓" label="Sin alertas" tone="rose" />
      </div>
    </div>
  );
}

function Hero({ smartBrief, tasks, meals, groceries, hasCustody }) {
  return (
    <section className="overflow-hidden rounded-[2.4rem] border border-white/80 bg-white shadow-[0_20px_58px_rgba(15,23,42,0.08)]">
      <div className="kinly-family-gradient p-5 md:p-8 lg:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Kinly Family Home
          </div>
          <WeatherPill />
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.12fr_0.88fr] xl:items-end">
          <div>
            <h1 className="max-w-4xl text-5xl font-black tracking-tight text-slate-950 md:text-7xl lg:text-8xl">
              {getGreeting()}, familia <span className="text-amber-400">♥</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600 md:text-xl">
              Tu familia conectada en un solo lugar: agenda, niños, tareas, comidas y compras.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/calendar" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800">
                Abrir calendario
              </Link>
              <Link to="/tasks" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-700 hover:shadow-md">
                Agregar tarea
              </Link>
            </div>
          </div>

          <HeroPanel smartBrief={smartBrief} tasks={tasks} meals={meals} groceries={groceries} hasCustody={hasCustody} />
        </div>
      </div>
    </section>
  );
}

function ChildrenSection({ children = [], todayLabel, nextChange, nextChangeLabel, tasksCount, mealsCount }) {
  const visibleChildren = children.length ? children : [{ name: "Joaquin" }];

  return (
    <Card className="rounded-[2rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Niños" title="Perfiles familiares" action="Ver todo" to="/children" />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {visibleChildren.slice(0, 4).map((child, index) => {
          const name = getChildName(child, index);
          const age = getChildAge(child);
          const isFirst = index === 0;
          const nextText = isFirst
            ? nextChange
              ? `Próximo: ${formatShortDate(nextChange.date)} con ${nextChangeLabel}`
              : todayLabel
            : "Próximo: revisar calendario";

          return (
            <Link key={`${name}-${index}`} to="/children" className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
              <div className={`h-2 ${isFirst ? "bg-blue-400" : "bg-rose-300"}`} />
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] text-2xl font-black shadow-sm ${isFirst ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
                    {getInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-2xl font-black text-slate-950">{name}</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-500">{age || "Perfil familiar"}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        Sin alertas
                      </span>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                      <p className="truncate text-sm font-black text-slate-800">{nextText}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{tasksCount} tareas · {mealsCount} comidas hoy</p>
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

function TodayFocusSection({ tasks, meals, groceries, hasCustody, nextChange, nextChangeLabel }) {
  const focusItems = [
    hasCustody ? { icon: CalendarDays, title: "Custodia", text: nextChange ? `${formatShortDate(nextChange.date)} con ${nextChangeLabel}` : "Estado disponible", tone: "blue", to: "/custody" } : null,
    tasks.length ? { icon: School, title: "Preparar pendientes", text: `${tasks.length} tarea${tasks.length === 1 ? "" : "s"} por revisar`, tone: "emerald", to: "/tasks" } : { icon: School, title: "Sin pendientes", text: "No hay tareas urgentes", tone: "emerald", to: "/tasks" },
    meals.length ? { icon: UtensilsCrossed, title: "Comida planificada", text: `${meals.length} comida${meals.length === 1 ? "" : "s"} para hoy`, tone: "amber", to: "/meals" } : { icon: UtensilsCrossed, title: "Planear comida", text: "Todavía no hay comida planeada", tone: "amber", to: "/meals" },
    groceries.length ? { icon: ShoppingCart, title: "Lista de compras", text: `${groceries.length} artículo${groceries.length === 1 ? "" : "s"} pendiente${groceries.length === 1 ? "" : "s"}`, tone: "violet", to: "/groceries" } : { icon: Heart, title: "Tiempo para conectar", text: "Todo se ve calmado por ahora", tone: "rose", to: "/calendar" },
  ].filter(Boolean).slice(0, 4);

  return (
    <Card className="rounded-[2rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="En foco hoy" title="Lo importante" action="Ver todo" to="/calendar" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {focusItems.map((item) => (
          <Link key={item.title} to={item.to} className="flex min-h-[190px] flex-col justify-between rounded-[1.6rem] border border-slate-200 bg-white/80 p-5 transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
            <div className={`flex h-16 w-16 items-center justify-center rounded-[1.35rem] border ${getToneClasses(item.tone)}`}>
              <item.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{item.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function TaskPreviewCard({ tasks }) {
  const visibleTasks = tasks.slice(0, 4);
  return (
    <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Tareas de hoy" title={tasks.length ? `${tasks.length} pendientes` : "Todo claro"} action="Ver todas" to="/tasks" />
      <div className="mt-4 space-y-2.5">
        {visibleTasks.length ? visibleTasks.map((task, index) => (
          <Link key={task.id || `${getItemTitle(task)}-${index}`} to="/tasks" className="flex items-center gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-2.5 transition hover:border-amber-100 hover:bg-amber-50/40">
            <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-200" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-slate-950">{getItemTitle(task, "Tarea familiar")}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">{getItemDate(task) ? `Para ${formatShortDate(getItemDate(task))}` : task.assignedTo || task.owner || "Pendiente"}</span>
            </span>
          </Link>
        )) : <CompactItem icon={CheckSquare} title="No hay tareas pendientes" text="La lista familiar se ve tranquila." tone="emerald" />}
      </div>
    </Card>
  );
}

function NextSevenDaysCard({ nextChange, nextChangeLabel, tasks, meals, groceries }) {
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
    .map((task) => ({ id: `task-${task.id || getItemTitle(task)}`, icon: CheckSquare, title: getItemTitle(task, "Tarea"), text: `Tarea · ${formatShortDate(getItemDate(task))}`, tone: "amber", to: "/tasks" }));

  const mealEvents = meals.slice(0, 2).map((meal) => ({ id: `meal-${meal.id || getItemTitle(meal)}`, icon: UtensilsCrossed, title: getItemTitle(meal, "Comida planificada"), text: `Comida · ${formatShortDate(meal.date || today)}`, tone: "emerald", to: "/meals" }));
  const custodyEvent = nextChange ? [{ id: "custody-next-change", icon: Heart, title: `Intercambio con ${nextChangeLabel}`, text: `${formatShortDate(nextChange.date)} · en ${nextChange.days} día(s)`, tone: "rose", to: "/custody" }] : [];
  const groceryEvent = groceries.length ? [{ id: "grocery-open-items", icon: ShoppingCart, title: `${groceries.length} compra${groceries.length === 1 ? "" : "s"} abierta${groceries.length === 1 ? "" : "s"}`, text: "Lista de compras pendiente", tone: "violet", to: "/groceries" }] : [];
  const items = [...custodyEvent, ...taskEvents, ...mealEvents, ...groceryEvent].slice(0, 5);

  return (
    <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Próximos 7 días" title="Lo que viene" action="Ver calendario" to="/calendar" />
      <div className="mt-4 space-y-2.5">
        {items.length ? items.map((item) => <CompactItem key={item.id} icon={item.icon} title={item.title} text={item.text} tone={item.tone} to={item.to} />) : <CompactItem icon={CalendarDays} title="Sin eventos importantes" text="La próxima semana se ve tranquila." tone="blue" to="/calendar" />}
      </div>
    </Card>
  );
}

function ShoppingPreviewCard({ groceries, canReadGroceries }) {
  if (!canReadGroceries || groceries.length === 0) return null;
  return (
    <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <SectionHeader kicker="Compras" title={`${groceries.length} pendientes`} action="Ver lista" to="/groceries" />
      <div className="mt-4 flex flex-wrap gap-2">
        {groceries.slice(0, 7).map((item, index) => (
          <Link key={item.id || `${getItemTitle(item)}-${index}`} to="/groceries" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
            {getItemTitle(item, "Item")}
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function FamilyHomeDashboard({
  todayLabel,
  nextChange,
  nextChangeLabel,
  todayCustody,
  children = [],
  tasks,
  meals,
  groceries,
  loading,
  canReadTasks,
  canReadMeals,
  canReadGroceries,
}) {
  const hasCustody = Boolean(todayCustody || nextChange);
  const smartBrief = getSmartBrief({ loading, tasks, meals, groceries, hasCustody, nextChange, nextChangeLabel });

  const quickActions = useMemo(() => [
    { icon: CalendarDays, label: "Agregar evento", text: "Calendario familiar", to: "/calendar", tone: "blue" },
    { icon: CheckSquare, label: "Agregar tarea", text: "Asignar pendiente", to: "/tasks", tone: "emerald" },
    { icon: UtensilsCrossed, label: "Planear comida", text: "Comidas del día", to: "/meals", tone: "amber" },
    { icon: ShoppingCart, label: "Abrir compras", text: "Lista compartida", to: "/groceries", tone: "violet" },
  ], []);

  return (
    <div className="kinly-gradient-bg min-h-full px-3 pb-24 pt-2 md:px-5 md:pb-10 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <Hero smartBrief={smartBrief} tasks={tasks} meals={meals} groceries={groceries} hasCustody={hasCustody} />

        <ChildrenSection
          children={children}
          todayLabel={todayLabel}
          nextChange={nextChange}
          nextChangeLabel={nextChangeLabel}
          tasksCount={tasks.length}
          mealsCount={meals.length}
        />

        <TodayFocusSection
          tasks={tasks}
          meals={meals}
          groceries={groceries}
          hasCustody={hasCustody}
          nextChange={nextChange}
          nextChangeLabel={nextChangeLabel}
        />

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1fr_0.9fr]">
          {canReadTasks && <TaskPreviewCard tasks={tasks} />}
          <NextSevenDaysCard nextChange={nextChange} nextChangeLabel={nextChangeLabel} tasks={tasks} meals={meals} groceries={groceries} />
          <Card className="rounded-[1.8rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
            <SectionHeader kicker="Acciones rápidas" title="Agregar" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map((action) => <QuickAction key={action.label} {...action} />)}
            </div>
          </Card>
        </div>

        <ShoppingPreviewCard groceries={groceries} canReadGroceries={canReadGroceries} />
      </div>
    </div>
  );
}
