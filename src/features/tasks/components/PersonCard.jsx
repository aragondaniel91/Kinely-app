import React from "react";
import { Check, Circle, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { getTaskIcon, isDone } from "@/features/tasks/utils/taskHelpers";

function getPersonColorClasses(person = {}) {
  return person.colorClasses || {};
}

function ProgressRing({ completed, total, person }) {
  const colorClasses = getPersonColorClasses(person);
  const safeTotal = Math.max(total, 1);
  const percent = Math.round((completed / safeTotal) * 100);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 72 72">
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
        <p className="text-lg font-black leading-none text-slate-900">
          {completed}/{total}
        </p>
        <p className="mt-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
          tasks
        </p>
      </div>
    </div>
  );
}

function PersonAvatar({ person }) {
  const Icon = person.icon;
  const colorClasses = getPersonColorClasses(person);
  const avatarUrl =
    person.avatarUrl || person.avatar_url || person.photoURL || person.photoUrl || "";

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-2xl shadow-inner">
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
            "relative h-7 w-7",
            colorClasses.text || person.ring || "text-primary"
          )}
        />
      )}

      <span className="sr-only">{person.name}</span>
    </div>
  );
}

export default function PersonCard({
  person,
  tasks,
  selected,
  canWrite,
  onSelect,
  onQuickAdd,
}) {
  const colorClasses = getPersonColorClasses(person);
  const completed = tasks.filter(isDone).length;
  const total = tasks.length;
  const quickTasks = tasks.slice(0, 3);
  const extraTaskCount = Math.max(tasks.length - quickTasks.length, 0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(person.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(person.id);
      }}
      className={cn(
        "group relative flex h-[270px] flex-col overflow-hidden rounded-[2rem] border p-4 text-left shadow-[0_18px_45px_rgba(38,50,56,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(38,50,56,0.12)]",
        colorClasses.bg || person.bg || "bg-white",
        selected
          ? cn(
              colorClasses.borderStrong ||
                colorClasses.border ||
                person.border ||
                "border-primary/30",
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

      {canWrite && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onQuickAdd?.(person);
          }}
          className={cn(
            "absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-white transition hover:scale-105 hover:bg-white",
            colorClasses.text || person.ring || "text-primary"
          )}
          aria-label={`Add task for ${person.name}`}
          title={`Add task for ${person.name}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      <div className="relative flex items-start justify-between gap-3 pr-10">
        <div className="min-w-0">
          <PersonAvatar person={person} />

          <h3 className="mt-3 truncate text-2xl font-black tracking-tight text-slate-900">
            {person.name}
          </h3>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {person.role}
          </p>
        </div>

        <ProgressRing completed={completed} total={total || 0} person={person} />
      </div>

      <div className="relative mt-4 flex-1 space-y-2">
        {quickTasks.length > 0 ? (
<>
            {quickTasks.map((task) => {
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
            })}

            {extraTaskCount > 0 && (
              <div className="rounded-2xl border border-white/75 bg-white/50 px-3 py-2 text-center text-xs font-black text-slate-500">
                +{extraTaskCount} more
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[86px] items-center justify-center rounded-2xl border border-white/75 bg-white/70 px-3 py-4 text-center">
            <p className="text-sm font-extrabold text-slate-500">No tasks today</p>
          </div>
        )}
      </div>
    </div>
  );
}
