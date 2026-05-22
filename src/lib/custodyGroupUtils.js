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

export function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

export function normalizeChildRecord(child, index = 0) {
  const name = normalizeChildName(child);
  const id =
    child?.id ||
    child?.uid ||
    child?.childId ||
    child?.child_id ||
    child?.refId ||
    child?.docId ||
    (name ? `child-${normalizeKey(name) || index + 1}` : `child-${index + 1}`);

  return {
    id,
    childId: id,
    name,
    childName: name,
    nameKey: child?.nameKey || child?.name_key || normalizeKey(name),
    color: child?.color || child?.childColor || child?.child_color || "green",
    relationshipType:
      child?.relationshipType ||
      child?.relationship_type ||
      child?.custodyRelationshipType ||
      CHILD_RELATIONSHIP_TYPES.HOUSEHOLD_ONLY,
  };
}

export function getHouseholdChildren(profile) {
  if (!profile) return [];
  if (Array.isArray(profile.children)) return profile.children;
  if (profile.child_name || profile.childName) return [{ name: profile.child_name || profile.childName }];
  return [];
}

export function normalizeHouseholdChild(child) {
  const normalized = normalizeChildRecord(child);

  return {
    ...normalized,
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
  if (group.childName) return [String(group.childName).trim()].filter(Boolean);
  if (Array.isArray(group.childIds) && group.childIds.length) return group.childIds;
  return [];
}

export function getCustodyGroupChildIds(group) {
  if (!group) return [];
  if (Array.isArray(group.childIds) && group.childIds.length) return [...new Set(group.childIds.filter(Boolean))];
  if (Array.isArray(group.children) && group.children.length) {
    return [...new Set(group.children.map((child, index) => normalizeChildRecord(child, index).id).filter(Boolean))];
  }
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
  childRecords,
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
  const normalizedChildRecords = Array.isArray(childRecords) && childRecords.length
    ? childRecords.map(normalizeChildRecord).filter((child) => child.name)
    : normalizeChildNames(children?.length ? children : [childName]).map((name, index) =>
        normalizeChildRecord({ name, relationshipType: CHILD_RELATIONSHIP_TYPES.EXTERNAL_CUSTODY }, index)
      );

  const cleanChildren = normalizedChildRecords.map((child) => child.name).filter(Boolean);
  const childIds = [...new Set(normalizedChildRecords.map((child) => child.id).filter(Boolean))];
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
    children: normalizedChildRecords.map((child) => ({
      id: child.id,
      childId: child.id,
      name: child.name,
      nameKey: child.nameKey,
      color: child.color || "green",
      relationshipType: CHILD_RELATIONSHIP_TYPES.EXTERNAL_CUSTODY,
    })),
    childIds,
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
