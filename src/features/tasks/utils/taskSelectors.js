import { isDone } from "@/features/tasks/utils/taskHelpers";

export function getTaskPersonId(task = {}) {
  return (
    task.assignedToPersonId ||
    task.assigned_to_person_id ||
    task.personId ||
    task.person_id ||
    task.childId ||
    task.child_id ||
    task.assignedTo ||
    task.assigned_to ||
    "family"
  );
}

export function getTasksByPerson(tasks = []) {
  return tasks.reduce((acc, task) => {
    const personId = getTaskPersonId(task);

    if (!acc[personId]) acc[personId] = [];
    acc[personId].push(task);

    if (!acc.family) acc.family = [];

    const isFamilyTask =
      personId === "family" ||
      task.assignedTo === "Family" ||
      task.assigned_to === "Family" ||
      task.assignedToName === "Family" ||
      task.assigned_to_name === "Family";

    if (isFamilyTask) {
      acc.family.push(task);
    }

    return acc;
  }, {});
}

export function getSelectedPerson(people = [], selectedPersonId = "") {
  return (
    people.find((person) => person.id === selectedPersonId) ||
    people.find((person) => person.id === "family") ||
    people[0] ||
    null
  );
}

export function getSelectedTasks(tasksByPerson = {}, selectedPersonId = "") {
  if (!selectedPersonId) return [];

  return tasksByPerson[selectedPersonId] || [];
}

export function getTaskStats(tasks = []) {
  const completedCount = tasks.filter(isDone).length;
  const pendingCount = Math.max(tasks.length - completedCount, 0);

  return {
    completedCount,
    pendingCount,
    totalCount: tasks.length,
  };
}
