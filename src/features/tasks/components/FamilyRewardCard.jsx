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

  if (!millis) return "Not yet";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
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

export default function FamilyRewardCard({
  reward,
  allTasks,
  canWrite = false,
  onClaimReward,
}) {
  if (!reward) return null;

  const { completed, required, left, percent, ready } = getRewardProgress(
    allTasks,
    reward
  );

  const RewardIcon = getRewardIconComponent(
    reward.icon || getRewardIconKey(reward.title, "gift")
  );

  const cycleStartedAt = getRewardCycleStartedMillis(reward);
  const lastClaimedAt = getLastClaimedDate(reward);
  const redeemedCount = getRedeemedCount(reward);

  return (
    <Card className="relative overflow-hidden rounded-[1.65rem] border-blue-200/80 bg-blue-50/55 p-4 shadow-[0_12px_28px_rgba(86,60,135,0.055)]">
      {ready && (
        <div className="absolute right-4 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-wide text-primary-foreground shadow-sm">
          Ready
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div>
          <div className="flex items-start gap-4 pr-16">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-primary shadow-sm ring-1 ring-blue-100">
              <RewardIcon className="h-7 w-7" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                Family reward
              </p>

              <h3 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
                {reward.title}
              </h3>

              <p className="mt-0.5 text-sm font-extrabold text-slate-500">
                {ready ? "Family goal reached!" : `${left} tasks to go`}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-white shadow-inner">
              <div
                className="h-full rounded-full bg-primary transition-all"
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
        </div>

        <div>
          <div className="flex flex-wrap gap-2 text-xs font-black text-slate-500 lg:justify-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-white">
              <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
              {redeemedCount}x claimed
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-white">
              <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
              Last {formatRewardDate(lastClaimedAt)}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-white">
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              Cycle {cycleStartedAt ? formatRewardDate(cycleStartedAt) : "All time"}
            </span>
          </div>

          {ready && canWrite && (
            <Button
              type="button"
              onClick={() => onClaimReward?.(reward)}
              className="mt-4 h-10 w-full rounded-2xl font-black"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Claim & reset
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
