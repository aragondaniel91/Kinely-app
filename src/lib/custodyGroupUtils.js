export const CHILD_RELATIONSHIP_TYPES = {
  JOINT: "joint_child",
  EXTERNAL_CUSTODY: "external_custody",
  HOUSEHOLD_ONLY: "household_only",
};

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeEmailList(values = []) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

export function normalizeChildName(child) {
  if (!child) return "";
  if (typeof child === "string") return child.trim();
  return String(child.name || child.fullName || child.displayName || child.childName || child.firstName || "").trim();
}

export function normalizeChildNames(children = []) {
  if (!Array.isArray(children)) return [];
  return [...new Set(children.map(normalizeChildName).filter(Boolean))];
}

export function getHouseholdChildren(profile) {
  if (!profile) return [];
  if (Array.isArray(profile.children)) return profile.children;
  if (profile.child_name || profile.childName) return [{ name: profile.child_name || profile.childName }];
  return [];
}

export function normalizeHouseholdChild(child) {
  const name = normalizeChildName(child);
  const relationshipType =
    child?.relationshipType ||
    child?.relationship_type ||
    child?.custodyRelationshipType ||
    CHILD_RELATIONSHIP_TYPES.HOUSEHOLD_ONLY;

  return {
    id: child?.id || child?.childId || child?.child_id || name.toLowerCase().replace(/\s+/g, "-"),
    name,
    color: child?.color || child?.childColor || child?.child_color || "green",
    relationshipType,
    custodyGroupIds: Array.isArray(child?.custodyGroupIds)
      ? child.custodyGroupIds
      : Array.isArray(child?.custody_group_ids)
      ? child.custody_group_ids
      : [],
    parents: Array.isArray(child?.parents) ? child.parents : [],
  };
}

export function childNeedsCustodyGroup(child) {
  const normalized = normalizeHouseholdChild(child);
  return normalized.relationshipType === CHILD_RELATIONSHIP_TYPES.EXTERNAL_CUSTODY;
}

export function childIsJointHouseholdChild(child) {
  const normalized = normalizeHouseholdChild(child);
  return normalized.relationshipType === CHILD_RELATIONSHIP_TYPES.JOINT;
}

export function getCustodyGroupChildren(group) {
  if (!group) return [];
  if (Array.isArray(group.children) && group.children.length) return normalizeChildNames(group.children);
  if (Array.isArray(group.childNames) && group.childNames.length) return normalizeChildNames(group.childNames);
  if (Array.isArray(group.childIds) && group.childIds.length) return normalizeChildNames(group.childIds);
  if (group.childName) return [String(group.childName).trim()].filter(Boolean);
  return [];
}

export function getCustodyGroupParents(group) {
  if (!group) return [];
  if (Array.isArray(group.parents) && group.parents.length) return group.parents;
  if (Array.isArray(group.coParents) && group.coParents.length) return group.coParents;
  return [];
}

export function getCustodyGroupMemberEmails(group) {
  const explicitMembers = Array.isArray(group?.memberEmails) ? group.memberEmails : [];
  const legacyMembers = Array.isArray(group?.member_emails) ? group.member_emails : [];
  const parentEmails = getCustodyGroupParents(group).map((parent) => parent.email).filter(Boolean);
  return normalizeEmailList([...explicitMembers, ...legacyMembers, ...parentEmails]);
}

export function getCustodyGroupViewerEmails(group) {
  const viewerEmails = Array.isArray(group?.viewerEmails) ? group.viewerEmails : [];
  const legacyViewerEmails = Array.isArray(group?.viewer_emails) ? group.viewer_emails : [];
  return normalizeEmailList([...viewerEmails, ...legacyViewerEmails]);
}

export function buildCustodyGroupPayload({
  groupName,
  familyId,
  childName,
  children,
  currentUser,
  currentEmail,
  parentName,
  parentEmail,
  parentRole = "parent",
  parentColor = "blue",
  coparentName,
  coparentEmail,
  coparentRole = "parent",
  coparentColor = "orange",
  viewerEmails = [],
  now,
}) {
  const cleanChildren = normalizeChildNames(children?.length ? children : [childName]);
  const ownerEmail = normalizeEmail(parentEmail || currentEmail || currentUser?.email);
  const otherEmail = normalizeEmail(coparentEmail);
  const cleanViewerEmails = normalizeEmailList(viewerEmails).filter(
    (email) => email !== ownerEmail && email !== otherEmail
  );

  const parents = [
    {
      uid: currentUser?.uid || null,
      email: ownerEmail,
      name: String(parentName || currentUser?.displayName || "Parent 1").trim(),
      role: parentRole || "parent",
      color: parentColor || "blue",
      custodyColor: parentColor || "blue",
      permissions: { custodyCalendar: { read: true, write: true } },
    },
    {
      uid: null,
      email: otherEmail,
      name: String(coparentName || "Co-parent").trim(),
      role: coparentRole || "parent",
      color: coparentColor || "orange",
      custodyColor: coparentColor || "orange",
      permissions: { custodyCalendar: { read: true, write: true } },
    },
  ].filter((parent) => parent.email);

  const memberEmails = normalizeEmailList(parents.map((parent) => parent.email));
  const name = String(groupName || `${cleanChildren[0] || "Child"} Custody`).trim();

  return {
    name,
    type: "custody",
    status: "active",
    familyId: familyId || null,
    householdFamilyId: familyId || null,
    linkedFamilyIds: [familyId].filter(Boolean),
    children: cleanChildren.map((name) => ({
      name,
      color: "green",
      relationshipType: CHILD_RELATIONSHIP_TYPES.EXTERNAL_CUSTODY,
    })),
    childNames: cleanChildren,
    relationshipType: CHILD_RELATIONSHIP_TYPES.EXTERNAL_CUSTODY,
    parents,
    coParents: parents,
    memberEmails,
    member_emails: memberEmails,
    viewerEmails: cleanViewerEmails,
    viewer_emails: cleanViewerEmails,
    ownerId: currentUser?.uid || null,
    ownerEmail: ownerEmail || "",
    createdBy: currentUser?.uid || null,
    createdByEmail: currentUser?.email || currentEmail || "",
    updatedAt: now,
  };
}

export function mergeCustodyGroups(...groupLists) {
  const map = new Map();
  groupLists.flat().forEach((group) => {
    if (group?.id) map.set(group.id, group);
  });
  return Array.from(map.values());
}
