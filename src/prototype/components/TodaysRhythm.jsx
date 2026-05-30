import React, { useEffect, useState } from "react";
import { CalendarClock, CloudSun, Droplets, HeartHandshake, Sparkles } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function CompactWeather({ weather }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.05]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
          <CloudSun className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50">
            {weather.temp}°F · {weather.condition}
          </p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            H {weather.high}° · L {weather.low}°
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-start gap-2 rounded-xl bg-blue-500/10 px-3 py-2 text-blue-700 dark:text-blue-200">
        <Droplets className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-xs font-semibold leading-snug">{weather.tip}</p>
      </div>
    </div>
  );
}

export default function TodaysRhythm({
  familyName,
  weather,
  summary,
  nextEvent,
  custodyEnabled,
  custodyToday,
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/70 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.08)] dark:border-white/5 dark:bg-white/[0.04] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,209,102,0.22),transparent_36%),linear-gradient(135deg,#ffffff_0%,#eff6ff_50%,#f8f7f4_100%)] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(123,201,161,0.16),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(91,141,239,0.10)_55%,transparent_100%)] md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm dark:bg-white/10 dark:text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Today&apos;s Rhythm
            </div>

            <h1 className="mt-2.5 text-balance text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 md:text-[2.5rem] md:leading-[1.05]">
              {getGreeting()}, {familyName}
            </h1>

            <p className="mt-2 max-w-xl text-pretty text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
              {summary}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-200">
                <CalendarClock className="h-4 w-4" />
                Next: {nextEvent.title} · {nextEvent.time}
              </span>

              {custodyEnabled && custodyToday && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200">
                  <HeartHandshake className="h-4 w-4" />
                  {custodyToday.summary} · {custodyToday.exchange}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-right dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>
            <CompactWeather weather={weather} />
          </div>
        </div>
      </div>
    </section>
  );
}
