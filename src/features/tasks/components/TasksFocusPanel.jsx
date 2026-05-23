import React from "react";
import {
  Check,
  Circle,
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTaskIcon, isDemoTask, isDone } from "@/features/tasks/utils/taskHelpers";
import {
  TASK_DATE_SCOPES,
  getTaskDateScopeTitle,
  getTaskDueDateKey,
} from "@/features/tasks/utils/taskDateFilters";

const priorityRank = {
  high: 0,
  medium: 1,
  low: 2,
};

const priorityStyles = {
  high: "bg-red-50 text-red-700 border-red-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function getPriorityTasks(tasks = []) {
  return [...tasks]
    .filter((task) => !isDone(task))
    .sort((a, b) => {
      const aRank = priorityRank[a.priority || "medium"] ?? 1;
      const bRank = priorityRank[b.priority || "medium"] ?? 1;
      return aRank - bRank;
    });
}

function FocusTaskRow({ task, canWrite, onToggleTask, onEditTask, onDeleteTask }) {
  const TaskIcon = getTaskIcon(task);
  const done = isDone(task);
  const disabled = !canWrite || isDemoTask(task);
  const priority = task.priority || "medium";
  const category = task.category || "other";
  const dueDate = getTaskDueDateKey(task);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-3xl border px-4 py-3 transition",
        done
          ? "border-accent/15 bg-accent/5"
          : "border-slate-100 bg-white/90 hover:border-slate-200 hover:shadow-sm"
      )}
    >
      <button
        type="button"
        onClick={() => onToggleTask(task)}
        disabled={disabled}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition",
          done
            ? "border-accent bg-accent text-accent-foreground"
            : "border-slate-200 bg-slate-50 text-slate-400 hover:border-accent hover:text-accent",
          disabled && "cursor-not-allowed opacity-60"
        )}
        aria-label="Toggle task"
      >
        {done ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-slate-700">
        <TaskIcon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-base font-black", done ? "text-slate-400 line-through" : "text-slate-900")}>
          {task.title}
        </p>

        <div className="mt-1 flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
              priorityStyles[priority] || priorityStyles.medium
            )}
          >
            {priority}
          </span>

          <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
            {category}
          </span>

          {dueDate && (
            <span className="rounded-full border border-slate-100 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
              {dueDate}
            </span>
          )}
        </div>
      </div>

      {canWrite && !isDemoTask(task) && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEditTask(task)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
            aria-label="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteTask(task)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-white hover:text-red-700 hover:shadow-sm"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function TasksFocusPanel({
  selectedPerson,
  selectedTasks,
  loading,
  canWrite,
  pendingCount,
  completedCount,
  activeTaskScope,
  onTaskScopeChange,
  onAddTask,
  onApplyTemplate,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}) {
  const priorityTasks = getPriorityTasks(selectedTasks);
  const visibleTasks = priorityTasks.slice(0, 6);
  const completedTasks = selectedTasks.filter(isDone).slice(0, 3);
  const scopeTitle = getTaskDateScopeTitle(activeTaskScope);

  return (
    <Card className="overflow-hidden rounded-[2.25rem] border-border bg-white/88 shadow-[0_24px_70px_rgba(38,50,56,0.08)] backdrop-blur-xl">
      <div className="border-b border-slate-100 bg-gradient-to-br from-white via-secondary/35 to-accent/5 p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-accent">
              <Sparkles className="h-4 w-4" />
              Task Focus
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {selectedPerson?.name || "Family"} · {scopeTitle}
            </h2>

            <p className="mt-1 max-w-2xl text-sm font-extrabold leading-6 text-slate-500">
              Select a person, then switch between today, upcoming, or all tasks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-white/85 px-4 py-3 shadow-sm ring-1 ring-white">
              <Clock className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-black text-slate-600">
                {pendingCount} pending · {completedCount} done
              </span>
            </div>

            {canWrite && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onApplyTemplate?.(selectedPerson)}
                  className="h-12 rounded-2xl bg-white/90 font-black"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Apply routine
                </Button>

                <Button
                  type="button"
                  onClick={() => onAddTask?.(selectedPerson)}
                  className="h-12 rounded-2xl font-black shadow-lg shadow-primary/15"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add task
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TASK_DATE_SCOPES.map((scope) => {
            const active = activeTaskScope === scope.value;

            return (
              <button
                key={scope.value}
                type="button"
                onClick={() => onTaskScopeChange?.(scope.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-black transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                    : "bg-white/80 text-slate-500 ring-1 ring-white hover:bg-white hover:text-slate-900"
                )}
              >
                {scope.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
          </div>
        ) : visibleTasks.length > 0 ? (
          <div className="space-y-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Up next
              </p>
            </div>

            {visibleTasks.map((task) => (
              <FocusTaskRow
                key={task.id}
                task={task}
                canWrite={canWrite}
                onToggleTask={onToggleTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            ))}

            {completedTasks.length > 0 && (
              <div className="pt-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Completed
                </p>

                <div className="grid gap-2 md:grid-cols-3">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="truncate rounded-2xl border border-accent/10 bg-accent/5 px-3 py-2 text-sm font-black text-accent"
                    >
                      ✓ {task.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center">
            <MoreHorizontal className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-3 text-xl font-black text-slate-900">
              No {scopeTitle.toLowerCase()} for {selectedPerson?.name || "this person"}
            </p>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Add a task or switch the filter to see more tasks.
            </p>

            {canWrite && (
              <Button
                type="button"
                onClick={() => onAddTask?.(selectedPerson)}
                className="mt-5 rounded-2xl font-black"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
