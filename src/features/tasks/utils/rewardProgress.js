import { isArchivedTask, isDone } from "@/features/tasks/utils/taskHelpers";

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

export function getRewardCycleStartedMillis(reward) {
  return toMillis(
    reward?.cycleStartedAt ||
      reward?.cycle_started_at ||
      reward?.lastRedeemedAt ||
      reward?.last_redeemed_at
  );
}

export function getTaskCompletedMillis(task) {
  return toMillis(
    task?.completedAt ||
      task?.completed_at ||
      task?.updatedAt ||
      task?.updated_at
  );
}

export function isCompletedInRewardCycle(task, reward) {
  if (isArchivedTask(task)) return false;
  if (!isDone(task)) return false;

  const cycleStartedAt = getRewardCycleStartedMillis(reward);

  if (!cycleStartedAt) return true;

  const completedAt = getTaskCompletedMillis(task);

  return completedAt >= cycleStartedAt;
}

export function getRewardCompletedTasks(tasks = [], reward) {
  return tasks.filter((task) => isCompletedInRewardCycle(task, reward));
}

export function getRewardRequiredTasks(reward, fallback = 1) {
  return Math.max(
    Number(reward?.requiredTasks || reward?.required_tasks || fallback || 1),
    1
  );
}

export function getRewardProgress(tasks = [], reward) {
  const completedTasks = getRewardCompletedTasks(tasks, reward);
  const completed = completedTasks.length;
  const required = getRewardRequiredTasks(reward, tasks.length || 1);
  const left = Math.max(required - completed, 0);
  const percent = Math.min(Math.round((completed / required) * 100), 100);
  const ready = completed >= required;

  return {
    completed,
    required,
    left,
    percent,
    ready,
    completedTasks,
  };
}
