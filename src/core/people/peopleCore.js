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
