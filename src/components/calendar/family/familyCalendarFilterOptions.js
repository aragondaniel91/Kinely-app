import { colorClasses } from "@/lib/personColorUtils";
import { ALL_ASSIGNMENT_ID, FAMILY_ASSIGNMENT_ID } from "@/components/calendar/family/hooks/useFamilyCalendarFilters";

export const FAMILY_FILTER_COLOR_CLASS = "bg-gradient-to-r from-blue-500 via-emerald-500 to-orange-500";

export function buildPersonFilterOptions(people = []) {
  return [
    { value: ALL_ASSIGNMENT_ID, label: "All", colorClass: FAMILY_FILTER_COLOR_CLASS },
    { value: FAMILY_ASSIGNMENT_ID, label: "Family", colorClass: FAMILY_FILTER_COLOR_CLASS },
    ...people.map((person) => ({
      value: person.id,
      label: person.displayName,
      colorClass: colorClasses(person.colorId || "family", "slate").dot,
    })),
  ];
}

export function buildCategoryFilterOptions(categoryOptions = []) {
  return categoryOptions.map((category) => ({
    value: category.value,
    label: category.label,
    icon: category.emoji || "📌",
  }));
}
