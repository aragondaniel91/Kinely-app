import {
  Bed,
  BookOpen,
  CalendarDays,
  Circle,
  Dumbbell,
  Footprints,
  Pill,
  School,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Trash2,
  Users,
  Utensils,
} from "lucide-react";

export const iconMap = {
  bed: Bed,
  cama: Bed,
  teeth: Sparkles,
  toothbrush: Sparkles,
  mochila: School,
  backpack: School,
  read: BookOpen,
  leer: BookOpen,
  book: BookOpen,
  plant: Sprout,
  plants: Sprout,
  regar: Sprout,
  exercise: Dumbbell,
  workout: Dumbbell,
  trash: Trash2,
  basura: Trash2,
  medicine: Pill,
  medication: Pill,
  caminar: Footprints,
  walk: Footprints,
  grocery: ShoppingBasket,
  groceries: ShoppingBasket,
  lunch: Utensils,
  dinner: Utensils,
  comida: Utensils,
  family: Users,
  calendar: CalendarDays,
  default: Circle,
};

export function isDone(task = {}) {
  return task.status === "done" || task.status === "completed";
}

export function isDemoTask(task = {}) {
  return String(task.id || "").startsWith("demo-");
}

export function getTaskAssignee(task = {}) {
  return (
    task.assignedToName ||
    task.assigned_to_name ||
    task.assignedTo ||
    task.assigned_to ||
    task.assigneeName ||
    task.assignee_name ||
    task.ownerName ||
    task.owner ||
    "Familia"
  );
}

export function normalizeAssignee(value = "") {
  const text = String(value || "").toLowerCase();

  if (text.includes("joaquin") || text.includes("child") || text.includes("kid")) return "joaquin";
  if (text.includes("dad") || text.includes("pap") || text.includes("daniel")) return "dad";
  if (text.includes("mom") || text.includes("mam")) return "mom";
  if (text.includes("abuela") || text.includes("grandma")) return "grandma";
  if (text.includes("family") || text.includes("familia")) return "family";

  return "family";
}

export function getTaskIcon(task = {}) {
  const raw = `${task.icon || ""} ${task.title || ""} ${task.category || ""}`.toLowerCase();
  const key = Object.keys(iconMap).find((item) => raw.includes(item));

  return iconMap[key] || iconMap.default;
}

export function normalizeTask(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    status: data.status || "pending",
    category: data.category || "other",
    assignedTo: getTaskAssignee(data),
    icon: data.icon || "",
  };
}
