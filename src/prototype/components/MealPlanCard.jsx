import React from "react";
import { ChefHat, Clock } from "lucide-react";

import { cardSurface, kicker } from "@/prototype/tones";

export default function MealPlanCard({ meals }) {
  const { dinner, others } = meals;

  return (
    <section className={cardSurface + " p-4"}>
      <div className="mb-3">
        <p className={kicker}>Tonight</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          What&apos;s for dinner
        </h2>
      </div>

      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.07] p-3.5 dark:border-amber-400/15 dark:bg-amber-400/[0.06]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <ChefHat className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-extrabold text-slate-900 dark:text-slate-50">{dinner.title}</p>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{dinner.note}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">
            <Clock className="h-3.5 w-3.5" /> {dinner.time}
          </span>
          {dinner.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {others.map((meal) => (
          <div
            key={meal.label}
            className="rounded-xl border border-black/5 bg-white/70 px-2.5 py-2 dark:border-white/5 dark:bg-white/[0.03]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
              {meal.label}
            </p>
            <p className="mt-0.5 text-xs font-bold leading-snug text-slate-700 dark:text-slate-200">{meal.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
