import React from "react";
import { Gift } from "lucide-react";

import { Card } from "@/components/ui/card";
import ChildRewardCard from "@/features/tasks/components/ChildRewardCard";
import FamilyRewardCard from "@/features/tasks/components/FamilyRewardCard";

export default function TasksRewardsPanel({
  childReward,
  childTasks,
  childRewardItems = [],
  familyReward,
  allTasks,
}) {
  const items =
    Array.isArray(childRewardItems) && childRewardItems.length
      ? childRewardItems
      : childReward
        ? [{ reward: childReward, tasks: childTasks || [] }]
        : [];

  return (
    <div className="space-y-5">
      {items.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <ChildRewardCard
              key={item.reward?.id || item.reward?.childPersonId || item.reward?.childName}
              reward={item.reward}
              childTasks={item.tasks || []}
            />
          ))}
        </div>
      )}

      <FamilyRewardCard
        reward={familyReward}
        allTasks={allTasks}
      />

      <Card className="rounded-[2rem] border-white/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(38,50,56,0.07)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Gift className="h-7 w-7" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Rhythm note
            </p>

            <h3 className="mt-1 text-xl font-black text-slate-950">
              The family moves together.
            </h3>

            <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
              Individual rewards motivate each child, while family rewards create shared momentum.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
