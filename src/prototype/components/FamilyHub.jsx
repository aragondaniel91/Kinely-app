import React from "react";
import {
  CalendarDays,
  CheckSquare,
  HeartHandshake,
  ListChecks,
  StickyNote,
  User,
  UtensilsCrossed,
} from "lucide-react";

import { tone, cardSurface, kicker } from "@/prototype/tones";

function HubLink({ icon: Icon, label, toneKey }) {
  const t = tone(toneKey);
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white/75 px-2 py-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:bg-white/[0.03]"
    >
      <span className={"flex h-10 w-10 items-center justify-center rounded-2xl " + t.avatar}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}

export default function FamilyHub({ custodyEnabled, familyNote }) {
  return (
    <section className={cardSurface + " p-4"}>
      <div className="mb-3">
        <p className={kicker}>Family Hub</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Quick access
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <HubLink icon={CalendarDays} label="Calendar" toneKey="violet" />
        <HubLink icon={CheckSquare} label="Tasks" toneKey="blue" />
        <HubLink icon={UtensilsCrossed} label="Meals" toneKey="amber" />
        <HubLink icon={ListChecks} label="Lists" toneKey="green" />
        {custodyEnabled ? (
          <HubLink icon={HeartHandshake} label="Custody" toneKey="green" />
        ) : (
          <HubLink icon={StickyNote} label="Notes" toneKey="rose" />
        )}
        <HubLink icon={User} label="Profile" toneKey="teal" />
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-black/5 bg-amber-500/[0.06] px-3 py-2.5 dark:border-white/5 dark:bg-amber-400/[0.05]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <StickyNote className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            Family note · {familyNote.author}
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-700 dark:text-slate-200">
            {familyNote.text}
          </p>
        </div>
      </div>
    </section>
  );
}
