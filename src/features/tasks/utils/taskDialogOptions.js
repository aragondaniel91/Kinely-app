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
  {
    value: "bed",
    label: "Bed",
    categories: ["house", "personal"],
    keywords: ["bed", "make bed", "bedroom", "cama", "hacer cama", "tender cama", "cuarto"],
  },
  {
    value: "toothbrush",
    label: "Brush teeth",
    categories: ["personal"],
    keywords: ["brush teeth", "teeth", "tooth", "toothbrush", "dientes", "cepillar", "cepillarse", "lavar dientes"],
  },
  {
    value: "bath",
    label: "Bath",
    categories: ["personal"],
    keywords: ["bath", "bathe", "shower", "ducha", "baño", "banar", "bañar"],
  },
  {
    value: "read",
    label: "Read",
    categories: ["school", "personal"],
    keywords: ["read", "reading", "book", "story", "leer", "lectura", "libro", "cuento"],
  },
  {
    value: "homework",
    label: "Homework",
    categories: ["school"],
    keywords: ["homework", "assignment", "study", "tarea", "tareas", "estudiar", "deberes"],
  },
  {
    value: "backpack",
    label: "Backpack",
    categories: ["school"],
    keywords: ["backpack", "bag", "school bag", "lunchbox", "mochila", "lonchera"],
  },
  {
    value: "laundry",
    label: "Laundry",
    categories: ["house", "personal"],
    keywords: ["laundry", "clothes", "wash clothes", "fold clothes", "ropa", "lavar ropa", "doblar ropa", "lavanderia", "lavandería"],
  },
  {
    value: "clean",
    label: "Clean",
    categories: ["house"],
    keywords: ["clean", "broom", "sweep", "mop", "tidy", "limpiar", "barrer", "trapear", "ordenar"],
  },
  {
    value: "plant",
    label: "Plants",
    categories: ["house"],
    keywords: ["plant", "plants", "water plants", "regar", "plantas", "jardin", "jardín"],
  },
  {
    value: "trash",
    label: "Trash",
    categories: ["house"],
    keywords: ["trash", "garbage", "recycle", "basura", "sacar basura", "reciclaje"],
  },
  {
    value: "medicine",
    label: "Medicine",
    categories: ["personal"],
    keywords: ["medicine", "medication", "pill", "vitamin", "medicina", "medicación", "pastilla", "vitamina"],
  },
  {
    value: "walk",
    label: "Walk",
    categories: ["personal", "family"],
    keywords: ["walk", "walking", "caminar", "paseo", "pasear"],
  },
  {
    value: "exercise",
    label: "Exercise",
    categories: ["personal"],
    keywords: ["exercise", "workout", "sport", "soccer", "basketball", "ejercicio", "deporte", "futbol", "fútbol"],
  },
  {
    value: "pet",
    label: "Pet care",
    categories: ["house", "family"],
    keywords: ["pet", "dog", "cat", "feed dog", "feed cat", "mascota", "perro", "gato", "dar comida"],
  },
  {
    value: "grocery",
    label: "Groceries",
    categories: ["house", "family"],
    keywords: ["grocery", "groceries", "shopping", "milk", "store", "leche", "compras", "supermarket", "supermercado"],
  },
  {
    value: "dinner",
    label: "Meal",
    categories: ["house", "family"],
    keywords: ["dinner", "lunch", "breakfast", "meal", "food", "cook", "cena", "almuerzo", "desayuno", "comida", "cocinar"],
  },
  {
    value: "calendar",
    label: "Schedule",
    categories: ["family", "work", "other"],
    keywords: ["appointment", "calendar", "schedule", "event", "cita", "calendario", "evento", "agenda"],
  },
  {
    value: "family",
    label: "Family",
    categories: ["family"],
    keywords: ["family", "together", "movie", "pizza", "game", "familia", "juntos", "película", "pelicula", "juego"],
  },
  {
    value: "home",
    label: "Home",
    categories: ["house", "other"],
    keywords: ["home", "house", "casa", "hogar"],
  },
  {
    value: "sparkles",
    label: "Routine",
    categories: ["personal", "other"],
    keywords: ["routine", "habit", "prepare", "ready", "rutina", "habito", "hábito", "preparar", "listo"],
  },
];

export function normalizeTaskText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñáéíóúü\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDefaultTaskIcon(category) {
  if (category === "school") return "homework";
  if (category === "personal") return "sparkles";
  if (category === "family") return "family";
  if (category === "house") return "home";
  if (category === "work") return "calendar";
  return "sparkles";
}

export function inferTaskIconFromTitle(title = "", category = "other") {
  const text = normalizeTaskText(title);

  if (!text) return getDefaultTaskIcon(category);

  const exactPhraseMatch = TASK_ICON_OPTIONS.find((option) =>
    option.keywords.some((keyword) => text.includes(normalizeTaskText(keyword)))
  );

  if (exactPhraseMatch) return exactPhraseMatch.value;

  const categoryMatch = TASK_ICON_OPTIONS.find((option) =>
    option.categories.includes(category)
  );

  return categoryMatch?.value || getDefaultTaskIcon(category);
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
  const icons = TASK_ICON_OPTIONS.filter((option) => {
    return (
      option.categories.includes(category) ||
      option.categories.includes("other") ||
      option.value === "sparkles"
    );
  });

  return icons.length ? icons : TASK_ICON_OPTIONS;
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
