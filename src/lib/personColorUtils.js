import { getFamilyPersonColorMap as getNormalizedFamilyPersonColorMap } from "@/lib/familyPeopleUtils";
import {
  APP_COLORS,
  FAMILY_COLOR,
  getAppColor,
  getColorClasses,
  getColorHex,
  getColorSoftHex,
  isValidAppColor,
  normalizeColorId,
} from "@/lib/appColorUtils";

export const PERSON_COLOR_OPTIONS = APP_COLORS;

export const DEFAULT_PERSON_COLORS = {
  dad: "blue",
  mom: "amber",
  child: "green",
  member: "teal",
  all: "family",
};

export function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePersonLabel(value) {
  return normalizeName(value).replace(/\s+/g, " ");
}

function childAliases(child = {}) {
  const aliases = new Set();
  const values = [
    child.id,
    child.childId,
    child.child_id,
    child.name,
    child.childName,
    child.child_name,
    child.displayName,
    child.fullName,
    child.firstName,
  ].filter(Boolean);

  values.forEach((value) => {
    const raw = String(value || "").trim();
    const normalized = normalizeName(raw);
    if (!raw) return;
    aliases.add(raw);
    aliases.add(normalized);
    aliases.add(`child:${raw}`);
    aliases.add(`child:${normalized}`);
  });

  return Array.from(aliases).filter(Boolean);
}

export function getColorMeta(colorId, fallback = "blue") {
  return getAppColor(colorId, fallback);
}

export function colorHex(colorId, fallback = "blue") {
  return getColorHex(colorId, fallback);
}

export function colorSoftHex(colorId, fallback = "blue") {
  return getColorSoftHex(colorId, fallback);
}

function uniqueColors(colors = []) {
  const seen = new Set();
  return colors
    .map((color) => normalizeColorId(color))
    .filter((color) => {
      if (!color || color === "family" || seen.has(color)) return false;
      seen.add(color);
      return true;
    });
}

function isManualColorSource(event = {}) {
  const source = String(event.eventColorSource || event.event_color_source || "").toLowerCase();
  return source === "manual" || source === "custom" || source === "event";
}

export function familyColorIds(profile = {}, user = null) {
  const { people } = familyPersonColorMap(profile, user, user?.email || "");
  const colors = uniqueColors(people.map((person) => person.color));
  return colors.length > 0 ? colors : [DEFAULT_PERSON_COLORS.dad, DEFAULT_PERSON_COLORS.mom, DEFAULT_PERSON_COLORS.child];
}

export function familyGradientStyle(profile = {}, user = null, direction = "to right") {
  const colors = familyColorIds(profile, user).map((color) => colorHex(color));
  return {
    background: `linear-gradient(${direction}, ${colors.join(", ")})`,
    borderColor: colors[0],
  };
}

export function familySoftGradientStyle(profile = {}, user = null, direction = "to right") {
  const colors = familyColorIds(profile, user).map((color) => colorSoftHex(color));
  const borderColor = colorHex(familyColorIds(profile, user)[0]);
  return {
    background: `linear-gradient(${direction}, ${colors.join(", ")})`,
    borderColor,
  };
}

export function childName(child, index = 0) {
  if (!child) return `Child ${index + 1}`;
  if (typeof child === "string") return child;
  return child.name || child.displayName || child.fullName || child.firstName || child.childName || `Child ${index + 1}`;
}

export function childColor(child, index = 0) {
  if (!child || typeof child === "string") {
    const fallbackColors = ["green", "rose", "violet", "teal", "orange"];
    return fallbackColors[index % fallbackColors.length];
  }

  return normalizeColorId(child.colorId || child.color || child.familyColor || child.family_color || child.calendarColor || child.calendar_color || DEFAULT_PERSON_COLORS.child);
}

export function normalizeChild(child, index = 0) {
  const id = typeof child === "object" ? child.id || child.uid || child.childId || child.child_id || `child-${index + 1}` : `child-${index + 1}`;
  const name = childName(child, index);
  const color = childColor(child, index);

  return {
    ...(typeof child === "object" && child !== null ? child : {}),
    id,
    childId: typeof child === "object" ? child.childId || child.child_id || id : id,
    name,
    childName: typeof child === "object" ? child.childName || child.child_name || name : name,
    color,
    colorId: color,
  };
}

export function normalizeChildren(children = []) {
  return Array.isArray(children) ? children.map((child, index) => normalizeChild(child, index)) : [];
}

