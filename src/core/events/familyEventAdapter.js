import {
  EVENT_COLOR_MODES,
  normalizeEvent,
  resolveEventColorId,
  getEventAssignedLabel,
} from "@/core/events/eventCore";

export function getFamilyEventFirestoreId(event = {}) {
  return event.firestoreId || event.firestore_id || event.docId || event.doc_id || event.documentId || event.document_id || event.id || "";
}

export function adaptFamilyEvent(rawEvent = {}, people = []) {
  const firestoreId = getFamilyEventFirestoreId(rawEvent);
  const legacyId = rawEvent.eventId || rawEvent.event_id || rawEvent.legacy?.id || rawEvent.raw?.id || "";
  const normalizedSource = {
    ...rawEvent,
    id: firestoreId || rawEvent.id,
  };

  const event = normalizeEvent(normalizedSource, {
    familyId: rawEvent.familyId || rawEvent.family_id || "",
  });

  const colorId = resolveEventColorId(event, people, "family");
  const assignedLabel = getEventAssignedLabel(event, people, "Family");

  return {
    ...rawEvent,
    ...event,
    id: firestoreId || event.id,
    firestoreId: firestoreId || event.id,
    firestore_id: firestoreId || event.id,
    legacyEventId: legacyId,
    legacy_event_id: legacyId,
    colorId,
    color_id: colorId,
    eventColor: colorId,
    event_color: colorId,
    assignedLabel,
    assigned_label: assignedLabel,
  };
}

export function adaptFamilyEvents(rawEvents = [], people = []) {
  return Array.isArray(rawEvents)
    ? rawEvents.map((event) => adaptFamilyEvent(event, people))
    : [];
}

export function eventUsesCoreAssignment(event = {}) {
  return Array.isArray(event.assignedPersonIds) && event.assignedPersonIds.length > 0;
}

export function getFamilyEventColorId(event = {}, people = []) {
  return resolveEventColorId(normalizeEvent(event), people, "family");
}

export function getFamilyEventAssignmentLabel(event = {}, people = []) {
  return getEventAssignedLabel(normalizeEvent(event), people, "Family");
}

export function isManualColorEvent(event = {}) {
  return (event.colorMode || event.color_mode) === EVENT_COLOR_MODES.MANUAL;
}
