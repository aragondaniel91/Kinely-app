import React from "react";
import { Check, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { isArchivedTask, isDone } from "@/features/tasks/utils/taskHelpers";

function getPersonColorClasses(person = {}) {
  return person.colorClasses || {};
}

function PersonAvatar({ person, selected = false }) {
  const Icon = person.icon;
  const colorClasses = getPersonColorClasses(person);
  const avatarUrl =
    person.avatarUrl || person.avatar_url || person.photoURL || person.photoUrl || "";

  return (
    <div
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-2xl shadow-sm ring-1 transition",
        selected ? "ring-slate-200" : "ring-white/80"
      )}
    >
      <div
        className={cn(
          "absolute inset-1 rounded-[1.05rem] opacity-10",
          colorClasses.stripe || person.accent || "bg-primary"
        )}
      />

      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={person.name}
          className="relative h-full w-full rounded-2xl object-cover p-1"
        />
      ) : (
        <Icon
          className={cn(
            "relative h-5.5 w-5.5 opacity-85",
            colorClasses.text || person.ring || "text-primary"
          )}
        />
      )}
    </div>
  );
}

function getScopeLabel(scope = "today") {
  if (scope === "today") return "Today";
  if (scope === "week") return "This week";
  if (scope === "month") return "This month";
  if (scope === "upcoming") return "Upcoming";
  return "All";
}

function getStatusCopy({ pending, total }) {
  if (total === 0) return "No tasks";
  if (pending === 0) return "All clear";
  if (pending === 1) return "1 pending";
  return `${pending} pending`;
}

export default function PersonCard({
  person,
  tasks = [],
  selected,
  canWrite,
  activeTaskScope = "today",
  onSelect,
  onQuickAdd,
}) {
  const colorClasses = getPersonColorClasses(person);
  const activeTasks = tasks.filter((task) => !isArchivedTask(task));
  const completed = activeTasks.filter(isDone).length;
  const total = activeTasks.length;
  const pending = Math.max(total - completed, 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const statusCopy = getStatusCopy({ pending, total });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(person.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(person.id);
      }}
      className={cn(
        "group relative flex h-[158px] min-w-0 flex-col overflow-hidden rounded-[1.6rem] border p-3.5 text-left transition-all",
        "shadow-[0_10px_26px_rgba(38,50,56,0.045)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(38,50,56,0.06)]",
        selected
          ? `${colorClasses.borderStrong || colorClasses.border || "border-slate-200"} ${colorClasses.bg || "bg-white"} ring-4 ${colorClasses.ring || "ring-slate-100/80"}`
          : `${colorClasses.border || "border-white/80"} ${colorClasses.bg || "bg-white/72"} hover:bg-white/92`
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 top-0 h-1 rounded-b-full opacity-45",
          colorClasses.stripe || person.accent || "bg-primary"
        )}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-[0.16]",
          colorClasses.bgStrong || colorClasses.stripe || person.accent || "bg-primary"
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
            "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 transition hover:scale-105 hover:text-slate-900",
            colorClasses.text || person.ring || "text-primary"
          )}
          aria-label={`Add task for ${person.name}`}
          title={`Add task for ${person.name}`}
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
      )}

      <div className="relative flex items-start gap-2.5 pr-8">
        <PersonAvatar person={person} selected={selected} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black tracking-tight text-slate-900">
            {person.name}
          </h3>

          <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {person.role}
          </p>
        </div>
      </div>

      <div className="relative mt-auto">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {getScopeLabel(activeTaskScope)} progress
          </p>

          <p className={cn("text-xs font-black", colorClasses.textStrong || "text-slate-600")}>
            {completed}/{total}
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100/80">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              total === 0
                ? "bg-slate-200"
                : colorClasses.stripe || person.accent || "bg-primary"
            )}
            style={{ width: `${percent}%`, opacity: total === 0 ? 0.45 : 0.9 }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-xs font-extrabold",
              pending === 0 && total > 0 ? "text-accent" : "text-slate-500"
            )}
          >
            {statusCopy}
          </span>

          {pending === 0 && total > 0 ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600 ring-1 ring-emerald-100">
              <Check className="h-3 w-3" />
              Clear
            </span>
          ) : total === 0 ? (
            <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-400 ring-1 ring-slate-100">
              Quiet
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-400 ring-1 ring-slate-100">
              View
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
