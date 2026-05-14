import { format, parse } from "date-fns";

export const FAMILY_CALENDAR_HOURS = Array.from({ length: 15 }, (_, index) => index + 7);
export const FAMILY_CALENDAR_HOUR_HEIGHT = 92;
export const FAMILY_CALENDAR_ALL_DAY_HEIGHT = 108;
export const FAMILY_CALENDAR_MIN_EVENT_HEIGHT = 54;
export const FAMILY_CALENDAR_DAY_START_MINUTES = 7 * 60;

export const FAMILY_CALENDAR_CATEGORIES = [
  { value: "all", label: "All Categories", emoji: "✨" },
  { value: "school", label: "School", emoji: "🎒" },
  { value: "sports", label: "Sports", emoji: "⚾" },
  { value: "doctor", label: "Health", emoji: "🩺" },
  { value: "pickup", label: "Pickup", emoji: "🚗" },
  { value: "birthday", label: "Birthday", emoji: "🎂" },
  { value: "family", label: "Family", emoji: "🏠" },
  { value: "note", label: "Note", emoji: "📝" },
  { value: "other", label: "Other", emoji: "📌" },
];

export function getFamilyCalendarCategory(value = "other") {
  return FAMILY_CALENDAR_CATEGORIES.find((category) => category.value === value) || FAMILY_CALENDAR_CATEGORIES.find((category) => category.value === "other");
}

export function categoryLabel(value = "other") {
  return getFamilyCalendarCategory(value)?.label || "Other";
}

export function categoryEmoji(value = "other") {
  return getFamilyCalendarCategory(value)?.emoji || "📌";
}

export function displayTime(value = "") {
  if (!value) return "";
  try {
    return format(parse(value, "HH:mm", new Date()), "h:mm a");
  } catch {
    return value;
  }
}

export function displayTimeRange(event = {}) {
  if (event.isAllDay || event.is_all_day) return "All-day";
  const start = displayTime(event.startTime || event.start_time);
  const end = displayTime(event.endTime || event.end_time);
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

export function parseEventMinutes(value = "") {
  if (!value) return null;
  const [hours, minutes = "0"] = String(value).split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return hours * 60 + minutes;
}

export function hourLabel(hour) {
  return format(new Date(2026, 0, 1, hour), "h a");
}
