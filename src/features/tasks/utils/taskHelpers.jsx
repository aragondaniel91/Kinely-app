import {
  Bath,
  Bed,
  BookOpen,
  Briefcase,
  CalendarDays,
  Circle,
  Dumbbell,
  Footprints,
  Home,
  PawPrint,
  Pill,
  School,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Trash2,
  Users,
  Utensils,
} from "lucide-react";

import { inferTaskIconFromTitle } from "@/features/tasks/utils/taskDialogOptions";

export const iconMap = {
  bath: Bath,
  shower: Bath,
  baño: Bath,
  bano: Bath,

  bed: Bed,
  cama: Bed,

  read: BookOpen,
  leer: BookOpen,
  book: BookOpen,

  homework: School,
  school: School,
  backpack: School,
  mochila: School,

  laundry: Shirt,
  clothes: Shirt,
  ropa: Shirt,

  clean: Sparkles,
  broom: Sparkles,
  sweep: Sparkles,
  limpiar: Sparkles,

  plant: Sprout,
  plants: Sprout,
  regar: Sprout,

  exercise: Dumbbell,
  workout: Dumbbell,
  sport: Dumbbell,

  trash: Trash2,
  basura: Trash2,

  medicine: Pill,
  medication: Pill,
  pill: Pill,

  walk: Footprints,
  caminar: Footprints,

  pet: PawPrint,
  dog: PawPrint,
  cat: PawPrint,
  mascota: PawPrint,

  grocery: ShoppingBasket,
  groceries: ShoppingBasket,
  shopping: ShoppingBasket,

  lunch: Utensils,
  dinner: Utensils,
  breakfast: Utensils,
  meal: Utensils,
  comida: Utensils,

  family: Users,
  calendar: CalendarDays,
  schedule: CalendarDays,
  work: Briefcase,
  personal: Sparkles,
  home: Home,

  teeth: Sparkles,
  toothbrush: Sparkles,
  routine: Sparkles,
  sparkles: Sparkles,

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
    "Family"
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
  const explicitIcon = String(task.icon || "").trim().toLowerCase();

  if (explicitIcon && iconMap[explicitIcon]) {
    return iconMap[explicitIcon];
  }

  const inferredIcon = inferTaskIconFromTitle(task.title || "", task.category || "other");

  if (inferredIcon && iconMap[inferredIcon]) {
    return iconMap[inferredIcon];
  }

  const raw = `${task.title || ""} ${task.category || ""}`.toLowerCase();
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
    icon: data.icon || inferTaskIconFromTitle(data.title || "", data.category || "other"),
  };
}
