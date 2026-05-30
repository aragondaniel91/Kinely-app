import React from "react";
import { CalendarDays, ChevronRight, HeartHandshake, MapPin } from "lucide-react";

import { tone, cardSurface, kicker } from "@/prototype/tones";

function EventRow({ event }) {
  const t = tone(event.tone);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/75 px-3 py-2.5 dark:border-white/5 dark:bg-white/[0.03]">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-white/70 py-1 text-center dark:bg-white/10">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {event.day}
        </span>
        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-50">{event.time}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50">{event.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className={"h-2 w-2 shrink-0 rounded-full " + t.dot} />
          <span className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {event.person} · {event.location}
          </span>
        </div>
      </div>
      <span className={"shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ring-1 " + t.chip}>
        {event.category}
      </span>
    </div>
  );
}

export default function UpcomingEvents({ events, custodyEnabled, custodyToday }) {
  return (
    <section className={cardSurface + " p-4"}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className={kicker}>Coming Up</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Family Calendar
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:bg-white/5 dark:text-blue-300">
          Open <ChevronRight className="h-4 w-4" />
        </span>
      </div>

      <div className="space-y-2">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>

      {custodyEnabled && custodyToday ? (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <HeartHandshake className="h-3.5 w-3.5 text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
              Custody Calendar
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-2.5 dark:border-emerald-400/25 dark:bg-emerald-400/[0.06]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50">
                {custodyToday.summary}
              </p>
              <p className="flex items-center gap-1 truncate text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <MapPin className="h-3 w-3" /> {custodyToday.exchange}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
