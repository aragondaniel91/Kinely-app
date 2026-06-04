import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Heart,
  History,
  ListChecks,
  ShoppingCart,
  Sparkles,
  Sun,
  UtensilsCrossed,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";
import { resolveAssignedPersonFromRecord, resolveEventPersonFromRecord, resolvePersonFromRecord, samePerson } from "@/core/people/peopleCore";
import { shouldShowMemberOnHome } from "@/features/tasks/utils/memberModuleVisibility";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
      item?.start ||
      item?.eventDate ||
      item?.event_date
  );
}

function getItemTime(item) {
  return item?.time || item?.startTime || item?.start_time || item?.hour || "";
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

function getPersonColorClasses(person, index = 0) {
  const fallbackColors = ["blue", "rose", "green", "violet", "amber", "teal"];
  const fallback = fallbackColors[index % fallbackColors.length];

  const rawColor =
    person?.colorId ||
    person?.color_id ||
    person?.color ||
    person?.familyColor ||
    person?.family_color ||
    person?.calendarColor ||
    person?.calendar_color ||
    fallback;

  return getColorClasses(normalizeColorId(rawColor, fallback), fallback);
}

function getEventColorClasses(event, assignedPerson, index = 0) {
  const fallbackColors = ["violet", "blue", "amber", "emerald", "rose", "teal"];
  const fallback = fallbackColors[index % fallbackColors.length];

  const rawEventColor =
    event?.colorId ||
    event?.color_id ||
    event?.color ||
    event?.eventColor ||
    event?.event_color ||
    event?.calendarColor ||
    event?.calendar_color ||
    event?.personColor ||
    event?.person_color ||
    "";

  if (rawEventColor) {
    return getColorClasses(normalizeColorId(rawEventColor, fallback), fallback);
  }

  if (assignedPerson) {
    return getPersonColorClasses(assignedPerson, index);
  }

  return getColorClasses(normalizeColorId(fallback, fallback), fallback);
}

function personName(person) {
  return person?.displayName || person?.name || person?.fullName || person?.firstName || person?.email || "";
}

function normalizeIdentityToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w@.\-áéíóúñü\s]/gi, "")
    .replace(/\s+/g, " ");
}

function firstNameToken(value) {
  return normalizeIdentityToken(value).split(" ")[0] || "";
}

function collectIdentityValues(value, output = []) {
  if (!value) return output;

  if (Array.isArray(value)) {
    value.forEach((entry) => collectIdentityValues(entry, output));
    return output;
  }

  if (typeof value === "object") {
    [
      value.id,
      value.uid,
      value.userId,
      value.user_id,
      value.memberId,
      value.member_id,
      value.personId,
      value.person_id,
      value.childId,
      value.child_id,
      value.email,
      value.name,
      value.displayName,
      value.fullName,
      value.firstName,
      value.label,
      value.title,
    ].forEach((entry) => collectIdentityValues(entry, output));

    return output;
  }

  output.push(value);
  return output;
}

function getPersonIdentityTokens(person = {}) {
  const values = [
    person.id,
    person.uid,
    person.userId,
    person.user_id,
    person.memberId,
    person.member_id,
    person.personId,
    person.person_id,
    person.email,
    person.name,
    person.displayName,
    person.fullName,
    person.firstName,
  ];

  const tokens = values
    .filter(Boolean)
    .map(normalizeIdentityToken)
    .filter(Boolean);

  const adultFirst = firstNameToken(person.name || person.displayName || person.fullName || person.email);
  const type = normalizeIdentityToken(person.type || person.role || person.relationship);

  if (adultFirst && !["child", "kid", "son", "daughter"].includes(type)) {
    tokens.push(`adult-first:${adultFirst}`);
  }

  return Array.from(new Set(tokens));
}

