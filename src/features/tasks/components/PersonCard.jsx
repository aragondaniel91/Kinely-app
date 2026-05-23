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
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/75 text-2xl shadow-inner ring-1 ring-white/60">
      <div
        className={cn(
          "absolute inset-1 rounded-2xl opacity-15",
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
            "relative h-6 w-6 opacity-80",
            colorClasses.text || person.ring || "text-primary"
          )}
        />
      )}
    </div>
  );
}

export default function PersonCard({
  person,
  tasks = [],
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
        "group relative flex h-[172px] min-w-0 flex-col overflow-hidden rounded-[1.75rem] border p-3.5 text-left shadow-[0_14px_36px_rgba(38,50,56,0.055)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(38,50,56,0.08)]",
        selected
          ? "border-primary/12 bg-white/88 ring-4 ring-primary/5"
          : "border-white/70 bg-white/62"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 top-0 h-1.5 rounded-b-full opacity-35",
          colorClasses.stripe || person.accent || "bg-primary"
        )}
      />

      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full opacity-12 blur-2xl",
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
            "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-slate-600 shadow-sm ring-1 ring-white transition hover:scale-105 hover:bg-white",
            colorClasses.text || person.ring || "text-primary"
          )}
          aria-label={`Add task for ${person.name}`}
          title={`Add task for ${person.name}`}
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
      )}

      <div className="relative flex items-start gap-2.5 pr-8">
        <PersonAvatar person={person} />

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
            Progress
          </p>

          <p className="text-xs font-black text-slate-600">
            {completed}/{total}
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100/80">
          <div
            className={cn(
              "h-full rounded-full opacity-55 transition-all",
              colorClasses.stripe || person.accent || "bg-primary"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-extrabold text-slate-500">
            {pending} pending
          </span>

          {pending === 0 && total > 0 ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/8 px-2 py-1 text-[10px] font-black text-accent">
              <Check className="h-3 w-3" />
              Clear
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-400">
              View
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
