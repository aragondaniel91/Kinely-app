import { normalizeColorId } from "@/lib/appColorUtils";

export const PERSON_TYPES = {
  ADULT: "adult",
  CHILD: "child",
  GROUP: "group",
};

export const PERSON_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
  CHILD: "child",
};

export const PERSON_RELATIONSHIPS = {
  FATHER: "father",
  MOTHER: "mother",
  CO_PARENT: "co_parent",
  GRANDMOTHER: "grandmother",
  GRANDFATHER: "grandfather",
  BABYSITTER: "babysitter",
  CAREGIVER: "caregiver",
  CHILD: "child",
  FAMILY_MEMBER: "family_member",
  GROUP: "group",
};

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeDisplayName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function slugify(value) {
  return normalizeDisplayName(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function nameFromEmail(email = "") {
  const localPart = String(email || "").split("@")[0] || "person";
  return localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Family member";
}

export function normalizeRelationship(value, fallback = PERSON_RELATIONSHIPS.FAMILY_MEMBER) {
  const relationship = String(value || "").trim().toLowerCase();

  if (relationship === "dad") return PERSON_RELATIONSHIPS.FATHER;
  if (relationship === "mom") return PERSON_RELATIONSHIPS.MOTHER;
  if (relationship === "parent") return fallback;
  if (relationship === "member") return PERSON_RELATIONSHIPS.FAMILY_MEMBER;

  return Object.values(PERSON_RELATIONSHIPS).includes(relationship) ? relationship : fallback;
}

export function normalizeRole(value, fallback = PERSON_ROLES.VIEWER) {
  const role = String(value || "").trim().toLowerCase();

  if (!role) return fallback;
  if (["dad", "mom", "parent"].includes(role)) return PERSON_ROLES.ADMIN;
  if (["member", "family"].includes(role)) return PERSON_ROLES.VIEWER;

  return Object.values(PERSON_ROLES).includes(role) ? role : fallback;
}

export function buildPersonId({ familyId = "family", type = PERSON_TYPES.ADULT, uid = "", email = "", displayName = "", legacyId = "" } = {}) {
  if (legacyId) return String(legacyId);
  if (uid) return `user_${uid}`;
  if (email) return `email_${slugify(email)}`;
  return `${type}_${slugify(displayName) || "person"}_${familyId}`;
}

export function normalizePerson(raw = {}, context = {}) {
  const familyId = context.familyId || raw.familyId || raw.family_id || "family";
  const email = normalizeEmail(raw.email || raw.emailAddress || raw.email_address || raw.memberEmail || raw.member_email);
  const displayName = normalizeDisplayName(
    raw.displayName ||
      raw.display_name ||
      raw.fullName ||
      raw.full_name ||
      [raw.firstName || raw.first_name, raw.lastName || raw.last_name].filter(Boolean).join(" ") ||
      raw.name ||
      raw.childName ||
      raw.child_name ||
      (email ? nameFromEmail(email) : "Family member")
  );

  const type = raw.type || raw.personType || raw.person_type || context.type || PERSON_TYPES.ADULT;
  const role = normalizeRole(raw.appRole || raw.app_role || raw.role, type === PERSON_TYPES.CHILD ? PERSON_ROLES.CHILD : context.role || PERSON_ROLES.VIEWER);
  const relationship = normalizeRelationship(
    raw.relationship || raw.memberRelationship || raw.member_relationship || raw.parentRelationship || raw.parent_relationship || raw.role,
    type === PERSON_TYPES.CHILD ? PERSON_RELATIONSHIPS.CHILD : context.relationship || PERSON_RELATIONSHIPS.FAMILY_MEMBER
  );
  const colorId = normalizeColorId(raw.colorId || raw.color_id || raw.color || raw.familyColor || raw.family_color || raw.calendarColor || raw.calendar_color || context.colorId || "teal");

  return {
    id: buildPersonId({
      familyId,
      type,
      uid: raw.uid || raw.userId || raw.user_id || "",
      email,
      displayName,
      legacyId: raw.personId || raw.person_id || raw.id || raw.childId || raw.child_id || "",
    }),
    uid: raw.uid || raw.userId || raw.user_id || null,
    email,
    firstName: raw.firstName || raw.first_name || "",
    lastName: raw.lastName || raw.last_name || "",
    displayName,
    name: displayName,
    label: displayName,
    type,
    role,
    relationship,
    colorId,
    color: colorId,
    permissions: raw.permissions || context.permissions || null,
    status: raw.status || "active",
    source: raw.source || context.source || "normalized",
    raw,
  };
}

function sourcePriority(person = {}) {
  if (person.source === "parent1") return 100;
  if (person.source === "parent2") return 90;
  if (person.source === "children") return 80;
  if (person.source === "members") return 40;
  if (person.source === "memberEmails") return 10;
  return 20;
}

export function dedupePeople(people = []) {
  const byKey = new Map();
  const order = [];

  people.forEach((person) => {
    const keys = [
      person.uid ? `uid:${person.uid}` : "",
      person.email ? `email:${normalizeEmail(person.email)}` : "",
      person.id ? `id:${person.id}` : "",
    ].filter(Boolean);

    if (!keys.length) return;

    const existingKey = keys.find((key) => byKey.has(key));
    if (existingKey) {
      const existing = byKey.get(existingKey);
      const chosen = sourcePriority(person) >= sourcePriority(existing) ? { ...existing, ...person } : { ...person, ...existing };
      keys.forEach((key) => byKey.set(key, chosen));
      return;
    }

    keys.forEach((key) => byKey.set(key, person));
    order.push(keys[0]);
  });

  const seen = new Set();
  return order
    .map((key) => byKey.get(key))
    .filter((person) => {
      const stableKey = person.uid || person.email || person.id;
      if (!stableKey || seen.has(stableKey)) return false;
      seen.add(stableKey);
      return true;
    });
}

export function buildFamilyPeople(profile = {}, currentUser = null) {
  const familyId = profile.id || profile.familyId || profile.family_id || "family";
  const people = [];

  const ownerEmail = normalizeEmail(profile.ownerEmail || profile.owner_email || profile.parent1Email || profile.parent1_email || currentUser?.email);
  const parent1Relationship = normalizeRelationship(profile.parent1Relationship || profile.parent1_relationship || profile.parent1Role || profile.parent1_role, PERSON_RELATIONSHIPS.FATHER);
  const parent2Relationship = normalizeRelationship(profile.parent2Relationship || profile.parent2_relationship || profile.parent2Role || profile.parent2_role, PERSON_RELATIONSHIPS.MOTHER);

  people.push(
    normalizePerson(
      {
        personId: profile.parent1PersonId || profile.parent1_person_id || profile.ownerUid || profile.ownerId || profile.owner_id || currentUser?.uid || ownerEmail || "parent1",
        uid: profile.ownerUid || profile.owner_uid || profile.ownerId || profile.owner_id || currentUser?.uid || null,
        email: ownerEmail,
        displayName: profile.parent1Name || profile.parent1_name || profile.ownerName || profile.owner_name || currentUser?.displayName || currentUser?.name || nameFromEmail(ownerEmail),
        type: PERSON_TYPES.ADULT,
        role: PERSON_ROLES.OWNER,
        relationship: parent1Relationship,
        colorId: profile.parent1Color || profile.parent1_color || "blue",
        source: "parent1",
      },
      { familyId, source: "parent1", colorId: "blue" }
    )
  );

  const parent2Email = normalizeEmail(profile.parent2Email || profile.parent2_email);
  if (profile.parent2Name || profile.parent2_name || parent2Email) {
    people.push(
      normalizePerson(
        {
          personId: profile.parent2PersonId || profile.parent2_person_id || parent2Email || "parent2",
          email: parent2Email,
          displayName: profile.parent2Name || profile.parent2_name || nameFromEmail(parent2Email),
          type: PERSON_TYPES.ADULT,
          role: PERSON_ROLES.ADMIN,
          relationship: parent2Relationship,
          colorId: profile.parent2Color || profile.parent2_color || "amber",
          source: "parent2",
        },
        { familyId, source: "parent2", colorId: "amber" }
      )
    );
  }

  (profile.children || []).forEach((child, index) => {
    const displayName = normalizeDisplayName(child.displayName || child.display_name || child.name || child.childName || child.child_name || `Child ${index + 1}`);
    people.push(
      normalizePerson(
        {
          ...child,
          personId: child.personId || child.person_id || child.id || child.childId || child.child_id || `child_${slugify(displayName)}`,
          displayName,
          type: PERSON_TYPES.CHILD,
          role: PERSON_ROLES.CHILD,
          relationship: PERSON_RELATIONSHIPS.CHILD,
          colorId: child.colorId || child.color_id || child.color || child.familyColor || child.family_color || "green",
          source: "children",
        },
        { familyId, source: "children", type: PERSON_TYPES.CHILD, role: PERSON_ROLES.CHILD, relationship: PERSON_RELATIONSHIPS.CHILD, colorId: "green" }
      )
    );
  });

  (profile.members || []).forEach((member, index) => {
    people.push(
      normalizePerson(
        {
          ...member,
          personId: member.personId || member.person_id || member.id || member.uid || member.email || `member_${index + 1}`,
          type: PERSON_TYPES.ADULT,
          source: "members",
        },
        { familyId, source: "members", colorId: "teal" }
      )
    );
  });

  return dedupePeople(people);
}

export function buildPeopleMap(people = []) {
  const byId = new Map();
  people.forEach((person) => {
    if (person.id) byId.set(person.id, person);
  });
  return byId;
}

export function getPersonById(people = [], personId = "") {
  if (!personId) return null;
  return people.find((person) => person.id === personId) || null;
}

// -----------------------------------------------------------------------------
// Production identity resolution
// -----------------------------------------------------------------------------
// Display names are labels only. Production logic should resolve records through
// stable IDs first, then legacy fallbacks while old data is being backfilled.

export function normalizeIdentityToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w@.\-\s]/g, "")
    .replace(/\s+/g, " ");
}