function getItemIdentityTokens(item = {}) {
  const rawFields = [
    item.assignedTo,
    item.assigned_to,
    item.assignees,
    item.assignee,
    item.assigneeName,
    item.assignee_name,
    item.assignedToName,
    item.assigned_to_name,
    item.assignedToNames,
    item.assigned_to_names,

    item.owner,
    item.ownerName,
    item.owner_name,
    item.ownerId,
    item.owner_id,
    item.ownerUid,
    item.owner_uid,

    item.person,
    item.personName,
    item.person_name,
    item.personId,
    item.person_id,
    item.personIds,
    item.person_ids,

    item.member,
    item.memberName,
    item.member_name,
    item.memberId,
    item.member_id,
    item.memberIds,
    item.member_ids,

    item.child,
    item.childName,
    item.child_name,
    item.childId,
    item.child_id,
    item.childIds,
    item.child_ids,

    item.createdBy,
    item.created_by,
    item.createdByName,
    item.created_by_name,
    item.createdByUid,
    item.created_by_uid,
    item.createdByEmail,
    item.created_by_email,

    item.actor,
    item.actorName,
    item.actor_name,
    item.actorEmail,
    item.actor_email,
    item.actorUid,
    item.actor_uid,

    item.attendees,
    item.participants,
    item.people,
    item.members,
    item.familyMembers,
    item.guests,
    item.invitees,
  ];

  const collected = [];
  rawFields.forEach((field) => collectIdentityValues(field, collected));

  const tokens = collected
    .filter(Boolean)
    .map(normalizeIdentityToken)
    .filter(Boolean);

  // Adult first-name alias. This helps legacy records match a full display name.
  collected.forEach((value) => {
    const first = firstNameToken(value);
    if (first) tokens.push(`adult-first:${first}`);
  });

  return Array.from(new Set(tokens));
}

function matchesPerson(item, person) {
  if (!item || !person) return false;

  const personTokens = getPersonIdentityTokens(person);
  const itemTokens = getItemIdentityTokens(item);

  if (!personTokens.length || !itemTokens.length) return false;

  return personTokens.some((token) => itemTokens.includes(token));
}

function findPersonForItem(item, people = []) {
  return resolvePersonFromRecord(item, people);
}

function recordBelongsToPerson(record, person, people = [], options = {}) {
  const resolvedPerson =
    options.type === "event"
      ? resolveEventPersonFromRecord(record, people)
      : options.type === "assignment"
      ? resolveAssignedPersonFromRecord(record, people)
      : resolvePersonFromRecord(record, people);

  return Boolean(resolvedPerson && samePerson(resolvedPerson, person));
}

function getMealTone(meal) {
  const type = String(meal?.meal_type || meal?.mealType || meal?.type || "").toLowerCase();

  if (type.includes("breakfast")) return "amber";
  if (type.includes("lunch")) return "emerald";
  if (type.includes("snack")) return "violet";
  if (type.includes("dinner")) return "rose";

  return "amber";
}

function getActivityIcon(type = "") {
  if (type.includes("task")) return CheckSquare;
  if (type.includes("meal")) return UtensilsCrossed;
  if (type.includes("grocery") || type.includes("list")) return ShoppingCart;
  if (type.includes("calendar") || type.includes("event")) return CalendarDays;
  if (type.includes("custody")) return Heart;
  if (type.includes("deleted")) return AlertCircle;
  return History;
}

