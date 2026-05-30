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
  PARENT: "parent",
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
  if (relationship === "parent") return PERSON_RELATIONSHIPS.PARENT;
  if (relationship === "member") return PERSON_RELATIONSHIPS.FAMILY_MEMBER;

  return Object.values(PERSON_RELATIONSHIPS).includes(relationship) ? relationship : fallback;
}

export function normalizeRole(value, fallback = PERSON_ROLES.VIEWER) {
  const role = String(value || "").trim().toLowerCase();

  if (!role) return fallback;
  if (["dad", "mom", "parent"].includes(role)) return fallback;
  if (["member", "family"].includes(role)) return PERSON_ROLES.VIEWER;

  return Object.values(PERSON_ROLES).includes(role) ? role : fallback;
}

function booleanOrFalse(value) {
  return value === true;
}

function booleanOrDefault(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
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
  const livesHere = booleanOrFalse(raw.livesHere ?? raw.lives_here ?? raw.household ?? raw.isHousehold ?? raw.is_household);
  const showOnHomeDashboard = booleanOrFalse(
    raw.showOnHomeDashboard ??
      raw.show_on_home_dashboard ??
      raw.homeDashboard ??
      raw.home_dashboard ??
      livesHere
  );

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
    modules: raw.modules || raw.modulePermissions || raw.module_permissions || context.modules || null,
    permissions: raw.permissions || context.permissions || null,
    livesHere,
    lives_here: livesHere,
    showOnHomeDashboard,
    show_on_home_dashboard: showOnHomeDashboard,
    household: livesHere,
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

function hasObjectValues(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function mergePersonRecords(existing = {}, incoming = {}) {
  const incomingWins = sourcePriority(incoming) >= sourcePriority(existing);
  const lowerPriority = incomingWins ? existing : incoming;
  const higherPriority = incomingWins ? incoming : existing;
  const merged = {
    ...lowerPriority,
    ...higherPriority,
  };

  if (!hasObjectValues(merged.modules)) {
    merged.modules = hasObjectValues(incoming.modules)
      ? incoming.modules
      : hasObjectValues(existing.modules)
      ? existing.modules
      : null;
  }

  if (!hasObjectValues(merged.permissions)) {
    merged.permissions = hasObjectValues(incoming.permissions)
      ? incoming.permissions
      : hasObjectValues(existing.permissions)
      ? existing.permissions
      : null;
  }

  merged.uid = merged.uid || incoming.uid || existing.uid || null;
  merged.status = merged.status || incoming.status || existing.status || "active";

  return merged;
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
      const chosen = mergePersonRecords(existing, person);
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
  const storedMembers = Array.isArray(profile.members) ? profile.members : [];

  const ownerEmail = normalizeEmail(profile.ownerEmail || profile.owner_email || profile.parent1Email || profile.parent1_email || currentUser?.email);
  const parent2Email = normalizeEmail(profile.parent2Email || profile.parent2_email);

  function findStoredMember({ email = "", personId = "" } = {}) {
    const cleanEmail = normalizeEmail(email);
    return storedMembers.find((member) => {
      const memberEmail = normalizeEmail(member.email);
      const memberPersonId = member.personId || member.person_id || member.id || "";
      return (
        (cleanEmail && memberEmail === cleanEmail) ||
        (personId && memberPersonId === personId)
      );
    });
  }

  const parent2PersonId = profile.parent2PersonId || profile.parent2_person_id || parent2Email || "parent2";
  const storedParent2 = findStoredMember({
    email: parent2Email,
    personId: parent2PersonId,
  });
  const parent1Relationship = normalizeRelationship(profile.parent1Relationship || profile.parent1_relationship || profile.parent1Role || profile.parent1_role, PERSON_RELATIONSHIPS.PARENT);
  const parent2Relationship = normalizeRelationship(profile.parent2Relationship || profile.parent2_relationship || profile.parent2Role || profile.parent2_role || storedParent2?.role, PERSON_RELATIONSHIPS.PARENT);
  const parent2DefaultLivesHere = [
    PERSON_RELATIONSHIPS.FATHER,
    PERSON_RELATIONSHIPS.MOTHER,
    PERSON_RELATIONSHIPS.PARENT,
  ].includes(parent2Relationship);
  const parent1LivesHere = booleanOrDefault(profile.parent1LivesHere ?? profile.parent1_lives_here, true);
  const parent1ShowOnHomeDashboard = booleanOrDefault(
    profile.parent1ShowOnHomeDashboard ?? profile.parent1_show_on_home_dashboard,
    true
  );
  const parent2LivesHere = booleanOrDefault(
    profile.parent2LivesHere ??
      profile.parent2_lives_here ??
      storedParent2?.livesHere ??
      storedParent2?.lives_here,
    parent2DefaultLivesHere
  );
  const parent2ShowOnHomeDashboard = booleanOrDefault(
    profile.parent2ShowOnHomeDashboard ??
      profile.parent2_show_on_home_dashboard ??
      storedParent2?.showOnHomeDashboard ??
      storedParent2?.show_on_home_dashboard ??
      storedParent2?.homeDashboard ??
      storedParent2?.home_dashboard,
    parent2LivesHere
  );

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
        livesHere: parent1LivesHere,
        showOnHomeDashboard: parent1ShowOnHomeDashboard,
        source: "parent1",
      },
      { familyId, source: "parent1", colorId: "blue" }
    )
  );

  if (profile.parent2Name || profile.parent2_name || parent2Email) {
    people.push(
      normalizePerson(
        {
          personId: parent2PersonId,
          uid: storedParent2?.uid || storedParent2?.userId || storedParent2?.user_id || null,
          email: parent2Email,
          displayName: profile.parent2Name || profile.parent2_name || nameFromEmail(parent2Email),
          type: PERSON_TYPES.ADULT,
          role: profile.parent2AppRole || profile.parent2_app_role || storedParent2?.appRole || storedParent2?.app_role || storedParent2?.role || PERSON_ROLES.VIEWER,
          relationship: parent2Relationship,
          colorId: profile.parent2Color || profile.parent2_color || "amber",
          modules: storedParent2?.modules || storedParent2?.modulePermissions || storedParent2?.module_permissions || null,
          permissions: storedParent2?.permissions || null,
          livesHere: parent2LivesHere,
          showOnHomeDashboard: parent2ShowOnHomeDashboard,
          status: storedParent2?.status || storedParent2?.invitationStatus || storedParent2?.invitation_status || "active",
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
          livesHere: booleanOrDefault(child.livesHere ?? child.lives_here, true),
          showOnHomeDashboard: booleanOrDefault(
            child.showOnHomeDashboard ?? child.show_on_home_dashboard,
            true
          ),
          source: "children",
        },
        { familyId, source: "children", type: PERSON_TYPES.CHILD, role: PERSON_ROLES.CHILD, relationship: PERSON_RELATIONSHIPS.CHILD, colorId: "green" }
      )
    );
  });

  storedMembers.forEach((member, index) => {
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

export function getPersonStableIdentityTokens(person = {}) {
  return [
    person.id,
    person.personId,
    person.person_id,
    person.uid,
    person.userId,
    person.user_id,
    person.memberId,
    person.member_id,
    person.childId,
    person.child_id,
    person.email,
  ]
    .filter(Boolean)
    .map(normalizeIdentityToken)
    .filter(Boolean);
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

function collectStableAssignmentValues(value, output = []) {
  if (!value) return output;

  if (Array.isArray(value)) {
    value.forEach((entry) => collectStableAssignmentValues(entry, output));
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
    ].forEach((entry) => collectStableAssignmentValues(entry, output));

    return output;
  }

  output.push(value);
  return output;
}

export function getExplicitAssignmentIdentityTokens(record = {}) {
  const rawFields = [
    record.assignedToPersonId,
    record.assigned_to_person_id,
    record.assignedPersonId,
    record.assigned_person_id,
    record.assignedPersonIds,
    record.assigned_person_ids,
    record.assignedToPersonIds,
    record.assigned_to_person_ids,
    record.personId,
    record.person_id,
    record.personIds,
    record.person_ids,
    record.assignedPersonSnapshot,
    record.assigned_person_snapshot,
    record.assignedPersonSnapshots,
    record.assigned_person_snapshots,
    record.personSnapshot,
    record.person_snapshot,
  ];

  const values = [];
  rawFields.forEach((field) => collectStableAssignmentValues(field, values));

  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map(normalizeIdentityToken)
        .filter(Boolean)
    )
  );
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

  const recordTokens = getExplicitAssignmentIdentityTokens(record);
  if (!recordTokens.length) return null;

  return (
    people.find((person) => {
      const personTokens = getPersonStableIdentityTokens(person);
      return personTokens.some((token) => recordTokens.includes(token));
    }) || null
  );
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