export function firstNameToken(value) {
  return normalizeIdentityToken(value).split(" ")[0] || "";
}

export function getPersonIdentityTokens(person = {}) {
  const tokens = [
    person.id,
    person.personId,
    person.person_id,
    person.uid,
    person.userId,
    person.user_id,
    person.memberId,
    person.member_id,
    person.email,
    person.displayName,
    person.display_name,
    person.fullName,
    person.full_name,
    person.name,
    person.firstName,
    person.first_name,
    ...(Array.isArray(person.aliases) ? person.aliases : []),
  ]
    .filter(Boolean)
    .map(normalizeIdentityToken)
    .filter(Boolean);

  const type = normalizeIdentityToken(person.type || person.role || person.relationship);
  const first = firstNameToken(person.displayName || person.name || person.fullName || person.email);

  // Adult first-name alias is only a legacy bridge.
  // Stable IDs still win first.
  if (first && !["child", "kid", "son", "daughter"].includes(type)) {
    tokens.push(`adult-first:${first}`);
  }

  return Array.from(new Set(tokens));
}

function collectIdentityValues(value, output = []) {
  if (!value) return output;

  if (Array.isArray(value)) {
    value.forEach((entry) => collectIdentityValues(entry, output));
    return output;
  }

  if (typeof value === "object") {
    [
      value.id,
      value.personId,
      value.person_id,
      value.uid,
      value.userId,
      value.user_id,
      value.memberId,
      value.member_id,
      value.childId,
      value.child_id,
      value.email,
      value.name,
      value.displayName,
      value.display_name,
      value.fullName,
      value.full_name,
      value.firstName,
      value.first_name,
      value.label,
      value.title,
    ].forEach((entry) => collectIdentityValues(entry, output));

    return output;
  }

  output.push(value);
  return output;
}

