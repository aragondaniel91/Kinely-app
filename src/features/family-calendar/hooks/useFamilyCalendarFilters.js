import { useMemo } from "react";

export const ALL_ASSIGNMENT_ID = "all";
export const FAMILY_ASSIGNMENT_ID = "family";

function eventAssignedPersonIds(event = {}) {
  return event.assignedPersonIds || event.assigned_person_ids || [];
}

function isFamilyAssignedEvent(event = {}) {
  return eventAssignedPersonIds(event).length === 0;
}

function eventMatchesPerson(event, selectedPersonId) {
  if (!selectedPersonId || selectedPersonId === ALL_ASSIGNMENT_ID) return true;
  if (selectedPersonId === FAMILY_ASSIGNMENT_ID) return isFamilyAssignedEvent(event);
  return eventAssignedPersonIds(event).includes(selectedPersonId);
}

function eventMatchesCategory(event, selectedCategory) {
  if (!selectedCategory || selectedCategory === "all") return true;
  return event.category === selectedCategory;
}

function buildEventsByDay(events = []) {
  const map = new Map();
  events.forEach((event) => {
    if (!event.date) return;
    if (!map.has(event.date)) map.set(event.date, []);
    map.get(event.date).push(event);
  });
  return map;
}

export function useFamilyCalendarFilters({ events = [], selectedPersonId = ALL_ASSIGNMENT_ID, selectedCategory = "all" } = {}) {
  const filteredEvents = useMemo(
    () => events.filter((event) => eventMatchesPerson(event, selectedPersonId) && eventMatchesCategory(event, selectedCategory)),
    [events, selectedPersonId, selectedCategory]
  );

  const eventsByDay = useMemo(() => buildEventsByDay(filteredEvents), [filteredEvents]);

  return {
    filteredEvents,
    eventsByDay,
  };
}
