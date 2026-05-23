export const TASK_DATE_SCOPES = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All" },
];

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTaskDueDateKey(task = {}) {
  const raw =
    task.dueDate ||
    task.due_date ||
    task.date ||
    task.taskDate ||
    task.task_date ||
    "";

  if (!raw) return "";

  if (typeof raw === "string") {
    return raw.slice(0, 10);
  }

  if (raw?.toDate) {
    return getLocalDateKey(raw.toDate());
  }

  if (raw instanceof Date) {
    return getLocalDateKey(raw);
  }

  return "";
}

export function filterTasksByDateScope(tasks = [], scope = "all") {
  if (scope === "all") return tasks;

  const today = getLocalDateKey();

  return tasks.filter((task) => {
    const dueDate = getTaskDueDateKey(task);

    if (scope === "today") {
      // Existing tasks without due date should remain visible in the default focus.
      return !dueDate || dueDate === today;
    }

    if (scope === "upcoming") {
      return dueDate && dueDate > today;
    }

    return true;
  });
}

export function getTaskDateScopeTitle(scope = "all") {
  if (scope === "today") return "Today";
  if (scope === "upcoming") return "Upcoming";
  return "All tasks";
}
