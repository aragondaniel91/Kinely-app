import React from "react";

import { cn } from "@/lib/utils";
import { taskPeople } from "@/features/tasks/data/taskPeople";
import {
  getTaskIcon,
  isDone,
} from "@/features/tasks/utils/taskHelpers";

export default function BottomFocusBar({ tasksByPerson }) {
  const nextItems = taskPeople
    .map((person) => {
      const task = (tasksByPerson[person.id] || []).find((item) => !isDone(item));
      return task ? { person, task } : null;
    })
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/80 px-5 py-4 shadow-[0_18px_45px_rgba(38,50,56,0.07)] backdrop-blur-xl">
      <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Up next
          </p>
          <p className="mt-1 text-lg font-black text-slate-900">quick scan</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {nextItems.map(({ person, task }) => {
            const TaskIcon = getTaskIcon(task);

            return (
              <div
                key={`${person.id}-${task.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-secondary/60 px-3 py-2"
              >
                <TaskIcon className={cn("h-6 w-6 shrink-0", person.ring)} />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-400">{person.name}</p>
                  <p className="truncate text-sm font-black text-slate-800">{task.title}</p>
                </div>
              </div>
            );
          })}

          {nextItems.length === 0 && (
            <div className="rounded-2xl border border-accent/10 bg-accent/8 px-4 py-3 text-sm font-black text-accent">
              Everything is clear for now ✨
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
