import React from "react";
import { Check, Circle, Pencil, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getTaskIcon,
  isDemoTask,
  isDone,
} from "@/features/tasks/utils/taskHelpers";

const priorityStyles = {
  high: "bg-red-50 text-red-700 ring-red-100",
  medium: "bg-amber-50 text-amber-700 ring-amber-100",
  low: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

export default function TaskTile({ task, canWrite, onToggle, onEdit, onDelete }) {
  const TaskIcon = getTaskIcon(task);
  const done = isDone(task);
  const disabled = !canWrite || isDemoTask(task);
  const priority = task.priority || "medium";
  const category = task.category || "other";

  return (
    <div
      className={cn(
        "group relative min-h-[190px] rounded-[2rem] border p-4 shadow-sm transition-all",
        done
          ? "border-accent/25 bg-accent/8"
          : "border-border bg-white/85 hover:-translate-y-1 hover:shadow-lg"
      )}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-slate-700">
            <TaskIcon className="h-8 w-8" />
          </div>

          <button
            type="button"
            onClick={() => onToggle(task)}
            disabled={disabled}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all",
              done
                ? "border-accent bg-accent text-accent-foreground"
                : "border-slate-300 bg-white text-slate-300 hover:border-accent hover:text-accent",
              disabled && "cursor-not-allowed opacity-60"
            )}
            aria-label="Complete task"
            title={isDemoTask(task) ? "Demo task" : "Complete task"}
          >
            {done ? <Check className="h-7 w-7" /> : <Circle className="h-7 w-7" />}
          </button>
        </div>

        <div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ring-1",
                priorityStyles[priority] || priorityStyles.medium
              )}
            >
              {priority}
            </span>

            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-100">
              {category}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900">
            {task.title}
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {done ? "Completed" : "Pending"}
          </p>
        </div>

        {canWrite && !isDemoTask(task) && (
          <div className="absolute right-4 top-20 flex gap-1 opacity-100 transition md:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 transition hover:text-slate-900"
              aria-label="Edit task"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(task)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-sm ring-1 ring-slate-100 transition hover:text-red-700"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