export function getRecordIdentityTokens(record = {}) {
  const rawFields = [
    record.assignedToPersonId,
    record.assigned_to_person_id,
    record.assignedPersonId,
    record.assigned_person_id,
    record.assignedPersonIds,
    record.assigned_person_ids,
    record.assignedToPersonIds,
    record.assigned_to_person_ids,
    record.assignedPersonSnapshot,
    record.assigned_person_snapshot,
    record.assignedPersonSnapshots,
    record.assigned_person_snapshots,
    record.personSnapshot,
    record.person_snapshot,
    record.personId,
    record.person_id,
    record.personIds,
    record.person_ids,

    record.assignedTo,
    record.assigned_to,
    record.assignees,
    record.assignee,
    record.assigneeName,
    record.assignee_name,
    record.assignedToName,
    record.assigned_to_name,
    record.assignedToNames,
    record.assigned_to_names,

    record.owner,
    record.ownerName,
    record.owner_name,
    record.ownerId,
    record.owner_id,
    record.ownerUid,
    record.owner_uid,

    record.member,
    record.memberName,
    record.member_name,
    record.memberId,
    record.member_id,
    record.memberIds,
    record.member_ids,

    record.child,
    record.childName,
    record.child_name,
    record.childId,
    record.child_id,
    record.childIds,
    record.child_ids,

    record.createdBy,
    record.created_by,
    record.createdByName,
    record.created_by_name,
    record.createdByUid,
    record.created_by_uid,
    record.createdByEmail,
    record.created_by_email,

    record.actor,
    record.actorName,
    record.actor_name,
    record.actorEmail,
    record.actor_email,
    record.actorUid,
    record.actor_uid,

    record.attendees,
    record.participants,
    record.people,
    record.members,
    record.familyMembers,
    record.guests,
    record.invitees,
  ];

  const values = [];
  rawFields.forEach((field) => collectIdentityValues(field, values));

  const tokens = values
    .filter(Boolean)
    .map(normalizeIdentityToken)
    .filter(Boolean);

  values.forEach((value) => {
    const first = firstNameToken(value);
    if (first) tokens.push(`adult-first:${first}`);
  });

  return Array.from(new Set(tokens));
}

