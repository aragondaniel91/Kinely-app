import {
  getTaskAssignee,
  isDone,
  normalizeAssignee,
} from "@/features/tasks/utils/taskHelpers";

export function getTasksByPerson(tasks = [], people = []) {
  return people.reduce((acc, person) => {
    acc[person.id] = tasks.filter(
      (task) => normalizeAssignee(getTaskAssignee(task)) === person.id
    );

    return acc;
  }, {});
}

export function getSelectedPerson(people = [], selectedPersonId) {
  return people.find((person) => person.id === selectedPersonId) || people[0] || null;
}

export function getSelectedTasks(tasksByPerson = {}, selectedPersonId) {
  return tasksByPerson[selectedPersonId] || [];
}

export function getTaskStats(tasks = []) {
  const completedCount = tasks.filter(isDone).length;
  const pendingCount = tasks.filter((task) => !isDone(task)).length;

  return {
    completedCount,
    pendingCount,
    totalCount: tasks.length,
  };
}
