export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeNameKey(value) {
  return normalizeName(value).toLowerCase();
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

export function childName(child, index = 0) {
  if (!child) return `Child ${index + 1}`;
  if (typeof child === "string") return child;
  return child.name || child.childName || child.displayName || child.fullName || child.firstName || `Child ${index + 1}`;
}

export function normalizeChildPerson(child, index = 0) {
  const id = typeof child === "object" ? child.id || child.childId || child.child_id || `child-${index + 1}` : `child-${index + 1}`;
  const name = childName(child, index);
  const color = typeof child === "object" ? child.colorId || child.color || child.familyColor || child.family_color || "green" : "green";

  return {
    id,
    uid: null,
    email: "",
    name,
    label: name,
    role: "child",
    relationship: "child",
    type: "child",
    color,
    colorId: color,
    source: "children",
    locked: true,
  };
}

function resolveDisplayName(person = {}, email = "", fallback = "Family member") {
  return normalizeName(
    person.displayName ||
      person.display_name ||
      person.name ||
      person.fullName ||
      person.memberName ||
      person.label ||
      person.firstName ||
      person.first_name ||
      (email ? nameFromEmail(email) : fallback)
  );
}

function resolveRole(role, fallback = "member") {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return fallback;
  if (value === "member") return "family";
  if (["dad", "mom", "father", "mother"].includes(value)) return "admin";
  return value;
}

function resolveRelationship(person = {}, fallback = "family_member") {
  const value = String(person.relationship || person.memberRelationship || person.role || "").trim().toLowerCase();
  if (value === "dad") return "father";
  if (value === "mom") return "mother";
  if (["father", "mother", "co_parent", "grandmother", "grandfather", "babysitter", "caregiver", "child", "family_member"].includes(value)) return value;
  return fallback;
}

function makeAdultPerson({
  source,
  email,
  name,
  role,
  relationship,
  color,
  uid = null,
  admin = false,
  locked = false,
  raw = null,
}) {
  const normalizedEmail = normalizeEmail(email);
  const displayName = normalizeName(name) || (normalizedEmail ? nameFromEmail(normalizedEmail) : "Family member");
  const colorId = color || "teal";

  return {
    id: normalizedEmail || `${source}:${normalizeNameKey(displayName)}`,
    uid,
    email: normalizedEmail,
    name: displayName,
    label: displayName,
    role: resolveRole(role),
    relationship: relationship || "family_member",
    type: "adult",
    color: colorId,
    colorId,
    source,
    admin: admin === true,
    locked: locked === true,
    raw,
  };
}

function canonicalPriority(source = "") {
  if (source === "owner" || source === "parent1") return 100;
  if (source === "parent2") return 90;
  if (source === "members") return 40;
  if (source === "memberEmails") return 10;
  return 20;
}

function mergePeople(existing, next) {
  const existingPriority = canonicalPriority(existing.source);
  const nextPriority = canonicalPriority(next.source);
  const base = nextPriority > existingPriority ? next : existing;
  const extra = base === next ? existing : next;

  return {
    ...base,
    uid: base.uid || extra.uid || null,
    email: base.email || extra.email || "",
    name: base.name && !["me", "owner", "member", "family member"].includes(normalizeNameKey(base.name))
      ? base.name
      : extra.name || base.name,
    label: base.label && !["me", "owner", "member", "family member"].includes(normalizeNameKey(base.label))
      ? base.label
      : extra.label || base.label,
    admin: base.admin === true || extra.admin === true,
    locked: base.locked === true || extra.locked === true,
    raw: base.raw || extra.raw || null,
  };
}

function addDedupedPerson(store, person) {
  if (!person?.name && !person?.email) return;

  const emailKey = person.email ? `email:${person.email}` : "";
  const nameKey = person.name ? `name:${normalizeNameKey(person.name)}` : "";

  const existingKey = emailKey && store.byKey.has(emailKey)
    ? emailKey
    : nameKey && store.byKey.has(nameKey)
    ? nameKey
    : "";

  if (existingKey) {
    const existing = store.byKey.get(existingKey);
    const merged = mergePeople(existing, person);
    store.byKey.set(existingKey, merged);
    if (emailKey) store.byKey.set(emailKey, merged);
    if (nameKey) store.byKey.set(nameKey, merged);
    return;
  }

  if (emailKey) store.byKey.set(emailKey, person);
  if (nameKey) store.byKey.set(nameKey, person);
  store.order.push(emailKey || nameKey);
}

function getPeopleFromStore(store) {
  const seen = new Set();
  const people = [];

  store.order.forEach((key) => {
    const person = store.byKey.get(key);
    if (!person) return;
    const stableKey = person.email || `${person.type}:${normalizeNameKey(person.name)}`;
    if (seen.has(stableKey)) return;
    seen.add(stableKey);
    people.push(person);
  });

  return people;
}

export function getFamilyAdults(profile = {}, currentUser = null, myEmail = "") {
  const store = { byKey: new Map(), order: [] };
  const currentEmail = normalizeEmail(currentUser?.email || myEmail);
  const members = Array.isArray(profile?.members) ? profile.members : [];

  const ownerEmail = normalizeEmail(
    profile.ownerEmail ||
      profile.owner_email ||
      profile.createdByEmail ||
      profile.created_by ||
      profile.parent1Email ||
      profile.parent1_email ||
      currentEmail
  );

  const parent1Relationship = profile.parent1Relationship || profile.parent1_relationship || (profile.parent1Role === "mom" || profile.parent1_role === "mom" ? "mother" : "father");
  const parent2Relationship = profile.parent2Relationship || profile.parent2_relationship || (profile.parent2Role === "dad" || profile.parent2_role === "dad" ? "father" : "mother");

  addDedupedPerson(
    store,
    makeAdultPerson({
      source: "owner",
      email: ownerEmail,
      uid: profile.ownerUid || profile.owner_uid || profile.ownerId || profile.owner_id || profile.createdBy || profile.created_by || currentUser?.uid || null,
      name:
        profile.ownerName ||
        profile.owner_name ||
        profile.parent1Name ||
        profile.parent1_name ||
        profile.createdByName ||
        profile.created_by_name ||
        currentUser?.displayName ||
        currentUser?.name ||
        (ownerEmail ? nameFromEmail(ownerEmail) : "Owner"),
      role: profile.parent1AppRole || profile.parent1_app_role || "owner",
      relationship: parent1Relationship,
      color: profile.parent1Color || profile.parent1_color || "blue",
      admin: true,
      locked: true,
    })
  );

  const parent2Email = normalizeEmail(profile.parent2Email || profile.parent2_email);
  if (profile.parent2Name || profile.parent2_name || parent2Email) {
    addDedupedPerson(
      store,
      makeAdultPerson({
        source: "parent2",
        email: parent2Email,
        name: profile.parent2Name || profile.parent2_name || (parent2Email ? nameFromEmail(parent2Email) : "Co-parent / caregiver"),
        role: profile.parent2AppRole || profile.parent2_app_role || "admin",
        relationship: parent2Relationship,
        color: profile.parent2Color || profile.parent2_color || "amber",
      })
    );
  }

  members.forEach((member, index) => {
    const email = normalizeEmail(member.email || member.emailAddress || member.memberEmail);
    addDedupedPerson(
      store,
      makeAdultPerson({
        source: "members",
        email,
        uid: member.uid || member.userId || member.user_id || null,
        name: resolveDisplayName(member, email, `Member ${index + 1}`),
        role: member.appRole || member.app_role || member.role || member.memberRole || "viewer",
        relationship: resolveRelationship(member, "family_member"),
        color: member.colorId || member.color || member.familyColor || member.family_color || "teal",
        admin: member.isAdmin === true || member.is_admin === true || member.admin === true,
        raw: member,
      })
    );
  });

  const memberEmails = Array.isArray(profile.memberEmails)
    ? profile.memberEmails
    : Array.isArray(profile.member_emails)
    ? profile.member_emails
    : [];

  memberEmails.forEach((email) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return;
    addDedupedPerson(
      store,
      makeAdultPerson({
        source: "memberEmails",
        email: normalized,
        name: nameFromEmail(normalized),
        role: "viewer",
        relationship: "family_member",
        color: "teal",
      })
    );
  });

  return getPeopleFromStore(store);
}