export function samePerson(a = {}, b = {}) {
  const aTokens = getPersonIdentityTokens(a);
  const bTokens = getPersonIdentityTokens(b);

  if (!aTokens.length || !bTokens.length) return false;

  return aTokens.some((token) => bTokens.includes(token));
}

export function resolvePersonFromRecord(record = {}, people = []) {
  if (!record || !people.length) return null;

  const recordTokens = getRecordIdentityTokens(record);
  if (!recordTokens.length) return null;

  return (
    people.find((person) => {
      const personTokens = getPersonIdentityTokens(person);
      return personTokens.some((token) => recordTokens.includes(token));
    }) || null
  );
}

export function buildAssignmentFields(person = null) {
  if (!person) {
    return {
      assignedToPersonId: "family",
      assigned_to_person_id: "family",
      assignedToPersonName: "Family",
      assigned_to_person_name: "Family",
      assignedTo: "Family",
      assigned_to: "Family",
    };
  }

  const id = person.id || person.personId || person.person_id || person.uid || person.email || "family";
  const name = person.displayName || person.name || person.fullName || person.email || "Family";
  const colorId = person.colorId || person.color_id || person.color || "blue";

  return {
    assignedToPersonId: id,
    assigned_to_person_id: id,
    assignedToPersonName: name,
    assigned_to_person_name: name,
    assignedToPersonColorId: colorId,
    assigned_to_person_color_id: colorId,
    assignedTo: name,
    assigned_to: name,
    assignedToName: name,
    assigned_to_name: name,
  };
}


export function getRecordColorId(record = "") {
  return normalizeColorId(
    record?.colorId ||
      record?.color_id ||
      record?.eventColor ||
      record?.event_color ||
      record?.calendarColor ||
      record?.calendar_color ||
      record?.personColor ||
      record?.person_color ||
      "",
    ""
  );
}

