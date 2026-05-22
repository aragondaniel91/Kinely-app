export const VISIBILITY_TYPES = {
  PRIVATE: "private",
  HOUSEHOLD: "household",
  CUSTODY_SHARED: "custody_shared",
  SELECTED: "selected",
};

export const NOTIFY_TARGETS = {
  NO_ONE: "no_one",
  CO_PARENT: "co_parent",
  ALL_VISIBLE: "all_visible",
  SELECTED: "selected",
};

export const VISIBILITY_OPTIONS = [
  {
    id: VISIBILITY_TYPES.PRIVATE,
    label: "Only me",
    shortLabel: "Private",
    description: "Only the creator can see this item.",
  },
  {
    id: VISIBILITY_TYPES.HOUSEHOLD,
    label: "My family household",
    shortLabel: "Family",
    description: "Visible to members of the active family/household.",
  },
  {
    id: VISIBILITY_TYPES.CUSTODY_SHARED,
    label: "Custody shared",
    shortLabel: "Custody",
    description: "Visible to people included in the custody group audience.",
  },
  {
    id: VISIBILITY_TYPES.SELECTED,
    label: "Selected people",
    shortLabel: "Selected",
    description: "Visible only to specific people you choose.",
  },
];

export const NOTIFY_OPTIONS = [
  {
    id: NOTIFY_TARGETS.NO_ONE,
    label: "No one",
    description: "Save without sending notifications.",
  },
  {
    id: NOTIFY_TARGETS.CO_PARENT,
    label: "Co-parent",
    description: "Notify the co-parent or custody member when applicable.",
  },
  {
    id: NOTIFY_TARGETS.ALL_VISIBLE,
    label: "All visible people",
    description: "Notify everyone who can see this item.",
  },
  {
    id: NOTIFY_TARGETS.SELECTED,
    label: "Selected people",
    description: "Notify only specific people you choose.",
  },
];

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeEmailList(values = []) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map(normalizeEmail).filter(Boolean)));
}

export function getFamilyAudience(profile = {}) {
  const ownerEmail = normalizeEmail(profile.ownerEmail || profile.owner_email || profile.createdByEmail || profile.created_by);
  const parent1Email = normalizeEmail(profile.parent1Email || profile.parent1_email || ownerEmail);
  const parent2Email = normalizeEmail(profile.parent2Email || profile.parent2_email);
  const memberEmails = Array.isArray(profile.memberEmails)
    ? profile.memberEmails
    : Array.isArray(profile.member_emails)
    ? profile.member_emails
    : [];
  const memberObjectEmails = Array.isArray(profile.members)
    ? profile.members.map((member) => member?.email)
    : [];

  return normalizeEmailList([
    ownerEmail,
    parent1Email,
    parent2Email,
    ...memberEmails,
    ...memberObjectEmails,
  ]);
}

export function getCustodyAudience(custodyGroup = {}) {
  const memberEmails = Array.isArray(custodyGroup.memberEmails)
    ? custodyGroup.memberEmails
    : Array.isArray(custodyGroup.member_emails)
    ? custodyGroup.member_emails
    : [];
  const viewerEmails = Array.isArray(custodyGroup.viewerEmails)
    ? custodyGroup.viewerEmails
    : Array.isArray(custodyGroup.viewer_emails)
    ? custodyGroup.viewer_emails
    : [];
  const parents = Array.isArray(custodyGroup.parents) ? custodyGroup.parents : [];
  const coParents = Array.isArray(custodyGroup.coParents) ? custodyGroup.coParents : [];
  const parentEmails = [...parents, ...coParents].map((parent) => parent?.email);

  return normalizeEmailList([
    custodyGroup.ownerEmail,
    custodyGroup.createdByEmail,
    ...memberEmails,
    ...viewerEmails,
    ...parentEmails,
  ]);
}

export function buildVisibilityAudience({
  visibility = VISIBILITY_TYPES.HOUSEHOLD,
  createdByEmail = "",
  familyProfile = null,
  custodyGroup = null,
  selectedEmails = [],
} = {}) {
  const creator = normalizeEmail(createdByEmail);

  if (visibility === VISIBILITY_TYPES.PRIVATE) {
    return normalizeEmailList([creator]);
  }

  if (visibility === VISIBILITY_TYPES.CUSTODY_SHARED) {
    return normalizeEmailList([creator, ...getCustodyAudience(custodyGroup || {})]);
  }

  if (visibility === VISIBILITY_TYPES.SELECTED) {
    return normalizeEmailList([creator, ...selectedEmails]);
  }

  return normalizeEmailList([creator, ...getFamilyAudience(familyProfile || {})]);
}

export function buildNotifyRecipients({
  notifyTarget = NOTIFY_TARGETS.NO_ONE,
  visibleTo = [],
  coParentEmails = [],
  selectedEmails = [],
} = {}) {
  if (notifyTarget === NOTIFY_TARGETS.NO_ONE) return [];

  if (notifyTarget === NOTIFY_TARGETS.CO_PARENT) {
    return normalizeEmailList(coParentEmails);
  }

  if (notifyTarget === NOTIFY_TARGETS.SELECTED) {
    return normalizeEmailList(selectedEmails);
  }

  return normalizeEmailList(visibleTo);
}

export function buildAudiencePayload({
  visibility = VISIBILITY_TYPES.HOUSEHOLD,
  notifyTarget = NOTIFY_TARGETS.NO_ONE,
  createdByEmail = "",
  familyProfile = null,
  custodyGroup = null,
  selectedVisibleEmails = [],
  selectedNotifyEmails = [],
  coParentEmails = [],
} = {}) {
  const visibleTo = buildVisibilityAudience({
    visibility,
    createdByEmail,
    familyProfile,
    custodyGroup,
    selectedEmails: selectedVisibleEmails,
  });

  const recipients = buildNotifyRecipients({
    notifyTarget,
    visibleTo,
    coParentEmails,
    selectedEmails: selectedNotifyEmails,
  });

  return {
    visibility,
    visibleTo,
    visible_to: visibleTo,
    audience: {
      type: visibility,
      visibleTo,
      selectedVisibleEmails: normalizeEmailList(selectedVisibleEmails),
    },
    notify: {
      enabled: recipients.length > 0,
      target: notifyTarget,
      recipients,
      selectedRecipients: normalizeEmailList(selectedNotifyEmails),
    },
  };
}

export function canUserSeeItem(item = {}, email = "") {
  const userEmail = normalizeEmail(email);
  if (!userEmail) return false;

  const visibility = item.visibility || item.audience?.type || VISIBILITY_TYPES.HOUSEHOLD;
  const visibleTo = normalizeEmailList(item.visibleTo || item.visible_to || item.audience?.visibleTo || []);

  if (visibility === VISIBILITY_TYPES.PRIVATE) {
    return normalizeEmail(item.createdByEmail || item.ownerEmail) === userEmail || visibleTo.includes(userEmail);
  }

  if (visibleTo.length > 0) {
    return visibleTo.includes(userEmail);
  }

  return true;
}
