import React from "react";
import { Pizza } from "lucide-react";

import { Card } from "@/components/ui/card";
import { isDone } from "@/features/tasks/utils/taskHelpers";

export default function FamilyRewardCard({ reward, allTasks }) {
  if (!reward) return null;

  const completed = allTasks.filter(isDone).length;
  const total = Math.max(reward.requiredTasks || allTasks.length, 1);
  const left = Math.max(total - completed, 0);
  const percent = Math.min(Math.round((completed / total) * 100), 100);

  return (
    <Card className="rounded-[2rem] border-primary/15 bg-gradient-to-br from-blue-50 via-indigo-50 to-white p-5 shadow-[0_18px_45px_rgba(86,60,135,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            Family reward
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {reward.title}
          </h3>
          <p className="mt-1 text-sm font-extrabold text-slate-500">
            {left > 0 ? `${left} tasks to go` : "Family goal reached!"}
          </p>
        </div>

        <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white/80 shadow-inner">
          <Pizza className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div className="mt-6">
        <div className="h-4 overflow-hidden rounded-full bg-white shadow-inner">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-sm font-black text-slate-600">
          <span>
            {completed}/{total} completed
          </span>
          <span>{percent}%</span>
        </div>
      </div>
    </Card>
  );
}
