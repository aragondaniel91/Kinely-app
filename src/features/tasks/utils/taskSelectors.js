import {
  getTaskAssignee,
  isDone,
  normalizeAssignee,
} from "@/features/tasks/utils/taskHelpers";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLoose(value) {
  return slugify(value).replace(/-/g, "");
}

function getTaskPersonIds(task = {}) {
  return [
    task.assignedToPersonId,
    task.assigned_to_person_id,
    task.personId,
    task.person_id,
    task.childId,
    task.child_id,
    task.assignedToId,
    task.assigned_to_id,
  ]
    .filter(Boolean)
    .map(String);
}

function getPersonIds(person = {}) {
  return [
    person.id,
    person.personId,
    person.person_id,
    person.childId,
    person.child_id,
    person.userId,
    person.user_id,
    person.uid,
  ]
    .filter(Boolean)
    .map(String);
}

function getPersonAliases(person = {}) {
  return [
    ...(person.aliases || []),
    person.id,
    person.name,
    person.role,
    person.roleType,
    person.personId,
    person.person_id,
    person.childId,
    person.child_id,
  ]
    .filter(Boolean)
    .map(String);
}

function taskMatchesPerson(task = {}, person = {}) {
  const taskIds = getTaskPersonIds(task);
  const personIds = getPersonIds(person);

  if (taskIds.some((taskId) => personIds.includes(taskId))) {
    return true;
  }

  const assignee = getTaskAssignee(task);
  const normalizedAssignee = normalizeLoose(assignee);
  const normalizedLegacyAssignee = normalizeAssignee(assignee);

  const aliases = getPersonAliases(person);
  const normalizedAliases = aliases.map(normalizeLoose);

  if (normalizedAliases.includes(normalizedAssignee)) {
    return true;
  }

  if (normalizedLegacyAssignee === person.id) {
    return true;
  }

  if (normalizedLegacyAssignee === person.roleType) {
    return true;
  }

  return false;
}

export function getTasksByPerson(tasks = [], people = []) {
  return people.reduce((acc, person) => {
    acc[person.id] = tasks.filter((task) => taskMatchesPerson(task, person));

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