function getActivityTone(type = "") {
  if (type.includes("deleted")) return "rose";
  if (type.includes("task")) return "blue";
  if (type.includes("meal")) return "amber";
  if (type.includes("grocery") || type.includes("list")) return "emerald";
  if (type.includes("calendar") || type.includes("event")) return "violet";
  if (type.includes("custody")) return "rose";
  return "slate";
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

function TimeWeatherPanel({ tasksToday, mealsToday, calendarEventsToday }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const total = tasksToday.length + mealsToday.length + calendarEventsToday.length;
  const message =
    total >= 8
      ? "A full family rhythm today 💙"
      : total > 0
      ? "Here’s what matters most today ☀️"
      : "Looks like a calm family day ☀️";

  return (
    <div className="rounded-[1.35rem] border border-white/35 bg-white/15 p-3.5 text-right shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-md">
      <div className="flex items-center justify-end gap-3">
        <div>
          <p className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <p className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
            {now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-[1.25rem] border border-amber-100 bg-amber-50 text-amber-500">
          <Sun className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-left backdrop-blur-sm">
        <p className="text-sm font-black text-slate-950">{message}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          A calm glance at today’s rhythm for everyone at home.
        </p>
      </div>
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

function MiniPulse({ icon: Icon, value, label, tone, to }) {
  return (
    <Link
      to={to}
      className="flex min-h-[52px] items-center gap-3 rounded-[1.15rem] border border-white/80 bg-white/85 px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 truncate text-[11px] font-bold text-slate-500">{label}</p>
      </div>
    </Link>
  );
}

function formatLiveStatus(lastUpdated) {
  if (!lastUpdated) return "Waiting for data";

  const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
  if (Number.isNaN(date.getTime())) return "Live";

  return `Updated ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function LiveStatusBadge({ loading, lastUpdated }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${loading ? "animate-pulse bg-amber-400" : "bg-emerald-500"}`} />
      {loading ? "Syncing" : formatLiveStatus(lastUpdated)}
    </div>
  );
}

function Hero({ familyName, tasksToday, mealsToday, calendarEventsToday, openLists, loading, lastUpdated }) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.07)]">
      <div className="kinely-family-gradient p-4 md:p-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_0.62fr] xl:items-center">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Home dashboard
              </div>
              <LiveStatusBadge loading={loading} lastUpdated={lastUpdated} />
            </div>

            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {getGreeting()}, {familyName} ✨
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Let’s keep today calm, clear, and organized.
            </p>

            <p className="mt-1 max-w-2xl text-xs font-bold leading-5 text-slate-500">
              Today’s meals, tasks, events, and shared lists — all in one beautiful family view.
            </p>

            <div className="mt-3 grid max-w-3xl gap-2 sm:grid-cols-4">
              <MiniPulse icon={CheckSquare} value={tasksToday.length} label="Tasks today" tone="blue" to="/tasks" />
              <MiniPulse icon={UtensilsCrossed} value={mealsToday.length} label="Meals today" tone="amber" to="/meals" />
              <MiniPulse icon={CalendarDays} value={calendarEventsToday.length} label="Events today" tone="violet" to="/calendar" />
              <MiniPulse icon={ShoppingCart} value={openLists.length} label="Open lists" tone="emerald" to="/lists" />
            </div>
          </div>

          <TimeWeatherPanel
            tasksToday={tasksToday}
            mealsToday={mealsToday}
            calendarEventsToday={calendarEventsToday}
          />
        </div>
      </div>
    </section>
  );
}

function AttentionCard({ icon: Icon, title, text, tone, to }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-[1.15rem] border border-white/80 bg-white/85 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-950">{title}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{text}</p>
      </div>
    </Link>
  );
}

function NeedsAttention({ tasksToday, overdueTasks, mealsToday, calendarEventsToday, openLists }) {
  const items = [];

  if (overdueTasks.length) {
    items.push({
      icon: AlertCircle,
      title: `${overdueTasks.length} overdue`,
      text: "Tasks need attention",
      tone: "rose",
      to: "/tasks",
    });
  }

  if (tasksToday.length) {
    items.push({
      icon: CheckSquare,
      title: `${tasksToday.length} task${tasksToday.length === 1 ? "" : "s"} today`,
      text: "Assignments for today",
      tone: "blue",
      to: "/tasks",
    });
  }

  if (!mealsToday.length) {
    items.push({
      icon: UtensilsCrossed,
      title: "No meals yet",
      text: "Plan today’s meals",
      tone: "amber",
      to: "/meals",
    });
  }

  if (calendarEventsToday.length) {
    items.push({
      icon: CalendarDays,
      title: `${calendarEventsToday.length} event${calendarEventsToday.length === 1 ? "" : "s"} today`,
      text: "Calendar has activity",
      tone: "violet",
      to: "/calendar",
    });
  }

  if (openLists.length) {
    items.push({
      icon: ShoppingCart,
      title: `${openLists.length} open list${openLists.length === 1 ? "" : "s"}`,
      text: "Household lists active",
      tone: "emerald",
      to: "/lists",
    });
  }

  if (!items.length) {
    items.push({
      icon: Sparkles,
      title: "All calm",
      text: "Nothing urgent right now",
      tone: "emerald",
      to: "/calendar",
    });
  }

  return (
    <Card className="rounded-[1.25rem] border-white/80 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Needs attention" title="Today’s status" />
      <div className="mt-2.5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 4).map((item) => <AttentionCard key={item.title} {...item} />)}
      </div>
    </Card>
  );
}