export function familyPersonColorMap(profile = {}, user = null, myEmail = "") {
  const children = normalizeChildren(profile.children || []);
  const normalized = getNormalizedFamilyPersonColorMap(profile, user, myEmail);
  const parent1Color = normalizeColorId(profile.parent1_color || profile.parent1Color || normalized.map.dad || DEFAULT_PERSON_COLORS.dad);
  const parent2Color = normalizeColorId(profile.parent2_color || profile.parent2Color || normalized.map.mom || DEFAULT_PERSON_COLORS.mom);
  const map = {
    ...normalized.map,
    dad: parent1Color,
    mom: parent2Color,
    parent1: parent1Color,
    parent2: parent2Color,
    all: DEFAULT_PERSON_COLORS.all,
    everyone: DEFAULT_PERSON_COLORS.all,
  };

  const people = (normalized.people || []).map((person) => {
    if (person.type === "group" || person.id === "everyone") {
      return {
        ...person,
        id: "all",
        value: "all",
        label: "ALL",
        name: "ALL",
        color: DEFAULT_PERSON_COLORS.all,
        colorId: DEFAULT_PERSON_COLORS.all,
        type: "all",
      };
    }

    if (person.source === "owner" || person.source === "parent1") {
      if (person.email) map[person.email] = parent1Color;
      if (person.name) map[normalizePersonLabel(person.name)] = parent1Color;
      return {
        ...person,
        value: person.email || person.id || person.name,
        label: person.label || person.name,
        color: parent1Color,
        colorId: parent1Color,
      };
    }

    if (person.source === "parent2") {
      if (person.email) map[person.email] = parent2Color;
      if (person.name) map[normalizePersonLabel(person.name)] = parent2Color;
      return {
        ...person,
        value: person.email || person.id || person.name,
        label: person.label || person.name,
        color: parent2Color,
        colorId: parent2Color,
      };
    }

    const normalizedColor = normalizeColorId(person.colorId || person.color || DEFAULT_PERSON_COLORS.member);
    return {
      ...person,
      value: person.id || person.email || person.name,
      label: person.label || person.name,
      color: normalizedColor,
      colorId: normalizedColor,
      type: person.type === "group" ? "all" : person.type,
    };
  });

  children.forEach((child) => {
    childAliases(child).forEach((alias) => {
      map[alias] = child.color;
    });
  });

  if (myEmail) map[normalizeEmail(myEmail)] = parent1Color;

  return { map, people, children };
}

export function custodyPersonColorMap(custodyGroup = {}) {
  const parents = Array.isArray(custodyGroup.coParents) ? custodyGroup.coParents : [];
  const map = {};
  const people = parents.map((parent, index) => {
    const color = normalizeColorId(parent.colorId || parent.color || parent.custodyColor || parent.custody_color || (index === 0 ? DEFAULT_PERSON_COLORS.dad : DEFAULT_PERSON_COLORS.mom));
    const email = normalizeEmail(parent.email);
    if (email) map[email] = color;
    if (parent.name) map[normalizeName(parent.name)] = color;
    map[index === 0 ? "dad" : "mom"] = color;
    map[index === 0 ? "parent1" : "parent2"] = color;
    return {
      value: email ? `custody:${email}` : `custody:${index}`,
      label: parent.name || parent.email || `Parent ${index + 1}`,
      color,
      colorId: color,
      type: index === 0 ? "dad" : "mom",
      email,
    };
  });

  return { map, people };
}

function isEveryoneEvent(event = {}) {
  return event.assignedTo === "all"
    || event.assignedToType === "all"
    || event.assignedTo === "everyone"
    || event.assignedToType === "everyone"
    || (!event.assignedTo && !event.assignedToType && !event.childName && !event.childId);
}

export function resolveEventColor(event = {}, profile = {}, fallbackType = "all") {
  const { map } = familyPersonColorMap(profile);
  const storedColor = normalizeColorId(event.eventColor || event.event_color || event.colorId || event.color || event.familyColor || event.family_color);

  if (storedColor && isManualColorSource(event) && isValidAppColor(storedColor)) return storedColor;

  if (isEveryoneEvent(event)) return map.all;

  const possibleKeys = [
    event.assignedPersonId,
    event.assignedPersonIds?.[0],
    event.childId,
    event.childName,
    event.assignedToName,
    event.assignedTo,
    event.assignedToEmail,
    event.assignee,
  ].filter(Boolean);

  for (const key of possibleKeys) {
    const raw = String(key || "").trim();
    const normalized = normalizeName(raw);
    const unprefixed = raw.startsWith("child:") ? raw.replace("child:", "") : raw;
    const normalizedUnprefixed = normalizeName(unprefixed);
    const direct = map[raw];
    const normalizedMatch = map[normalized];
    const childRaw = map[`child:${raw}`];
    const childNormalized = map[`child:${normalized}`];
    const childUnprefixed = map[`child:${unprefixed}`];
    const childNormalizedUnprefixed = map[`child:${normalizedUnprefixed}`];

    if (direct || normalizedMatch || childRaw || childNormalized || childUnprefixed || childNormalizedUnprefixed) {
      return direct || normalizedMatch || childRaw || childNormalized || childUnprefixed || childNormalizedUnprefixed;
    }
  }

  if (event.assignedTo === "dad" || event.assignedToType === "dad") return map.dad;
  if (event.assignedTo === "mom" || event.assignedToType === "mom") return map.mom;

  if (event.assignedToType === "child" || event.childName || event.childId) {
    const childFallback = normalizeChildren(profile.children || [])[0]?.color;
    return childFallback || DEFAULT_PERSON_COLORS.child;
  }

  if (storedColor && isValidAppColor(storedColor)) return storedColor;

  return map[fallbackType] || DEFAULT_PERSON_COLORS.all;
}

export function colorClasses(colorId, fallback = "blue") {
  const classes = getColorClasses(colorId, fallback);
  return {
    dot: classes.dot,
    bg: classes.bg,
    border: classes.border,
    stripe: classes.stripe,
    ring: classes.ring,
    text: classes.text,
  };
}

export { FAMILY_COLOR, normalizeColorId };
