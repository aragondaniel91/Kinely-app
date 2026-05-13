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

  return {
    id,
    uid: null,
    email: "",
    name,
    label: name,
    role: "child",
    type: "child",
    color: typeof child === "object" ? child.color || child.familyColor || child.family_color || "green" : "green",
    source: "children",
    locked: true,
  };
}

function resolveDisplayName(person = {}, email = "", fallback = "Family member") {
  return normalizeName(
    person.name ||
      person.displayName ||
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
  return value;
}

function makeAdultPerson({
  source,
  email,
  name,
  role,
  color,
  uid = null,
  admin = false,
  locked = false,
  raw = null,
}) {
  const normalizedEmail = normalizeEmail(email);
  const displayName = normalizeName(name) || (normalizedEmail ? nameFromEmail(normalizedEmail) : "Family member");

  return {
    id: normalizedEmail || `${source}:${normalizeNameKey(displayName)}`,
    uid,
    email: normalizedEmail,
    name: displayName,
    label: displayName,
    role: resolveRole(role),
    type: "adult",
    color: color || "teal",
    source,
    admin: admin === true,
    locked: locked === true,
    raw,
  };
}

function personQuality(person = {}) {
  let score = 0;
  if (person.email) score += 10;
  if (person.uid) score += 10;
  if (person.name && !["me", "owner", "member", "family member"].includes(normalizeNameKey(person.name))) score += 8;
  if (person.admin) score += 2;
  if (person.locked) score += 1;
  if (person.source === "owner" || person.source === "parent1") score += 2;
  if (person.source === "members") score += 1;
  return score;
}

function shouldReplacePerson(existing, next) {
  if (!existing) return true;
  if (existing.email && next.email && existing.email === next.email) {
    return personQuality(next) >= personQuality(existing);
  }

  const existingName = normalizeNameKey(existing.name);
  const nextName = normalizeNameKey(next.name);
  if (existingName && nextName && existingName === nextName) {
    return personQuality(next) > personQuality(existing);
  }

  return false;
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
    const chosen = shouldReplacePerson(existing, person) ? { ...existing, ...person } : existing;
    store.byKey.set(existingKey, chosen);
    if (emailKey) store.byKey.set(emailKey, chosen);
    if (nameKey) store.byKey.set(nameKey, chosen);
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

  addDedupedPerson(
    store,
    makeAdultPerson({
      source: "owner",
      email: ownerEmail,
      uid: profile.ownerUid || profile.owner_uid || profile.createdBy || profile.created_by || currentUser?.uid || null,
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
      role: profile.parent1Role || profile.parent1_role || "parent",
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
        role: profile.parent2Role || profile.parent2_role || "parent",
        color: profile.parent2Color || profile.parent2_color || "orange",
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
        role: member.role || member.memberRole || member.relationship || "family",
        color: member.color || member.familyColor || member.family_color || "teal",
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
        role: "family",
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
      type: "group",
      color: "family",
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
    if (person.email) map[person.email] = person.color;
    if (person.name) map[normalizeNameKey(person.name)] = person.color;
    if (person.id) map[person.id] = person.color;
  });

  map.all = "family";
  map.everyone = "family";

  return { people, map };
}