export function resolveEventPersonFromRecord(record = {}, people = []) {
  if (!record || !people.length) return null;

  // Production rule:
  // Event creator is NOT the assigned person.
  // Do not use createdBy / createdByEmail / actor fields for "Today by person".

  const explicitEventRecord = {
    assignedToPersonId: record.assignedToPersonId || record.assigned_to_person_id,
    assignedPersonId: record.assignedPersonId || record.assigned_person_id,
    assignedPersonIds: record.assignedPersonIds || record.assigned_person_ids,
    assignedToPersonIds: record.assignedToPersonIds || record.assigned_to_person_ids,

    assignedToPersonName: record.assignedToPersonName || record.assigned_to_person_name,
    assignedPersonName: record.assignedPersonName || record.assigned_person_name,
    assignedPersonNames: record.assignedPersonNames || record.assigned_person_names,

    personId: record.personId || record.person_id,
    personIds: record.personIds || record.person_ids,
    personName: record.personName || record.person_name,

    assignedPersonSnapshot: record.assignedPersonSnapshot || record.assigned_person_snapshot,
    assignedPersonSnapshots: record.assignedPersonSnapshots || record.assigned_person_snapshots,
    personSnapshot: record.personSnapshot || record.person_snapshot,
  };

  const resolved = resolveAssignedPersonFromRecord(explicitEventRecord, people);
  if (resolved) return resolved;

  // Color is a visual fallback only. Use it only when it uniquely matches one person.
  // If multiple people share the color, or the event has no explicit assignment,
  // do not force it under Daniel or any other creator.
  const recordColorId = getRecordColorId(record);
  if (!recordColorId) return null;

  const colorMatches = people.filter((person) => {
    const personColorId = normalizeColorId(
      person.colorId ||
        person.color_id ||
        person.color ||
        person.familyColor ||
        person.family_color ||
        person.calendarColor ||
        person.calendar_color ||
        "",
      ""
    );

    return personColorId && personColorId === recordColorId;
  });

  return colorMatches.length === 1 ? colorMatches[0] : null;
}

// -----------------------------------------------------------------------------
// Assignment-only identity resolution
// -----------------------------------------------------------------------------
// Used for tasks/lists/meals where createdBy is not the assignee.
// This prevents "Mary's task created by Daniel" from counting under Daniel.

export function getAssignmentIdentityTokens(record = {}) {
  const rawFields = [
    record.assignedToPersonId,
    record.assigned_to_person_id,
    record.assignedPersonId,
    record.assigned_person_id,
    record.assignedPersonIds,
    record.assigned_person_ids,
    record.assignedToPersonIds,
    record.assigned_to_person_ids,

    record.assignedToPersonName,
    record.assigned_to_person_name,
    record.assignedPersonName,
    record.assigned_person_name,
    record.assignedPersonNames,
    record.assigned_person_names,

    record.assignedTo,
    record.assigned_to,
    record.assignee,
    record.assignees,
    record.assigneeName,
    record.assignee_name,
    record.assignedToName,
    record.assigned_to_name,
    record.assignedToNames,
    record.assigned_to_names,

    record.owner,
    record.ownerName,
    record.owner_name,
    record.ownerId,
    record.owner_id,
    record.ownerUid,
    record.owner_uid,

    record.personId,
    record.person_id,
    record.personIds,
    record.person_ids,
    record.personName,
    record.person_name,

    record.memberId,
    record.member_id,
    record.memberIds,
    record.member_ids,
    record.memberName,
    record.member_name,

    record.childId,
    record.child_id,
    record.childIds,
    record.child_ids,
    record.childName,
    record.child_name,
  ];

  const values = [];
  rawFields.forEach((field) => collectIdentityValues(field, values));

  const tokens = values
    .filter(Boolean)
    .map(normalizeIdentityToken)
    .filter(Boolean);

  values.forEach((value) => {
    const first = firstNameToken(value);
    if (first) tokens.push(`adult-first:${first}`);
  });

  return Array.from(new Set(tokens));
}

export function resolveAssignedPersonFromRecord(record = {}, people = []) {
  if (!record || !people.length) return null;

  const recordTokens = getAssignmentIdentityTokens(record);
  if (!recordTokens.length) return null;

  return (
    people.find((person) => {
      const personTokens = getPersonIdentityTokens(person);
      return personTokens.some((token) => recordTokens.includes(token));
    }) || null
  );
}

