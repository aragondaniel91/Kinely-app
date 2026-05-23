import React from "react";
import { RotateCcw, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRewardProgress } from "@/features/tasks/utils/rewardProgress";

export default function ChildRewardCard({
  reward,
  childTasks,
  canWrite = false,
  onClaimReward,
}) {
  if (!reward) return null;

  const { completed, required, left, percent, ready } = getRewardProgress(
    childTasks,
    reward
  );

  return (
    <Card className="rounded-[2rem] border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-5 shadow-[0_18px_45px_rgba(120,72,20,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
            {reward.childName} reward
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {reward.title} 🍦
          </h3>

          <p className="mt-1 text-sm font-extrabold text-slate-500">
            {ready ? "Ready to celebrate!" : `${left} tasks to go`}
          </p>
        </div>

        <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white/80 shadow-inner">
          <Trophy className="h-10 w-10 text-amber-600" />
        </div>
      </div>

      <div className="mt-6">
        <div className="h-4 overflow-hidden rounded-full bg-white shadow-inner">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-sm font-black text-slate-600">
          <span>
            {completed}/{required} completed
          </span>
          <span>{percent}%</span>
        </div>
      </div>

      {ready && canWrite && (
        <Button
          type="button"
          onClick={() => onClaimReward?.(reward)}
          className="mt-5 w-full rounded-2xl bg-amber-600 font-black text-white hover:bg-amber-700"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Claim & reset
        </Button>
      )}
    </Card>
  );
}
