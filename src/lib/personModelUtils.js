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

export function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function slugify(value) {
  return normalizeName(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function nameFromEmail(email = "") {
  const localPart = String(email || "").split("@")[0] || "Family member";
  return localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Family member";
}

export function normalizeLegacyRelationship(value, fallback = PERSON_RELATIONSHIPS.FAMILY_MEMBER) {
  const relationship = String(value || "").trim().toLowerCase();

  if (relationship === "dad") return PERSON_RELATIONSHIPS.FATHER;
  if (relationship === "mom") return PERSON_RELATIONSHIPS.MOTHER;
  if (relationship === "parent") return fallback;
  if (relationship === "member") return PERSON_RELATIONSHIPS.FAMILY_MEMBER;

  if (Object.values(PERSON_RELATIONSHIPS).includes(relationship)) return relationship;

  return fallback;
}

export function normalizeLegacyRole(value, fallback = PERSON_ROLES.VIEWER) {
  const role = String(value || "").trim().toLowerCase();

  if (!role) return fallback;
  if (role === "dad" || role === "mom" || role === "parent") return PERSON_ROLES.ADMIN;
  if (role === "member" || role === "family") return PERSON_ROLES.VIEWER;
  if (Object.values(PERSON_ROLES).includes(role)) return role;

  return fallback;
}

export function personDisplayName(person = {}) {
  return normalizeName(
    person.displayName ||
      person.display_name ||
      person.fullName ||
      person.full_name ||
      [person.firstName || person.first_name, person.lastName || person.last_name].filter(Boolean).join(" ") ||
      person.name ||
      person.childName ||
      person.child_name ||
      person.email && nameFromEmail(person.email) ||
      "Family member"
  );
}

export function makePersonId({ familyId = "family", type = PERSON_TYPES.ADULT, uid = "", email = "", name = "", legacyId = "" } = {}) {
  if (legacyId) return String(legacyId);
  if (uid) return `user_${uid}`;
  if (email) return `email_${slugify(email)}`;
  return `${type}_${slugify(name) || "person"}_${familyId}`;
}

export function normalizePerson(raw = {}, context = {}) {
  const familyId = context.familyId || raw.familyId || raw.family_id || "family";
  const email = normalizeEmail(raw.email || raw.emailAddress || raw.email_address || raw.memberEmail || raw.member_email);
  const displayName = personDisplayName({ ...raw, email });
  const type = raw.type || raw.personType || raw.person_type || (raw.relationship === PERSON_RELATIONSHIPS.CHILD || raw.role === PERSON_ROLES.CHILD ? PERSON_TYPES.CHILD : PERSON_TYPES.ADULT);
  const relationship = normalizeLegacyRelationship(raw.relationship || raw.memberRelationship || raw.member_relationship || raw.parentRelationship || raw.role, type === PERSON_TYPES.CHILD ? PERSON_RELATIONSHIPS.CHILD : PERSON_RELATIONSHIPS.FAMILY_MEMBER);
  const role = normalizeLegacyRole(raw.appRole || raw.app_role || raw.role, type === PERSON_TYPES.CHILD ? PERSON_ROLES.CHILD : PERSON_ROLES.VIEWER);
  const colorId = normalizeColorId(raw.colorId || raw.color_id || raw.color || raw.familyColor || raw.family_color || raw.calendarColor || raw.calendar_color || context.defaultColor || "teal");

  return {
    id: makePersonId({
      familyId,
      type,
      uid: raw.uid || raw.userId || raw.user_id || "",
      email,
      name: displayName,
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

export function buildCanonicalFamilyPeople(profile = {}, currentUser = null, options = {}) {
  const familyId = profile.id || profile.familyId || profile.family_id || options.familyId || "family";
  const people = [];

  const ownerEmail = normalizeEmail(profile.ownerEmail || profile.owner_email || profile.parent1Email || profile.parent1_email || currentUser?.email);
  const parent1Relationship = normalizeLegacyRelationship(profile.parent1Relationship || profile.parent1_relationship || profile.parent1Role || profile.parent1_role, PERSON_RELATIONSHIPS.FATHER);
  const parent2Relationship = normalizeLegacyRelationship(profile.parent2Relationship || profile.parent2_relationship || profile.parent2Role || profile.parent2_role, PERSON_RELATIONSHIPS.MOTHER);

  people.push(
    normalizePerson(
      {
        id: profile.parent1PersonId || profile.parent1_person_id || profile.ownerUid || profile.ownerId || profile.owner_id || currentUser?.uid || ownerEmail || "parent1",
        uid: profile.ownerUid || profile.owner_uid || profile.ownerId || profile.owner_id || currentUser?.uid || null,
        email: ownerEmail,
        displayName: profile.parent1Name || profile.parent1_name || profile.ownerName || profile.owner_name || currentUser?.displayName || currentUser?.name || nameFromEmail(ownerEmail),
        type: PERSON_TYPES.ADULT,
        role: PERSON_ROLES.OWNER,
        relationship: parent1Relationship,
        colorId: profile.parent1Color || profile.parent1_color || "blue",
        source: "parent1",
      },
      { familyId, defaultColor: "blue", source: "parent1" }
    )
  );

  const parent2Email = normalizeEmail(profile.parent2Email || profile.parent2_email);
  if (profile.parent2Name || profile.parent2_name || parent2Email) {
    people.push(
      normalizePerson(
        {
          id: profile.parent2PersonId || profile.parent2_person_id || parent2Email || "parent2",
          email: parent2Email,
          displayName: profile.parent2Name || profile.parent2_name || nameFromEmail(parent2Email),
          type: PERSON_TYPES.ADULT,
          role: PERSON_ROLES.ADMIN,
          relationship: parent2Relationship,
          colorId: profile.parent2Color || profile.parent2_color || "amber",
          source: "parent2",
        },
        { familyId, defaultColor: "amber", source: "parent2" }
      )
    );
  }

  (profile.children || []).forEach((child, index) => {
    const displayName = personDisplayName(child) || `Child ${index + 1}`;
    people.push(
      normalizePerson(
        {
          ...child,
          id: child.personId || child.person_id || child.id || child.childId || child.child_id || `child_${slugify(displayName)}`,
          displayName,
          type: PERSON_TYPES.CHILD,
          role: PERSON_ROLES.CHILD,
          relationship: PERSON_RELATIONSHIPS.CHILD,
          colorId: child.colorId || child.color_id || child.color || child.familyColor || child.family_color || "green",
          source: "children",
        },
        { familyId, defaultColor: "green", source: "children" }
      )
    );
  });

  (profile.members || []).forEach((member, index) => {
    people.push(
      normalizePerson(
        {
          ...member,
          id: member.personId || member.person_id || member.id || member.uid || member.email || `member_${index + 1}`,
          type: PERSON_TYPES.ADULT,
          source: "members",
        },
        { familyId, defaultColor: "teal", source: "members" }
      )
    );
  });

  return dedupePeople(people);
}

export function dedupePeople(people = []) {
  const byKey = new Map();
  const order = [];

  function priority(person = {}) {
    if (person.source === "parent1") return 100;
    if (person.source === "parent2") return 90;
    if (person.source === "children") return 80;
    if (person.source === "members") return 40;
    return 10;
  }

  people.forEach((person) => {
    const keys = [
      person.uid ? `uid:${person.uid}` : "",
      person.email ? `email:${normalizeEmail(person.email)}` : "",
      person.id ? `id:${person.id}` : "",
      person.displayName ? `name:${slugify(person.displayName)}` : "",
    ].filter(Boolean);

    const existingKey = keys.find((key) => byKey.has(key));
    if (existingKey) {
      const existing = byKey.get(existingKey);
      const chosen = priority(person) > priority(existing) ? { ...existing, ...person } : { ...person, ...existing };
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
      const key = person.uid || person.email || person.id || slugify(person.displayName);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function getPersonById(people = [], personId = "") {
  return people.find((person) => person.id === personId || person.personId === personId || person.childId === personId || person.child_id === personId) || null;
}

export function getPersonColorId(people = [], personId = "", fallback = "family") {
  return getPersonById(people, personId)?.colorId || fallback;
}
