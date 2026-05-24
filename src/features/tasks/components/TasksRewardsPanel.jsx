import React from "react";
import { Gift, Settings2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ChildRewardCard from "@/features/tasks/components/ChildRewardCard";
import FamilyRewardCard from "@/features/tasks/components/FamilyRewardCard";

function hasReward(reward) {
  return Boolean(reward?.title || reward?.id);
}

export default function TasksRewardsPanel({
  childReward,
  childTasks,
  childRewardItems = [],
  familyReward,
  allTasks = [],
  canWrite = false,
  onClaimReward,
  onManageRewards,
}) {
  const items =
    Array.isArray(childRewardItems) && childRewardItems.length
      ? childRewardItems.filter((item) => hasReward(item.reward))
      : childReward
        ? [{ reward: childReward, tasks: childTasks || [] }]
        : [];

  const hasChildRewards = items.length > 0;
  const hasFamilyReward = hasReward(familyReward);
  const hasRewards = hasChildRewards || hasFamilyReward;
  const hasRewardTasks = Array.isArray(allTasks) && allTasks.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-white/70 bg-white/58 px-5 py-4 shadow-[0_14px_34px_rgba(38,50,56,0.045)] backdrop-blur-xl">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-accent">
            <Gift className="h-4 w-4" />
            Rewards
          </p>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Keep the momentum going
          </h2>

          <p className="mt-1 text-sm font-bold text-slate-500">
            Reward tasks build small wins into family celebrations.
          </p>
        </div>

        {canWrite && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onManageRewards?.()}
            className="h-11 rounded-2xl bg-white/85 font-black"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Manage rewards
          </Button>
        )}
      </div>

      {hasRewards ? (
        <>
          {hasChildRewards && (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => (
                <ChildRewardCard
                  key={item.reward?.id || item.reward?.childPersonId || item.reward?.childName}
                  reward={item.reward}
                  childTasks={item.tasks || []}
                  canWrite={canWrite}
                  onClaimReward={onClaimReward}
                />
              ))}
            </div>
          )}

          {hasFamilyReward && (
            <FamilyRewardCard
              reward={familyReward}
              allTasks={allTasks}
              canWrite={canWrite}
              onClaimReward={onClaimReward}
            />
          )}
        </>
      ) : (
        <Card className="rounded-[2rem] border-dashed border-slate-200 bg-slate-50/75 p-6 text-center shadow-[0_14px_34px_rgba(38,50,56,0.04)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent shadow-sm ring-1 ring-white">
            <Sparkles className="h-7 w-7" />
          </div>

          <h3 className="mt-3 text-xl font-black text-slate-950">
            No rewards set up yet
          </h3>

          <p className="mx-auto mt-1 max-w-xl text-sm font-bold leading-6 text-slate-500">
            Create a child reward or a family reward, then mark chores or tasks as reward-eligible.
          </p>

          {canWrite && (
            <Button
              type="button"
              onClick={() => onManageRewards?.()}
              className="mt-5 rounded-2xl font-black"
            >
              <Gift className="mr-2 h-4 w-4" />
              Set up rewards
            </Button>
          )}
        </Card>
      )}

      {!hasRewards && !hasRewardTasks && (
        <Card className="rounded-[2rem] border-white/80 bg-white/75 p-5 shadow-[0_14px_34px_rgba(38,50,56,0.045)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Gift className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Rhythm note
              </p>

              <h3 className="mt-1 text-lg font-black text-slate-950">
                The family moves together.
              </h3>

              <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                Individual rewards motivate each child, while family rewards create shared momentum.
              </p>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
