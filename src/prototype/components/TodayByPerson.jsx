import React from "react";
import { AlertCircle, CalendarClock, CheckCircle2, Star } from "lucide-react";

import { tone, cardSurface, kicker } from "@/prototype/tones";

function PersonCard({ person }) {
  const t = tone(person.tone);
  const allDone = person.tasksToday > 0 && person.tasksDone >= person.tasksToday;
  const rewardPct = person.rewardGoal
    ? Math.min(100, Math.round((person.rewardValue / person.rewardGoal) * 100))
    : 0;

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-black/5 bg-white/75 p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold " + t.avatar}>
          {person.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50">{person.name}</p>
          <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{person.role}</p>
        </div>
        {person.alert ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
        ) : allDone ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className={"inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ring-1 " + t.chip}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {person.tasksDone}/{person.tasksToday} tasks
        </span>
        {person.kind === "child" && person.rewardGoal ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-200">
            <Star className="h-3.5 w-3.5" />
            {person.rewardValue}
          </span>
        ) : null}
      </div>

      {person.kind === "child" && person.rewardGoal ? (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div className={"h-full rounded-full " + t.bar} style={{ width: rewardPct + "%" }} />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            {person.rewardLabel}: {person.rewardValue}/{person.rewardGoal}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex items-start gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{person.nextEvent}</span>
      </div>
    </div>
  );
}

export default function TodayByPerson({ people }) {
  return (
    <section className={cardSurface + " p-4"}>
      <div className="mb-3">
        <p className={kicker}>Your Family Today</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Who has what going on
        </h2>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </section>
  );
}
