import React from "react";
import { CalendarClock, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getRewardCycleStartedMillis,
  getRewardProgress,
} from "@/features/tasks/utils/rewardProgress";
import { getRewardIconComponent, getRewardIconKey } from "@/features/tasks/utils/rewardIcons";

function toMillis(value) {
  if (!value) return 0;

  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  if (typeof value?.seconds === "number") {
    return value.seconds * 1000;
  }

  return 0;
}

function formatRewardDate(value) {
  const millis = toMillis(value);

  if (!millis) return "Not claimed yet";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(millis));
}

function getLastClaimedDate(reward = {}) {
  return (
    reward.lastRedeemedAt ||
    reward.last_redeemed_at ||
    reward.redeemedAt ||
    reward.redeemed_at ||
    null
  );
}

function getRedeemedCount(reward = {}) {
  return Number(reward.redeemedCount || reward.redeemed_count || 0);
}

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

  const RewardIcon = getRewardIconComponent(
    reward.icon || getRewardIconKey(reward.title, "trophy")
  );

  const cycleStartedAt = getRewardCycleStartedMillis(reward);
  const lastClaimedAt = getLastClaimedDate(reward);
  const redeemedCount = getRedeemedCount(reward);

  return (
    <Card className="relative overflow-hidden rounded-[2rem] border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-5 shadow-[0_18px_45px_rgba(120,72,20,0.08)]">
      {ready && (
        <div className="absolute right-4 top-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-lg">
          Ready
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
            {reward.childName} reward
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {reward.title}
          </h3>

          <p className="mt-1 text-sm font-extrabold text-slate-500">
            {ready ? "Ready to celebrate!" : `${left} tasks to go`}
          </p>
        </div>

        <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white/80 shadow-inner">
          <RewardIcon className="h-10 w-10 text-amber-600" />
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

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-white">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Claimed
          </p>
          <p className="mt-1 text-sm font-black text-slate-800">
            {redeemedCount}x
          </p>
        </div>

        <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-white">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
            <CalendarClock className="h-3.5 w-3.5" />
            Last claim
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-800">
            {formatRewardDate(lastClaimedAt)}
          </p>
        </div>

        <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-white">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
            <Sparkles className="h-3.5 w-3.5" />
            Cycle
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-800">
            {cycleStartedAt ? formatRewardDate(cycleStartedAt) : "All time"}
          </p>
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
