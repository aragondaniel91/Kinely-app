export const TASK_CATEGORY_COPY = {
  house: "Family and home responsibilities.",
  work: "Personal or work focus.",
  school: "School and learning.",
  personal: "Personal routine or care.",
  family: "Shared family moment or responsibility.",
  other: "General task.",
};

export const TASK_CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "house", label: "House" },
  { value: "school", label: "School" },
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

export const TASK_CREATE_CATEGORY_OPTIONS = TASK_CATEGORY_OPTIONS.filter(
  (option) => option.value !== "all"
);

export const TASK_PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const TASK_ICON_OPTIONS = [
  { value: "bed", label: "Bed", categories: ["house", "personal"], keywords: ["bed", "make bed", "cama", "hacer cama"] },
  { value: "read", label: "Read", categories: ["school", "personal"], keywords: ["read", "reading", "book", "leer", "lectura", "libro"] },
  { value: "backpack", label: "Backpack", categories: ["school"], keywords: ["backpack", "bag", "school bag", "mochila"] },
  { value: "plant", label: "Plants", categories: ["house"], keywords: ["plant", "plants", "water plants", "regar", "plantas"] },
  { value: "trash", label: "Trash", categories: ["house"], keywords: ["trash", "garbage", "basura", "sacar basura"] },
  { value: "medicine", label: "Medicine", categories: ["personal"], keywords: ["medicine", "medication", "pill", "medicina", "medicación", "pastilla"] },
  { value: "grocery", label: "Groceries", categories: ["house", "family"], keywords: ["grocery", "groceries", "milk", "leche", "compras", "supermarket"] },
  { value: "dinner", label: "Dinner", categories: ["house", "family"], keywords: ["dinner", "lunch", "meal", "food", "cena", "almuerzo", "comida"] },
  { value: "family", label: "Family", categories: ["family"], keywords: ["family", "together", "movie", "pizza", "familia", "juntos", "película"] },
  { value: "home", label: "Home", categories: ["house", "other"], keywords: ["home", "house", "clean", "casa", "limpiar"] },
  { value: "sparkles", label: "Routine", categories: ["personal", "other"], keywords: ["routine", "brush", "teeth", "shower", "rutina", "cepillar", "dientes"] },
];

export function normalizeTaskText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function inferTaskIconFromTitle(title = "", category = "other") {
  const text = normalizeTaskText(title);

  if (!text) return getDefaultTaskIcon(category);

  const directMatch = TASK_ICON_OPTIONS.find((option) =>
    option.keywords.some((keyword) => text.includes(normalizeTaskText(keyword)))
  );

  if (directMatch) return directMatch.value;

  return getDefaultTaskIcon(category);
}

export function getDefaultTaskIcon(category) {
  if (category === "school") return "read";
  if (category === "personal") return "sparkles";
  if (category === "family") return "family";
  if (category === "house") return "home";
  return "sparkles";
}

export function getTaskAssigneeValue(task) {
  const safeTask = task || {};

  return (
    safeTask.assignedToPersonId ||
    safeTask.assigned_to_person_id ||
    safeTask.personId ||
    safeTask.person_id ||
    safeTask.childId ||
    safeTask.child_id ||
    safeTask.assignedTo ||
    safeTask.assigned_to ||
    "family"
  );
}

export function getAvailableTaskIcons(category) {
  return TASK_ICON_OPTIONS.filter((option) => {
    return option.categories.includes(category) || option.categories.includes("other");
  });
}

export function buildAssigneeOptions(people = []) {
  const options = people
    .filter((person) => person?.id && person?.name)
    .map((person) => ({
      value: person.id,
      label: person.name,
      role: person.role || "",
      roleType: person.roleType || "",
      childId: person.childId || person.child_id || "",
    }));

  return options.length
    ? options
    : [
        {
          value: "family",
          label: "Family",
          role: "Together",
          roleType: "family",
          childId: "",
        },
      ];
}

export function findAssigneeOption(assigneeOptions = [], value) {
  return (
    assigneeOptions.find((option) => option.value === value) ||
    assigneeOptions[0] ||
    {
      value: "family",
      label: "Family",
      role: "Together",
      roleType: "family",
      childId: "",
    }
  );
}

export function buildTaskPayload({
  title,
  category,
  priority,
  icon,
  rewardEligible,
  selectedAssignee,
  dueDate,
  familyId,
}) {
  const childId =
    selectedAssignee?.roleType === "child"
      ? selectedAssignee.childId || selectedAssignee.value
      : "";

  return {
    title: title.trim(),
    category,
    priority,
    icon,
    rewardEligible,
    reward_eligible: rewardEligible,

    assignedTo: selectedAssignee?.label || "Family",
    assigned_to: selectedAssignee?.label || "Family",
    assignedToName: selectedAssignee?.label || "Family",
    assigned_to_name: selectedAssignee?.label || "Family",
    assignedToPersonId: selectedAssignee?.value || "family",
    assigned_to_person_id: selectedAssignee?.value || "family",

    childId,
    child_id: childId,
    assignedChildId: childId,
    assigned_child_id: childId,

    due_date: dueDate || "",
    dueDate: dueDate || "",
    familyId,
    family_id: familyId,
  };
}
