export const PERSON_COLOR_OPTIONS = [
  { id: "blue", label: "Blue", dot: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-300", stripe: "bg-blue-500", ring: "ring-blue-200", text: "text-blue-700", hex: "#3b82f6", softHex: "#eff6ff" },
  { id: "green", label: "Green", dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-300", stripe: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-700", hex: "#10b981", softHex: "#ecfdf5" },
  { id: "purple", label: "Purple", dot: "bg-violet-500", bg: "bg-violet-50", border: "border-violet-300", stripe: "bg-violet-500", ring: "ring-violet-200", text: "text-violet-700", hex: "#8b5cf6", softHex: "#f5f3ff" },
  { id: "orange", label: "Orange", dot: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-300", stripe: "bg-orange-500", ring: "ring-orange-200", text: "text-orange-700", hex: "#f97316", softHex: "#fff7ed" },
  { id: "yellow", label: "Yellow", dot: "bg-yellow-500", bg: "bg-yellow-50", border: "border-yellow-300", stripe: "bg-yellow-500", ring: "ring-yellow-200", text: "text-yellow-700", hex: "#eab308", softHex: "#fefce8" },
  { id: "pink", label: "Pink", dot: "bg-pink-500", bg: "bg-pink-50", border: "border-pink-300", stripe: "bg-pink-500", ring: "ring-pink-200", text: "text-pink-700", hex: "#ec4899", softHex: "#fdf2f8" },
  { id: "red", label: "Red", dot: "bg-red-500", bg: "bg-red-50", border: "border-red-300", stripe: "bg-red-500", ring: "ring-red-200", text: "text-red-700", hex: "#ef4444", softHex: "#fef2f2" },
  { id: "teal", label: "Teal", dot: "bg-teal-500", bg: "bg-teal-50", border: "border-teal-300", stripe: "bg-teal-500", ring: "ring-teal-200", text: "text-teal-700", hex: "#14b8a6", softHex: "#f0fdfa" },
  { id: "slate", label: "Slate", dot: "bg-slate-500", bg: "bg-slate-50", border: "border-slate-300", stripe: "bg-slate-500", ring: "ring-slate-200", text: "text-slate-700", hex: "#64748b", softHex: "#f8fafc" },
  {
    id: "family",
    label: "Family",
    dot: "bg-[image:var(--family-gradient)]",
    bg: "bg-[image:var(--family-soft-gradient)]",
    border: "border-blue-200",
    stripe: "bg-[image:var(--family-gradient-vertical)]",
    ring: "ring-blue-200",
    text: "text-slate-800",
    hex: "#3b82f6",
    softHex: "#eff6ff",
  },
];

export const DEFAULT_PERSON_COLORS = {
  dad: "blue",
  mom: "orange",
  child: "green",
  member: "teal",
  all: "family",
};

export function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

export function getColorMeta(colorId, fallback = "blue") {
  return PERSON_COLOR_OPTIONS.find((color) => color.id === colorId) || PERSON_COLOR_OPTIONS.find((color) => color.id === fallback) || PERSON_COLOR_OPTIONS[0];
}

export function colorHex(colorId, fallback = "blue") {
  return getColorMeta(colorId, fallback).hex;
}

export function colorSoftHex(colorId, fallback = "blue") {
  return getColorMeta(colorId, fallback).softHex;
}

function uniqueColors(colors = []) {
  const seen = new Set();
  return colors.filter((color) => {
    const key = String(color || "").trim();
    if (!key || key === "family" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    const fallbackColors = ["green", "pink", "purple", "teal", "orange"];
    return fallbackColors[index % fallbackColors.length];
  }

  return child.color || child.familyColor || child.family_color || child.calendarColor || child.calendar_color || DEFAULT_PERSON_COLORS.child;
}

export function normalizeChild(child, index = 0) {
  return {
    id: typeof child === "object" ? child.id || child.uid || child.childId || child.child_id || `child-${index + 1}` : `child-${index + 1}`,
    name: childName(child, index),
    color: childColor(child, index),
  };
}

export function normalizeChildren(children = []) {
  return Array.isArray(children) ? children.map((child, index) => normalizeChild(child, index)) : [];
}

export function familyPersonColorMap(profile = {}, user = null, myEmail = "") {
  const children = normalizeChildren(profile.children || []);
  const map = {
    dad: profile.parent1_color || profile.parent1Color || DEFAULT_PERSON_COLORS.dad,
    mom: profile.parent2_color || profile.parent2Color || DEFAULT_PERSON_COLORS.mom,
    parent1: profile.parent1_color || profile.parent1Color || DEFAULT_PERSON_COLORS.dad,
    parent2: profile.parent2_color || profile.parent2Color || DEFAULT_PERSON_COLORS.mom,
    all: DEFAULT_PERSON_COLORS.all,
    everyone: DEFAULT_PERSON_COLORS.all,
  };

  const people = [
    {
      value: "dad",
      label: profile.parent1_name || profile.parent1Name || user?.displayName || "Dad",
      color: map.dad,
      type: "adult",
    },
    {
      value: "mom",
      label: profile.parent2_name || profile.parent2Name || "Mom",
      color: map.mom,
      type: "adult",
    },
  ];

  children.forEach((child, index) => {
    const key = `child:${child.name}`;
    const normalizedKey = `child:${normalizeName(child.name)}`;
    map[key] = child.color;
    map[normalizedKey] = child.color;
    map[child.id] = child.color;
    people.push({
      value: `child:${child.id}`,
      childId: child.id,
      label: child.name,
      color: child.color,
      type: "child",
      index,
    });
  });

  const members = Array.isArray(profile.members) ? profile.members : [];
  members.forEach((member, index) => {
    const email = String(member.email || "").toLowerCase();
    const color = member.color || member.familyColor || member.family_color || DEFAULT_PERSON_COLORS.member;
    if (email) map[email] = color;
    if (member.name) map[normalizeName(member.name)] = color;
    people.push({
      value: email ? `member:${email}` : `member:${index}`,
      label: member.name || member.email || `Member ${index + 1}`,
      color,
      type: "member",
      email,
    });
  });

  if (myEmail) map[String(myEmail).toLowerCase()] = map.dad;

  return { map, people, children };
}

export function custodyPersonColorMap(custodyGroup = {}) {
  const parents = Array.isArray(custodyGroup.coParents) ? custodyGroup.coParents : [];
  const map = {};
  const people = parents.map((parent, index) => {
    const color = parent.color || parent.custodyColor || parent.custody_color || (index === 0 ? DEFAULT_PERSON_COLORS.dad : DEFAULT_PERSON_COLORS.mom);
    const email = String(parent.email || "").toLowerCase();
    if (email) map[email] = color;
    if (parent.name) map[normalizeName(parent.name)] = color;
    map[index === 0 ? "dad" : "mom"] = color;
    return {
      value: email ? `custody:${email}` : `custody:${index}`,
      label: parent.name || parent.email || `Parent ${index + 1}`,
      color,
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

  if (isEveryoneEvent(event)) return map.all;

  const storedColor = event.eventColor || event.event_color || event.color || event.familyColor || event.family_color;
  if (storedColor && storedColor !== "slate" && PERSON_COLOR_OPTIONS.some((color) => color.id === storedColor)) return storedColor;

  const possibleKeys = [
    event.assignedTo,
    event.assignedToName,
    event.assignedToEmail,
    event.childId,
    event.childName,
    event.assignee,
  ].filter(Boolean);

  for (const key of possibleKeys) {
    const direct = map[key];
    const normalized = map[normalizeName(key)];
    const child = map[`child:${normalizeName(key)}`];
    if (direct || normalized || child) return direct || normalized || child;
  }

  if (event.assignedTo === "dad" || event.assignedToType === "dad") return map.dad;
  if (event.assignedTo === "mom" || event.assignedToType === "mom") return map.mom;
  if (event.assignedToType === "child" || event.childName || event.childId) return DEFAULT_PERSON_COLORS.child;

  return map[fallbackType] || DEFAULT_PERSON_COLORS.all;
}

export function colorClasses(colorId, fallback = "blue") {
  const color = getColorMeta(colorId, fallback);
  return {
    dot: color.dot,
    bg: color.bg,
    border: color.border,
    stripe: color.stripe,
    ring: color.ring,
    text: color.text,
  };
}
