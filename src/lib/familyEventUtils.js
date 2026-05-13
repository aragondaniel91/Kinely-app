import { canUserSeeItem } from "@/lib/visibilityUtils";

export function isLegacyFamilyEvent(event = {}) {
  return !event.visibility && !event.audience && !event.visibleTo && !event.visible_to;
}

export function canUserSeeFamilyEvent(event = {}, userEmail = "") {
  if (isLegacyFamilyEvent(event)) return true;
  return canUserSeeItem(event, userEmail);
}

export function filterVisibleFamilyEvents(events = [], userEmail = "") {
  return events.filter((event) => canUserSeeFamilyEvent(event, userEmail));
}

export function sortFamilyEvents(events = []) {
  return [...events].sort((a, b) => {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare !== 0) return dateCompare;

    const aTime = a.isAllDay ? "00:00" : a.startTime || "99:99";
    const bTime = b.isAllDay ? "00:00" : b.startTime || "99:99";
    return String(aTime).localeCompare(String(bTime));
  });
}
