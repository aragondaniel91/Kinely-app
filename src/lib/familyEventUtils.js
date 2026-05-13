import { canUserSeeItem } from "@/lib/visibilityUtils";

export function normalizeFamilyEvent(docSnap) {
  const data = typeof docSnap?.data === "function" ? docSnap.data() : docSnap || {};
  const id = docSnap?.id || data.id || "";
  const isAllDay = Boolean(data.isAllDay) || (!data.startTime && !data.endTime);

  return {
    id,
    ...data,
    title: data.title || "Untitled event",
    description: data.description || data.notes || "",
    date: data.date || "",
    startTime: isAllDay ? "" : data.startTime || "",
    endTime: isAllDay ? "" : data.endTime || "",
    category: data.category || "other",
    isAllDay,
    location: data.location || "",
    childName: data.childName || "",
    childId: data.childId || data.child_id || "",
    assignedTo: data.assignedTo || "",
    assignedToType: data.assignedToType || (data.childName ? "child" : "all"),
    assignedToName: data.assignedToName || data.childName || "",
    assignedToEmail: data.assignedToEmail || data.assigned_to_email || "",
    eventColor: data.eventColor || data.event_color || "",
    eventColorSource: data.eventColorSource || data.event_color_source || "",
    googleCalendarEventId: data.googleCalendarEventId || data.googleEventId || "",
  };
}

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

export function normalizeAndFilterFamilyEvents(docsOrEvents = [], userEmail = "") {
  const normalized = docsOrEvents.map((item) => normalizeFamilyEvent(item));
  return sortFamilyEvents(filterVisibleFamilyEvents(normalized, userEmail));
}
