import React from "react";
import { Check, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { isDone } from "@/features/tasks/utils/taskHelpers";

function getPersonColorClasses(person = {}) {
  return person.colorClasses || {};
}

function PersonAvatar({ person }) {
  const Icon = person.icon;
  const colorClasses = getPersonColorClasses(person);
  const avatarUrl =
    person.avatarUrl || person.avatar_url || person.photoURL || person.photoUrl || "";

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-2xl shadow-inner">
      <div
        className={cn(
          "absolute inset-1 rounded-2xl opacity-25",
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
            "relative h-7 w-7",
            colorClasses.text || person.ring || "text-primary"
          )}
        />
      )}
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
  const pending = Math.max(total - completed, 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(person.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(person.id);
      }}
      className={cn(
        "group relative flex h-[190px] min-w-0 flex-col overflow-hidden rounded-[2rem] border p-4 text-left shadow-[0_14px_36px_rgba(38,50,56,0.07)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(38,50,56,0.11)]",
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
          "pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-25 blur-2xl",
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
            "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-white transition hover:scale-105 hover:bg-white",
            colorClasses.text || person.ring || "text-primary"
          )}
          aria-label={`Add task for ${person.name}`}
          title={`Add task for ${person.name}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      <div className="relative flex items-start gap-3 pr-8">
        <PersonAvatar person={person} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-black tracking-tight text-slate-900">
            {person.name}
          </h3>

          <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {person.role}
          </p>
        </div>
      </div>

      <div className="relative mt-auto">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Progress
          </p>

          <p className="text-sm font-black text-slate-700">
            {completed}/{total}
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/70">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              colorClasses.stripe || person.accent || "bg-primary"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-slate-500">
            {pending} pending
          </span>

          {pending === 0 && total > 0 ? (
            <span className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[11px] font-black text-accent">
              <Check className="h-3.5 w-3.5" />
              Clear
            </span>
          ) : (
            <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black text-slate-500">
              Select to view
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
