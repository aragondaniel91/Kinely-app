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

export const CATEGORY_ICON_BY_CATEGORY = {
  house: "home",
  school: "school",
  personal: "personal",
  work: "work",
  family: "family",
  other: "sparkles",
};

export const TASK_ICON_OPTIONS = [
  {
    value: "home",
    label: "House",
    categories: ["house", "other"],
  },
  {
    value: "school",
    label: "School",
    categories: ["school"],
  },
  {
    value: "personal",
    label: "Personal",
    categories: ["personal"],
  },
  {
    value: "work",
    label: "Work",
    categories: ["work"],
  },
  {
    value: "family",
    label: "Family",
    categories: ["family"],
  },
  {
    value: "sparkles",
    label: "Other",
    categories: ["other", "personal"],
  },
];

export function normalizeTaskText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getDefaultTaskIcon(category) {
  return CATEGORY_ICON_BY_CATEGORY[category] || CATEGORY_ICON_BY_CATEGORY.other;
}

/**
 * For now, icon inference is intentionally category-based.
 * Real AI classification should happen later through a backend/LLM flow,
 * not through fragile keyword matching.
 */
export function inferTaskIconFromTitle(_title = "", category = "other") {
  return getDefaultTaskIcon(category);
}

export function getTaskIconOption(value) {
  return (
    TASK_ICON_OPTIONS.find((option) => option.value === value) ||
    TASK_ICON_OPTIONS.find((option) => option.value === "sparkles")
  );
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
  const categoryIcon = getDefaultTaskIcon(category);
  const primaryIcon = TASK_ICON_OPTIONS.find((option) => option.value === categoryIcon);

  const categoryOptions = TASK_ICON_OPTIONS.filter((option) =>
    option.categories.includes(category)
  );

  const options = [
    primaryIcon,
    ...categoryOptions,
    ...TASK_ICON_OPTIONS.filter((option) => option.value === "sparkles"),
  ].filter(Boolean);

  return Array.from(
    new Map(options.map((option) => [option.value, option])).values()
  );
}

export function buildAssigneeOptions(people = []) {
  const options = people
    .filter((person) => person?.id && person?.name)
    .map((person) => ({
      value: person.id,
      label: person.name,
      email: person.email || person.emailAddress || person.email_address || "",
      uid: person.uid || person.userId || person.user_id || "",
      role: person.role || "",
      roleType: person.roleType || "",
      childId: person.childId || person.child_id || "",
      colorId: person.colorId || person.color_id || person.color || "",
      color: person.color || person.colorId || person.color_id || "",
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
  const assigneeId = selectedAssignee?.value || selectedAssignee?.id || "family";
  const assigneeName = selectedAssignee?.label || selectedAssignee?.name || "Family";
  const assigneeEmail = selectedAssignee?.email || selectedAssignee?.emailAddress || selectedAssignee?.email_address || "";
  const roleType = selectedAssignee?.roleType || selectedAssignee?.role || "family";
  const childId =
    roleType === "child"
      ? selectedAssignee.childId || selectedAssignee.child_id || assigneeId
      : "";

  return {
    title: String(title || "").trim(),
    category,
    priority,
    icon,
    rewardEligible,
    assignedToPersonId: assigneeId,
    assignedToPersonName: assigneeName,
    assignedToPersonEmail: assigneeEmail,
    assigned_to_person_email: assigneeEmail,
    assignedToPersonColorId: selectedAssignee?.colorId || selectedAssignee?.color || "",

    childId,
    assignedChildId: childId,

    dueDate: dueDate || "",
    familyId,
  };
}
