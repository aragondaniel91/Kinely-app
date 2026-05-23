import React from "react";
import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { getTaskIcon, isDone } from "@/features/tasks/utils/taskHelpers";

function getPersonColorClasses(person = {}) {
  return person.colorClasses || {};
}

function ProgressRing({ completed, total, person }) {
  const colorClasses = getPersonColorClasses(person);
  const safeTotal = Math.max(total, 1);
  const percent = Math.round((completed / safeTotal) * 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-white/75"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={colorClasses.text || person.ring || "text-primary"}
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-xl font-black leading-none text-slate-900">
          {completed}/{total}
        </p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
          tasks
        </p>
      </div>
    </div>
  );
}

function PersonAvatar({ person }) {
  const Icon = person.icon;
  const colorClasses = getPersonColorClasses(person);
  const avatarUrl = person.avatarUrl || person.avatar_url || person.photoURL || person.photoUrl || "";

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-2xl shadow-inner">
      <div
        className={cn(
          "absolute inset-1 rounded-full opacity-25",
          colorClasses.stripe || person.accent || "bg-primary"
        )}
      />

      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={person.name}
          className="relative h-full w-full rounded-full object-cover p-1"
        />
      ) : (
        <Icon
          className={cn(
            "relative h-8 w-8",
            colorClasses.text || person.ring || "text-primary"
          )}
        />
      )}

      <span className="sr-only">{person.name}</span>
    </div>
  );
}

export default function PersonCard({ person, tasks, selected, onSelect }) {
  const colorClasses = getPersonColorClasses(person);
  const completed = tasks.filter(isDone).length;
  const total = tasks.length;
  const quickTasks = tasks.slice(0, 3);

  return (
    <button
      type="button"
      onClick={() => onSelect(person.id)}
      className={cn(
        "group relative min-h-[250px] overflow-hidden rounded-[2rem] border p-4 text-left shadow-[0_18px_45px_rgba(38,50,56,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(38,50,56,0.12)]",
        colorClasses.bg || person.bg || "bg-white",
        selected
          ? cn(
              colorClasses.borderStrong || colorClasses.border || person.border || "border-primary/30",
              "ring-4 ring-white/80"
            )
          : "border-white/80"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-2",
          colorClasses.stripe || person.accent || "bg-primary"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl",
          colorClasses.bgStrong || colorClasses.stripe || "bg-primary"
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <PersonAvatar person={person} />
          <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            {person.name}
          </h3>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {person.role}
          </p>
        </div>

        <ProgressRing completed={completed} total={total || 0} person={person} />
      </div>

      <div className="relative mt-4 space-y-2">
        {quickTasks.length > 0 ? (
          quickTasks.map((task) => {
            const TaskIcon = getTaskIcon(task);

            return (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-2xl border border-white/75 bg-white/70 px-3 py-2"
              >
                <TaskIcon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    colorClasses.text || person.ring || "text-primary"
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-700">
                  {task.title}
                </span>
                {isDone(task) ? (
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/75 bg-white/70 px-3 py-4 text-center">
            <p className="text-sm font-extrabold text-slate-500">No tasks today</p>
          </div>
        )}
      </div>
    </button>
  );
}
