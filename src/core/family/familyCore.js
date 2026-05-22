import { buildFamilyPeople, PERSON_TYPES } from "@/core/people/peopleCore";

export const FAMILY_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
};

export const FAMILY_TYPES = {
  HOUSEHOLD: "household",
};

export function normalizeFamily(raw = {}, currentUser = null) {
  const id = raw.id || raw.familyId || raw.family_id || "";
  const name = raw.name || raw.familyName || raw.family_name || `${currentUser?.displayName || "My"} Family`;

  return {
    id,
    familyId: id,
    name,
    familyName: name,
    type: raw.type || FAMILY_TYPES.HOUSEHOLD,
    status: raw.status || FAMILY_STATUS.ACTIVE,

    ownerUid: raw.ownerUid || raw.owner_uid || raw.ownerId || raw.owner_id || raw.createdBy || raw.created_by || currentUser?.uid || null,
    ownerEmail: raw.ownerEmail || raw.owner_email || raw.createdByEmail || raw.created_by_email || currentUser?.email || "",

    settings: {
      language: raw.settings?.language || raw.language || "en",
      timezone: raw.settings?.timezone || raw.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
      defaultCalendarView: raw.settings?.defaultCalendarView || raw.defaultCalendarView || raw.default_calendar_view || "month",
      ...raw.settings,
    },

    createdAt: raw.createdAt || raw.created_at || null,
    updatedAt: raw.updatedAt || raw.updated_at || null,

    legacy: raw,
  };
}

export function buildFamilyModel(rawProfile = {}, currentUser = null) {
  const family = normalizeFamily(rawProfile, currentUser);
  const people = buildFamilyPeople({ ...rawProfile, id: family.id }, currentUser);
  const adults = people.filter((person) => person.type === PERSON_TYPES.ADULT);
  const children = people.filter((person) => person.type === PERSON_TYPES.CHILD);

  return {
    family,
    people,
    adults,
    children,
    owner: people.find((person) => person.role === "owner") || adults[0] || null,
  };
}

export function serializeFamilyForFirestore(familyModel = {}) {
  const family = familyModel.family || familyModel;

  return {
    familyName: family.name || family.familyName || "My Family",
    family_name: family.name || family.familyName || "My Family",
    type: family.type || FAMILY_TYPES.HOUSEHOLD,
    status: family.status || FAMILY_STATUS.ACTIVE,
    ownerUid: family.ownerUid || null,
    owner_uid: family.ownerUid || null,
    ownerEmail: family.ownerEmail || "",
    owner_email: family.ownerEmail || "",
    settings: family.settings || {},
  };
}

export function serializePeopleForFamilyLegacy(people = []) {
  const owner = people.find((person) => person.role === "owner") || people.find((person) => person.type === PERSON_TYPES.ADULT);
  const parent2 = people.find((person) => person.type === PERSON_TYPES.ADULT && person.id !== owner?.id);
  const children = people.filter((person) => person.type === PERSON_TYPES.CHILD);
  const members = people.filter((person) => person.type === PERSON_TYPES.ADULT && person.id !== owner?.id && person.id !== parent2?.id);

  return {
    parent1PersonId: owner?.id || "",
    parent1_person_id: owner?.id || "",
    parent1Name: owner?.displayName || "",
    parent1_name: owner?.displayName || "",
    parent1Email: owner?.email || "",
    parent1_email: owner?.email || "",
    parent1Relationship: owner?.relationship || "father",
    parent1_relationship: owner?.relationship || "father",
    parent1Role: owner?.relationship === "mother" ? "mom" : "dad",
    parent1_role: owner?.relationship === "mother" ? "mom" : "dad",
    parent1Color: owner?.colorId || "blue",
    parent1_color: owner?.colorId || "blue",

    parent2PersonId: parent2?.id || "",
    parent2_person_id: parent2?.id || "",
    parent2Name: parent2?.displayName || "",
    parent2_name: parent2?.displayName || "",
    parent2Email: parent2?.email || "",
    parent2_email: parent2?.email || "",
    parent2Relationship: parent2?.relationship || "mother",
    parent2_relationship: parent2?.relationship || "mother",
    parent2Role: parent2?.relationship === "father" ? "dad" : "mom",
    parent2_role: parent2?.relationship === "father" ? "dad" : "mom",
    parent2Color: parent2?.colorId || "amber",
    parent2_color: parent2?.colorId || "amber",

    children: children.map((person) => ({
      personId: person.id,
      person_id: person.id,
      id: person.id,
      childId: person.id,
      child_id: person.id,
      name: person.displayName,
      childName: person.displayName,
      child_name: person.displayName,
      displayName: person.displayName,
      display_name: person.displayName,
      colorId: person.colorId,
      color_id: person.colorId,
      color: person.colorId,
      relationship: person.relationship,
      role: person.role,
      type: person.type,
    })),

    members: members.map((person) => ({
      personId: person.id,
      person_id: person.id,
      uid: person.uid || null,
      email: person.email || "",
      name: person.displayName,
      displayName: person.displayName,
      display_name: person.displayName,
      colorId: person.colorId,
      color_id: person.colorId,
      color: person.colorId,
      role: person.role,
      relationship: person.relationship,
      permissions: person.permissions || null,
      status: person.status || "active",
    })),

    memberEmails: people.map((person) => person.email).filter(Boolean),
    member_emails: people.map((person) => person.email).filter(Boolean),
  };
}

export function buildFamilyFirestorePayload(familyModel = {}) {
  return {
    ...serializeFamilyForFirestore(familyModel),
    ...serializePeopleForFamilyLegacy(familyModel.people || []),
  };
}