function ModuleCard({ icon: Icon, title, text, metric, tone, to }) {
  return (
    <Link to={to} className="group rounded-[1.25rem] border border-white/80 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:text-blue-500" />
      </div>
      <p className="mt-2 text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 min-h-[28px] text-[11px] font-semibold leading-5 text-slate-500">{text}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{metric}</p>
    </Link>
  );
}

function ModulesGrid({ tasksToday, mealsToday, calendarEventsToday, openLists }) {
  const cards = [
    {
      icon: CalendarDays,
      title: "Calendar",
      text: "Today’s events and shared plans",
      metric: calendarEventsToday.length ? `${calendarEventsToday.length} today` : "Today",
      tone: "blue",
      to: "/calendar",
    },
    {
      icon: CheckSquare,
      title: "Tasks",
      text: "Only tasks due today",
      metric: tasksToday.length,
      tone: "blue",
      to: "/tasks",
    },
    {
      icon: UtensilsCrossed,
      title: "Meals",
      text: "Meals planned for today",
      metric: mealsToday.length,
      tone: "amber",
      to: "/meals",
    },
    {
      icon: ShoppingCart,
      title: "Lists",
      text: "Open family lists",
      metric: openLists.length,
      tone: "emerald",
      to: "/lists",
    },
  ];

  return (
    <section>
      <SectionHeader kicker="Modules" title="Shared space" />
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <ModuleCard key={card.title} {...card} />)}
      </div>
    </section>
  );
}

