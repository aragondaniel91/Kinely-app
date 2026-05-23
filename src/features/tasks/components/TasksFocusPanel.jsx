import React from "react";
import {
  Clock,
  MoreHorizontal,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TaskTile from "@/features/tasks/components/TaskTile";
import { isDone } from "@/features/tasks/utils/taskHelpers";

const priorityRank = {
  high: 0,
  medium: 1,
  low: 2,
};

function getTopPriorityTasks(tasks = []) {
  return [...tasks]
    .filter((task) => !isDone(task))
    .sort((a, b) => {
      const aRank = priorityRank[a.priority || "medium"] ?? 1;
      const bRank = priorityRank[b.priority || "medium"] ?? 1;
      return aRank - bRank;
    })
    .slice(0, 3);
}

export default function TasksFocusPanel({
  selectedPerson,
  selectedTasks,
  loading,
  canWrite,
  pendingCount,
  completedCount,
  onAddTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}) {
  const topPriorityTasks = getTopPriorityTasks(selectedTasks);

  return (
    <Card className="rounded-[2.25rem] border-border bg-white/86 p-5 shadow-[0_24px_70px_rgba(38,50,56,0.08)] backdrop-blur-xl">
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-accent">
            <Star className="h-4 w-4" />
            Today’s Focus
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {selectedPerson?.name || "Family"} tasks
          </h2>

          <p className="mt-1 max-w-2xl text-sm font-extrabold leading-6 text-slate-500">
            A quick view of the most important tasks for the selected person.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <Clock className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-black text-slate-600">
              {pendingCount} pending · {completedCount} done
            </span>
          </div>

          {canWrite && (
            <Button
              type="button"
              onClick={() => onAddTask?.(selectedPerson)}
              className="h-12 rounded-2xl font-black shadow-lg shadow-primary/15"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add task
            </Button>
          )}
        </div>
      </div>

      {topPriorityTasks.length > 0 && (
        <div className="mb-5 rounded-[2rem] border border-accent/15 bg-accent/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
              Top priorities
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {topPriorityTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm"
              >
                <p className="truncate text-sm font-black text-slate-900">
                  {task.title}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {task.priority || "medium"} priority
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selectedTasks.length > 0 ? (
            selectedTasks.map((task) => (
              <TaskTile
                key={task.id}
                task={task}
                canWrite={canWrite}
                onToggle={onToggleTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))
          ) : (
            <div className="col-span-full rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center">
              <MoreHorizontal className="mx-auto h-10 w-10 text-slate-300" />

              <p className="mt-3 text-xl font-black text-slate-900">
                No tasks for {selectedPerson?.name || "this person"}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                Add a task to show it on this board.
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
      )}
    </Card>
  );
}
