import { isDone } from "@/features/tasks/utils/taskHelpers";

export const TASK_DATE_SCOPES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All" },
];

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toLocalDateKey(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (typeof value?.toDate === "function") {
    return getLocalDateKey(value.toDate());
  }

  if (value instanceof Date) {
    return getLocalDateKey(value);
  }

  if (typeof value?.seconds === "number") {
    return getLocalDateKey(new Date(value.seconds * 1000));
  }

  return "";
}

function getStartOfWeek(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getEndOfWeek(date = new Date()) {
  const result = getStartOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);

  return result;
}

function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isDateKeyInRange(dateKey, startDate, endDate) {
  if (!dateKey) return false;

  const startKey = getLocalDateKey(startDate);
  const endKey = getLocalDateKey(endDate);

  return dateKey >= startKey && dateKey <= endKey;
}

export function getTaskDueDateKey(task = {}) {
  return toLocalDateKey(
    task.dueDate ||
      task.due_date ||
      task.date ||
      task.taskDate ||
      task.task_date ||
      ""
  );
}

export function getTaskCompletedDateKey(task = {}) {
  return toLocalDateKey(
    task.completedAt ||
      task.completed_at ||
      task.completedDate ||
      task.completed_date ||
      ""
  );
}

function shouldShowNoDateTaskInToday(task, todayKey) {
  if (!isDone(task)) return true;

  const completedDate = getTaskCompletedDateKey(task);

  return completedDate === todayKey;
}

function shouldShowNoDateTaskInPeriod(task, startDate, endDate) {
  if (!isDone(task)) return true;

  const completedDate = getTaskCompletedDateKey(task);

  return isDateKeyInRange(completedDate, startDate, endDate);
}

export function filterTasksByDateScope(tasks = [], scope = "all") {
  if (scope === "all") return tasks;

  const now = new Date();
  const today = getLocalDateKey(now);

  return tasks.filter((task) => {
    const dueDate = getTaskDueDateKey(task);

    if (scope === "today") {
      if (!dueDate) return shouldShowNoDateTaskInToday(task, today);

      return dueDate === today;
    }

    if (scope === "week") {
      const startOfWeek = getStartOfWeek(now);
      const endOfWeek = getEndOfWeek(now);

      if (!dueDate) return shouldShowNoDateTaskInPeriod(task, startOfWeek, endOfWeek);

      return isDateKeyInRange(dueDate, startOfWeek, endOfWeek);
    }

    if (scope === "month") {
      const startOfMonth = getStartOfMonth(now);
      const endOfMonth = getEndOfMonth(now);

      if (!dueDate) return shouldShowNoDateTaskInPeriod(task, startOfMonth, endOfMonth);

      return isDateKeyInRange(dueDate, startOfMonth, endOfMonth);
    }

    if (scope === "upcoming") {
      return dueDate && dueDate > today && !isDone(task);
    }

    return true;
  });
}

export function getTaskDateScopeTitle(scope = "all") {
  if (scope === "today") return "Today";
  if (scope === "week") return "This week";
  if (scope === "month") return "This month";
  if (scope === "upcoming") return "Upcoming";
  return "All tasks";
}
