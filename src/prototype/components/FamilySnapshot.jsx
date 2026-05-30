import React from "react";
import {
  CalendarDays,
  CheckSquare,
  CloudSun,
  HeartHandshake,
  History,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";

import { tone, cardSurface, kicker } from "@/prototype/tones";

function SnapshotCard({ icon: Icon, toneKey, label, value, hint }) {
  const t = tone(toneKey);
  return (
    <div className="flex flex-col rounded-2xl border border-black/5 bg-white/75 p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <span className={"flex h-8 w-8 items-center justify-center rounded-xl " + t.avatar}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-extrabold leading-snug text-slate-900 dark:text-slate-50">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default function FamilySnapshot({
  tasks,
  overdueCount,
  nextEvent,
  dinner,
  groceries,
  weather,
  recentUpdate,
  custodyEnabled,
  custodyToday,
}) {
  return (
    <section className={cardSurface + " p-4"}>
      <div className="mb-3">
        <p className={kicker}>Family Snapshot</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Today at Home
        </h2>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        <SnapshotCard
          icon={CheckSquare}
          toneKey="blue"
          label="Tasks"
          value={`${tasks} need attention`}
          hint={overdueCount ? `${overdueCount} overdue` : "On track"}
        />
        <SnapshotCard
          icon={CalendarDays}
          toneKey="violet"
          label="Next Event"
          value={nextEvent.title}
          hint={`${nextEvent.day} · ${nextEvent.time}`}
        />
        <SnapshotCard
          icon={UtensilsCrossed}
          toneKey="amber"
          label="Dinner"
          value={dinner.title}
          hint={`${dinner.time} · ${dinner.cook} cooking`}
        />
        <SnapshotCard
          icon={ShoppingCart}
          toneKey="green"
          label="Lists"
          value={`${groceries.openItems} items open`}
          hint={groceries.primaryList}
        />
        <SnapshotCard
          icon={CloudSun}
          toneKey="amber"
          label="Weather"
          value={`${weather.temp}°F · ${weather.condition}`}
          hint={`H ${weather.high}° · L ${weather.low}°`}
        />
        {custodyEnabled && custodyToday ? (
          <SnapshotCard
            icon={HeartHandshake}
            toneKey="green"
            label="Custody Today"
            value={custodyToday.summary}
            hint={custodyToday.exchange}
          />
        ) : (
          <SnapshotCard
            icon={History}
            toneKey="rose"
            label="Recent Update"
            value={recentUpdate.text}
            hint={recentUpdate.time}
          />
        )}
      </div>
    </section>
  );
}
