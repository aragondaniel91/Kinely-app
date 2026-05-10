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
    children: cleanChildren.map((name) => ({ name, color: "green" })),
    childNames: cleanChildren,
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