function CustodyTodayCard({ custodyToday = [] }) {
  if (!custodyToday.length) return null;

  return (
    <Card className="rounded-[1.25rem] border-white/80 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Custody today" title="Parenting schedule" action="Open" to="/custody" />
      <div className="mt-2.5 grid gap-2 md:grid-cols-2">
        {custodyToday.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            to="/custody"
            className="flex items-center gap-3 rounded-[1.05rem] border border-rose-100 bg-rose-50/45 px-3 py-2.5 transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-md"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600">
              <Heart className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">{item.childLabel}</p>
              <p className="truncate text-xs font-semibold text-rose-700">{item.statusLabel}</p>
              <p className="truncate text-[11px] font-bold text-slate-400">
                {item.groupName}
                {item.notes ? ` - ${item.notes}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function FamilyMembersToday({ people, tasksToday, calendarEventsToday, mealsToday }) {
  const visiblePeople = people.filter((person) => shouldShowMemberOnHome(person));

  if (!visiblePeople.length) return null;

  return (
    <Card className="rounded-[1.25rem] border-white/80 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Family members" title="Today by person" action="Manage" to="/profile" />
      <div className="mt-2.5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {visiblePeople.slice(0, 8).map((person, index) => {
          const name = personName(person) || `Member ${index + 1}`;
          const colorClasses = getPersonColorClasses(person, index);
          const personTasks = tasksToday.filter((task) => recordBelongsToPerson(task, person, people, { type: "assignment" }));
          const personEvents = calendarEventsToday.filter((event) => recordBelongsToPerson(event, person, people, { type: "event" }));
          const personMeals = mealsToday.filter((meal) => recordBelongsToPerson(meal, person, people, { type: "assignment" }));
          const total = personTasks.length + personEvents.length + personMeals.length;

          return (
            <Link
              key={person.id || person.uid || person.email || `${name}-${index}`}
              to="/profile"
              className={`flex items-center gap-3 rounded-[1.05rem] border bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:shadow-md ${colorClasses.border}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] text-sm font-black shadow-sm ${colorClasses.bgStrong} ${colorClasses.textStrong}`}>
                {getInitials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">{name}</p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {total
                    ? `${personTasks.length} tasks · ${personEvents.length} events`
                    : "Nothing assigned today"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function TaskPreviewCard({ tasksToday, people }) {
  const visibleTasks = tasksToday.slice(0, 5);

  return (
    <Card className="rounded-[1.25rem] border-white/80 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Today’s tasks" title={tasksToday.length ? `${tasksToday.length} due today` : "All clear"} action="View all" to="/tasks" />
      <div className="mt-3 max-h-[265px] space-y-2 overflow-y-auto pr-1">
        {visibleTasks.length ? (
          visibleTasks.map((task, index) => {
            const assignedPerson = resolveAssignedPersonFromRecord(task, people);
            const personClasses = assignedPerson ? getPersonColorClasses(assignedPerson, index) : null;

            return (
              <Link
                key={task.id || `${getItemTitle(task)}-${index}`}
                to="/tasks"
                className={`flex items-center gap-3 rounded-[1.05rem] border bg-white/80 px-3 py-2 transition hover:bg-white ${
                  personClasses ? personClasses.border : "border-slate-200 hover:border-blue-100"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                  personClasses
                    ? `${personClasses.bg} ${personClasses.textStrong} ${personClasses.border}`
                    : getToneClasses("blue")
                }`}>
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{getItemTitle(task, "Family task")}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {assignedPerson ? personName(assignedPerson) : task.assignedTo || task.owner || "Today"} · Due {formatShortDate(getItemDate(task))}
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <CompactItem icon={CheckSquare} title="No tasks due today" text="The family task board looks calm." tone="emerald" />
        )}
      </div>
    </Card>
  );
}

function CompactItem({ icon: Icon, title, text, tone = "blue", to }) {
  const content = (
    <div className="flex items-center gap-3 rounded-[1.05rem] border border-slate-200 bg-white/80 px-3 py-2 transition hover:border-blue-100 hover:bg-white">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
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

function MealsTodayCard({ mealsToday }) {
  const visibleMeals = mealsToday.slice(0, 5);

  return (
    <Card className="rounded-[1.25rem] border-white/80 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Meals" title="Today’s meals" action="Plan meals" to="/meals" />
      <div className="mt-3 max-h-[265px] space-y-2 overflow-y-auto pr-1">
        {visibleMeals.length ? (
          visibleMeals.map((meal, index) => {
            const tone = getMealTone(meal);
            const type = meal.meal_type || meal.mealType || "Meal";

            return (
              <CompactItem
                key={meal.id || `${getItemTitle(meal)}-${index}`}
                icon={UtensilsCrossed}
                title={getItemTitle(meal, "Meal")}
                text={`${type} · Today`}
                tone={tone}
                to="/meals"
              />
            );
          })
        ) : (
          <CompactItem icon={UtensilsCrossed} title="No meals planned" text="Add meals for today." tone="amber" to="/meals" />
        )}
      </div>
    </Card>
  );
}

function NextSevenDaysCard({ calendarEvents, people }) {
  const items = calendarEvents
    .filter((event) => getItemDate(event))
    .sort((a, b) => getItemDate(a).localeCompare(getItemDate(b)))
    .slice(0, 7);

  return (
    <Card className="rounded-[1.25rem] border-white/80 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Next 7 days" title="Calendar" action="View calendar" to="/calendar" />
      <div className="mt-3 max-h-[265px] space-y-2 overflow-y-auto pr-1">
        {items.length ? (
          items.map((event, index) => {
            const assignedPerson = resolveEventPersonFromRecord(event, people);
            const eventClasses = getEventColorClasses(event, assignedPerson, index);

            return (
              <Link
                key={event.id || `${getItemTitle(event)}-${index}`}
                to="/calendar"
                className={`flex items-center gap-3 rounded-[1.05rem] border bg-white/80 px-3 py-2 transition hover:bg-white ${eventClasses.border}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${eventClasses.bg} ${eventClasses.textStrong} ${eventClasses.border}`}>
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{getItemTitle(event, "Family event")}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {formatShortDate(getItemDate(event))}
                    {getItemTime(event) ? ` · ${getItemTime(event)}` : ""}
                    {assignedPerson ? ` · ${personName(assignedPerson)}` : ""}
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <CompactItem icon={CalendarDays} title="No events coming up" text="The next week looks calm." tone="blue" to="/calendar" />
        )}
      </div>
    </Card>
  );
}

function OpenListsCard({ openLists }) {
  return (
    <Card className="rounded-[1.25rem] border-white/80 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Lists" title="Open lists" action="Open" to="/lists" />
      <div className="mt-4 max-h-[265px] space-y-2.5 overflow-y-auto pr-1">
        {openLists.length ? (
          openLists.slice(0, 12).map((list, index) => (
            <CompactItem
              key={list.id || `${getItemTitle(list)}-${index}`}
              icon={ListChecks}
              title={getItemTitle(list, "Family list")}
              text={`${list.pendingCount ?? list.itemsCount ?? list.count ?? "Open"} item${Number(list.pendingCount ?? list.itemsCount ?? list.count) === 1 ? "" : "s"}`}
              tone="emerald"
              to="/lists"
            />
          ))
        ) : (
          <CompactItem icon={ShoppingCart} title="No open lists" text="Shared lists are clear." tone="emerald" />
        )}
      </div>
    </Card>
  );
}

function ActivityItem({ item }) {
  const type = item.type || item.category || "";
  const Icon = getActivityIcon(type);
  const tone = getActivityTone(type);
  const actor = item.actorName || item.actor_name || item.actorEmail || "Family";

  return (
    <div className="flex items-start gap-3 rounded-[1.05rem] border border-slate-200 bg-white/80 px-3 py-2">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${getToneClasses(tone)}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-black text-slate-950">{item.title || "Family update"}</p>
          <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatActivityTime(item)}</span>
        </div>
        <p className="truncate text-xs font-semibold text-slate-500">{item.description || "Family activity updated"}</p>
        <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">by {actor}</p>
      </div>
    </div>
  );
}

function FamilyActivityCard({ activity = [] }) {
  return (
    <Card className="rounded-[1.25rem] border-white/80 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <SectionHeader kicker="Activity" title="Family updates" />
      <div className="mt-2.5 space-y-2">
        {activity.length ? (
          activity.slice(0, 5).map((item, index) => (
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
  people = [],
  tasksToday = [],
  overdueTasks = [],
  mealsToday = [],
  openLists = [],
  activity = [],
  calendarEvents = [],
  custodyToday = [],
  loading = false,
  lastUpdated = null,
}) {
  const today = getTodayKey();
  const calendarEventsToday = calendarEvents.filter((event) => getItemDate(event) === today);

  return (
    <div className="kinely-gradient-bg min-h-full px-3 pb-24 pt-2 md:px-5 md:pb-10 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-2.5">
        <Hero
          familyName={familyName}
          tasksToday={tasksToday}
          mealsToday={mealsToday}
          calendarEventsToday={calendarEventsToday}
          openLists={openLists}
          loading={loading}
          lastUpdated={lastUpdated}
        />

        <NeedsAttention
          tasksToday={tasksToday}
          overdueTasks={overdueTasks}
          mealsToday={mealsToday}
          calendarEventsToday={calendarEventsToday}
          openLists={openLists}
        />

        <ModulesGrid
          tasksToday={tasksToday}
          mealsToday={mealsToday}
          calendarEventsToday={calendarEventsToday}
          openLists={openLists}
        />

        <CustodyTodayCard custodyToday={custodyToday} />

        <FamilyMembersToday
          people={people}
          tasksToday={tasksToday}
          calendarEventsToday={calendarEventsToday}
          mealsToday={mealsToday}
        />

        <div className="grid gap-4 xl:grid-cols-3">
          <TaskPreviewCard tasksToday={tasksToday} people={people} />
          <MealsTodayCard mealsToday={mealsToday} />
          <NextSevenDaysCard calendarEvents={calendarEvents} people={people} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <OpenListsCard openLists={openLists} />
          <FamilyActivityCard activity={activity} />
        </div>
      </div>
    </div>
  );
}
