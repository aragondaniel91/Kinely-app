export const FAMILY_ROLE_OPTIONS = [
  {
    value: "parent",
    label: "Parent",
    description: "I am a parent or legal guardian.",
    relationship: "parent",
    fullAccess: true,
    livesHere: true,
    personType: "adult",
  },
  {
    value: "dad",
    label: "Dad",
    description: "I am a father or dad figure.",
    relationship: "father",
    fullAccess: true,
    livesHere: true,
    personType: "adult",
  },
  {
    value: "mom",
    label: "Mom",
    description: "I am a mother or mom figure.",
    relationship: "mother",
    fullAccess: true,
    livesHere: true,
    personType: "adult",
  },
  {
    value: "child",
    label: "Child / teen",
    description: "I am an older child or teen joining a family space.",
    relationship: "child",
    livesHere: true,
    personType: "child",
    inviteRecommended: true,
  },
  {
    value: "grandmother",
    label: "Grandmother",
    description: "I am a grandparent helping this family.",
    relationship: "grandmother",
    livesHere: false,
    personType: "adult",
  },
  {
    value: "grandfather",
    label: "Grandfather",
    description: "I am a grandparent helping this family.",
    relationship: "grandfather",
    livesHere: false,
    personType: "adult",
  },
  {
    value: "babysitter",
    label: "Babysitter",
    description: "I help with childcare and need limited access.",
    relationship: "babysitter",
    livesHere: false,
    personType: "adult",
    inviteRecommended: true,
  },
  {
    value: "caregiver",
    label: "Caregiver",
    description: "I help care for the child or household.",
    relationship: "caregiver",
    livesHere: false,
    personType: "adult",
    inviteRecommended: true,
  },
  {
    value: "family",
    label: "Family member",
    description: "I am another trusted family member.",
    relationship: "family_member",
    livesHere: true,
    personType: "adult",
  },
];

const ROLE_VALUES = new Set(FAMILY_ROLE_OPTIONS.map((role) => role.value));
const ROLE_META_BY_VALUE = new Map(FAMILY_ROLE_OPTIONS.map((role) => [role.value, role]));

export function normalizeMemberRole(role, fallback = "caregiver") {
  const value = String(role || "").trim().toLowerCase();
  if (value === "member") return "family";
  if (ROLE_VALUES.has(value)) return value;
  return fallback;
}

export function getMemberRoleMeta(role, fallback = "family") {
  const normalizedRole = normalizeMemberRole(role, fallback);
  return ROLE_META_BY_VALUE.get(normalizedRole) || ROLE_META_BY_VALUE.get("family");
}

export function roleImpliesFullAccess(role) {
  return getMemberRoleMeta(role)?.fullAccess === true;
}

export function roleToRelationship(role) {
  return getMemberRoleMeta(role)?.relationship || "family_member";
}

export function roleToPersonType(role) {
  return getMemberRoleMeta(role)?.personType || "adult";
}

export function roleDefaultLivesHere(role) {
  return getMemberRoleMeta(role)?.livesHere === true;
}

export function roleDefaultShowOnHomeDashboard(role) {
  return roleDefaultLivesHere(role) || roleImpliesFullAccess(role);
}

export function oppositeParentRole(role) {
  if (role === "mom") return "dad";
  if (role === "dad") return "mom";
  return "parent";
}
