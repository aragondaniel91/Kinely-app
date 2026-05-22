import React from "react";
import {
  Clock,
  MoreHorizontal,
  Star,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import TaskTile from "@/features/tasks/components/TaskTile";

export default function TasksFocusPanel({
  selectedPerson,
  selectedTasks,
  loading,
  canWrite,
  pendingCount,
  completedCount,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}) {
  return (
    <Card className="rounded-[2.25rem] border-emerald-200 bg-white/82 p-5 shadow-[0_24px_70px_rgba(38,50,56,0.08)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            <Star className="h-4 w-4" />
            Focus del día
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Tareas de {selectedPerson?.name || "Familia"}
          </h2>

          <p className="mt-1 text-sm font-extrabold text-slate-500">
            Iconos grandes, checks claros y lectura rápida para wall screen.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
          <Clock className="h-5 w-5 text-slate-400" />
          <span className="text-sm font-black text-slate-600">
            {pendingCount} pending · {completedCount} done
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-800" />
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
                No hay tareas para {selectedPerson?.name || "esta persona"}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                Agrega una tarea nueva para verla en este board.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
