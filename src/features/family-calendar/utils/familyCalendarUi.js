import { format, parse } from "date-fns";

export const FAMILY_CALENDAR_DEFAULT_START_HOUR = 7;
export const FAMILY_CALENDAR_DEFAULT_END_HOUR = 21;
export const FAMILY_CALENDAR_HOUR_HEIGHT = 92;
export const FAMILY_CALENDAR_ALL_DAY_HEIGHT = 108;
export const FAMILY_CALENDAR_MIN_EVENT_HEIGHT = 54;
export const FAMILY_CALENDAR_DAY_START_MINUTES = FAMILY_CALENDAR_DEFAULT_START_HOUR * 60;
export const FAMILY_CALENDAR_HOURS = buildTimelineHours({
  startHour: FAMILY_CALENDAR_DEFAULT_START_HOUR,
  endHour: FAMILY_CALENDAR_DEFAULT_END_HOUR,
});

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

export function buildTimelineHours({ startHour = FAMILY_CALENDAR_DEFAULT_START_HOUR, endHour = FAMILY_CALENDAR_DEFAULT_END_HOUR } = {}) {
  const safeStart = Math.max(0, Math.min(23, Math.floor(startHour)));
  const safeEnd = Math.max(safeStart, Math.min(24, Math.ceil(endHour)));
  return Array.from({ length: safeEnd - safeStart + 1 }, (_, index) => safeStart + index);
}

export function getEventTimeBounds(event = {}) {
  if (event.isAllDay || event.is_all_day) return null;
  const start = parseEventMinutes(event.startTime || event.start_time);
  const rawEnd = parseEventMinutes(event.endTime || event.end_time);
  if (start === null) return null;
  const end = rawEnd && rawEnd > start ? rawEnd : start + 45;
  return { start, end };
}

export function buildTimelineHourRange(events = []) {
  const bounds = events.map(getEventTimeBounds).filter(Boolean);

  if (!bounds.length) {
    return {
      startHour: FAMILY_CALENDAR_DEFAULT_START_HOUR,
      endHour: FAMILY_CALENDAR_DEFAULT_END_HOUR,
      startMinutes: FAMILY_CALENDAR_DEFAULT_START_HOUR * 60,
      endMinutes: FAMILY_CALENDAR_DEFAULT_END_HOUR * 60,
      hours: FAMILY_CALENDAR_HOURS,
    };
  }

  const earliestStart = Math.min(...bounds.map((bound) => bound.start));
  const latestEnd = Math.max(...bounds.map((bound) => bound.end));
  const startHour = Math.max(0, Math.min(FAMILY_CALENDAR_DEFAULT_START_HOUR, Math.floor(earliestStart / 60)));
  const endHour = Math.min(24, Math.max(FAMILY_CALENDAR_DEFAULT_END_HOUR, Math.ceil(latestEnd / 60)));

  return {
    startHour,
    endHour,
    startMinutes: startHour * 60,
    endMinutes: endHour * 60,
    hours: buildTimelineHours({ startHour, endHour }),
  };
}

export function hourLabel(hour) {
  if (hour === 24) return "12 AM";
  return format(new Date(2026, 0, 1, hour), "h a");
}