export function getFamilyChildren(profile = {}) {
  return Array.isArray(profile?.children)
    ? profile.children.map((child, index) => normalizeChildPerson(child, index))
    : [];
}

export function getFamilyPeople(profile = {}, currentUser = null, myEmail = "", options = {}) {
  const includeChildren = options.includeChildren === true;
  const includeEveryone = options.includeEveryone !== false;
  const adults = getFamilyAdults(profile, currentUser, myEmail);
  const children = includeChildren ? getFamilyChildren(profile) : [];
  const people = [...adults, ...children];

  if (includeEveryone) {
    people.push({
      id: "everyone",
      uid: null,
      email: "",
      name: "Everyone",
      label: "Everyone",
      role: "all",
      relationship: "group",
      type: "group",
      color: "family",
      colorId: "family",
      source: "system",
      locked: true,
    });
  }

  return people;
}

export function getSelectableFamilyMembers(profile = {}, currentUser = null, myEmail = "") {
  return getFamilyAdults(profile, currentUser, myEmail).filter((person) => person.email);
}

export function getFamilyPersonColorMap(profile = {}, currentUser = null, myEmail = "") {
  const map = {};
  const people = getFamilyPeople(profile, currentUser, myEmail, { includeChildren: true, includeEveryone: true });

  people.forEach((person) => {
    const color = person.colorId || person.color;
    if (person.email) map[person.email] = color;
    if (person.name) map[normalizeNameKey(person.name)] = color;
    if (person.id) map[person.id] = color;
  });

  map.all = "family";
  map.everyone = "family";

  return { people, map };
}
