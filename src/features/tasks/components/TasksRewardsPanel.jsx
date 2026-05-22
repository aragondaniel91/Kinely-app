import React from "react";
import { Gift } from "lucide-react";

import { Card } from "@/components/ui/card";
import ChildRewardCard from "@/features/tasks/components/ChildRewardCard";
import FamilyRewardCard from "@/features/tasks/components/FamilyRewardCard";

export default function TasksRewardsPanel({
  childReward,
  childTasks,
  familyReward,
  allTasks,
}) {
  return (
    <div className="space-y-5">
      <ChildRewardCard
        reward={childReward}
        childTasks={childTasks}
      />

      <FamilyRewardCard
        reward={familyReward}
        allTasks={allTasks}
      />

      <Card className="rounded-[2rem] border-white/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(38,50,56,0.07)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <Gift className="h-7 w-7" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Rhythm note
            </p>

            <h3 className="mt-1 text-xl font-black text-slate-950">
              La familia avanza junta.
            </h3>

            <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
              Rewards individuales para cada hijo y una recompensa familiar para crear conexión.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
