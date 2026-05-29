import { normalizeColorId } from "@/lib/appColorUtils";
import { getPersonById, slugify } from "@/core/people/peopleCore";

export const EVENT_SCOPES = {
  FAMILY: "family",
  CUSTODY: "custody",
};

export const EVENT_COLOR_MODES = {
  PERSON: "person",
  MANUAL: "manual",
  FAMILY: "family",
};

export const EVENT_VISIBILITY_TYPES = {
  PRIVATE: "private",
  FAMILY: "family",
  SELECTED: "selected",
  CUSTODY_GROUP: "custody_group",
};

export const EVENT_NOTIFICATION_TARGETS = {
  NONE: "none",
  VISIBLE_PEOPLE: "visible_people",
  SELECTED: "selected",
};

export function makeEventId({ title = "event", date = "", createdAt = Date.now() } = {}) {
  return `event_${slugify(title) || "item"}_${date || createdAt}`;
}

export function normalizeAssignedPersonIds(value = []) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function resolveDefaultColorMode(raw = {}, assignedPersonIds = []) {
  if (raw.colorMode || raw.color_mode) return raw.colorMode || raw.color_mode;
  if (raw.colorId || raw.color_id || raw.eventColor || raw.event_color || raw.color) return EVENT_COLOR_MODES.MANUAL;
  if (!assignedPersonIds.length) return EVENT_COLOR_MODES.FAMILY;
  return EVENT_COLOR_MODES.PERSON;
}

export function normalizeEvent(raw = {}, context = {}) {
  const scope = raw.scope || raw.module || context.scope || EVENT_SCOPES.FAMILY;
  const assignedPersonIds = normalizeAssignedPersonIds(raw.assignedPersonIds || raw.assigned_person_ids || raw.assignedPersonId || raw.assigned_person_id);
  const colorMode = resolveDefaultColorMode(raw, assignedPersonIds);
  const colorId = raw.colorId || raw.color_id || raw.eventColor || raw.event_color || raw.color || "";

  return {
    id: raw.id || raw.eventId || raw.event_id || makeEventId(raw),
    scope,
    familyId: raw.familyId || raw.family_id || context.familyId || "",
    custodyGroupId: raw.custodyGroupId || raw.custody_group_id || context.custodyGroupId || "",

    title: raw.title || "Untitled event",
    description: raw.description || raw.notes || "",
    notes: raw.notes || raw.description || "",

    date: raw.date || "",
    isAllDay: Boolean(raw.isAllDay) || Boolean(raw.is_all_day) || (!raw.startTime && !raw.start_time && !raw.endTime && !raw.end_time),
    startTime: raw.startTime || raw.start_time || "",
    endTime: raw.endTime || raw.end_time || "",

    category: raw.category || "other",
    location: raw.location || "",

    assignedPersonIds,
    assigned_person_ids: assignedPersonIds,

    colorMode,
    color_mode: colorMode,
    colorId: colorId ? normalizeColorId(colorId) : null,
    color_id: colorId ? normalizeColorId(colorId) : null,

    visibility: raw.visibility || {
      type: scope === EVENT_SCOPES.CUSTODY ? EVENT_VISIBILITY_TYPES.CUSTODY_GROUP : EVENT_VISIBILITY_TYPES.FAMILY,
      personIds: [],
    },
    notifications: raw.notifications || {
      target: EVENT_NOTIFICATION_TARGETS.NONE,
      personIds: [],
    },

    createdByUid: raw.createdByUid || raw.created_by_uid || raw.createdBy || raw.created_by || context.createdByUid || null,
    createdByEmail: raw.createdByEmail || raw.created_by_email || context.createdByEmail || null,
    createdAt: raw.createdAt || raw.created_at || null,
    updatedAt: raw.updatedAt || raw.updated_at || null,

    legacy: raw.legacy || null,
    raw,
  };
}

export function resolveEventColorId(event = {}, people = [], fallback = "family") {
  const normalized = normalizeEvent(event);

  if (normalized.colorMode === EVENT_COLOR_MODES.MANUAL && normalized.colorId) {
    return normalizeColorId(normalized.colorId, fallback);
  }

  if (normalized.colorMode === EVENT_COLOR_MODES.FAMILY || !normalized.assignedPersonIds.length) {
    return "family";
  }

  const primaryPersonId = normalized.assignedPersonIds[0];
  if (primaryPersonId) {
    const person = getPersonById(people, primaryPersonId);
    if (person?.colorId) return normalizeColorId(person.colorId, fallback);
  }

  return fallback;
}

export function buildEventAssignmentPayload(personId = "", people = []) {
  const assignedPersonIds = normalizeAssignedPersonIds(personId);
  const person = assignedPersonIds[0] ? getPersonById(people, assignedPersonIds[0]) : null;

  return {
    assignedPersonIds,
    assigned_person_ids: assignedPersonIds,
    assignedPersonSnapshot: person
      ? {
          id: person.id,
          displayName: person.displayName,
          type: person.type,
          relationship: person.relationship,
          colorId: person.colorId,
        }
      : null,
    assigned_person_snapshot: person
      ? {
          id: person.id,
          displayName: person.displayName,
          type: person.type,
          relationship: person.relationship,
          colorId: person.colorId,
        }
      : null,
  };
}

export function buildFamilyEventPayload(input = {}, context = {}) {
  const people = context.people || [];
  const requestedAssignments = normalizeAssignedPersonIds(
    input.assignedPersonIds || input.assigned_person_ids || input.assignedPersonId || input.assigned_person_id
  );
  const assignment = buildEventAssignmentPayload(requestedAssignments, people);
  const colorMode = input.colorMode || (assignment.assignedPersonIds.length ? EVENT_COLOR_MODES.PERSON : EVENT_COLOR_MODES.FAMILY);
  const event = normalizeEvent(
    {
      ...input,
      ...assignment,
      scope: EVENT_SCOPES.FAMILY,
      module: EVENT_SCOPES.FAMILY,
      familyId: context.familyId || input.familyId,
      colorMode,
      colorId: colorMode === EVENT_COLOR_MODES.MANUAL ? input.colorId : null,
      visibility: input.visibility || {
        type: EVENT_VISIBILITY_TYPES.FAMILY,
        personIds: [],
      },
      notifications: input.notifications || {
        target: EVENT_NOTIFICATION_TARGETS.NONE,
        personIds: [],
      },
    },
    context
  );

  return {
    ...event,
    module: EVENT_SCOPES.FAMILY,
    eventSchemaVersion: 2,
    event_schema_version: 2,
  };
}

export function getEventAssignedPerson(event = {}, people = []) {
  const normalized = normalizeEvent(event);
  return normalized.assignedPersonIds[0] ? getPersonById(people, normalized.assignedPersonIds[0]) : null;
}

export function getEventAssignedLabel(event = {}, people = [], fallback = "Family") {
  const person = getEventAssignedPerson(event, people);
  return person?.displayName || event.assignedPersonSnapshot?.displayName || event.assigned_person_snapshot?.displayName || fallback;
}
