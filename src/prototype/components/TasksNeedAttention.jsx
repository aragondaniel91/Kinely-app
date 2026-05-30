import React, { useState } from "react";
import { ChevronRight } from "lucide-react";

import { tone, cardSurface, kicker } from "@/prototype/tones";

function TaskRow({ task }) {
  const t = tone(task.tone);
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setDone((value) => !value)}
      className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white/75 px-3 py-3 text-left transition hover:bg-white dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
    >
      <span
        className={
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition " +
          (done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 dark:border-slate-600")
        }
      >
        {done ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={
            "truncate text-sm font-bold " +
            (done
              ? "text-slate-400 line-through dark:text-slate-500"
              : "text-slate-900 dark:text-slate-50")
          }
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 " + t.chip}>
            {task.who}
          </span>
          <span
            className={
              "text-[11px] font-bold " +
              (task.overdue ? "text-rose-500" : "text-slate-400 dark:text-slate-500")
            }
          >
            {task.due}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function TasksNeedAttention({ tasks }) {
  return (
    <section className={cardSurface + " p-4"}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className={kicker}>Needs Attention</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Tasks today
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:bg-white/5 dark:text-blue-300">
          All tasks <ChevronRight className="h-4 w-4" />
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}
