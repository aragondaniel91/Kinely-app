export const INVITATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
};

export const INVITATION_TYPES = {
  FAMILY_MEMBER: "family_member",
  FAMILY_COPARENT: "family_coparent",
  CUSTODY_MEMBER: "custody_member",
  CUSTODY_VIEWER: "custody_viewer",
};

export function normalizeInviteEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function inviteKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function familyInvitationId(familyId, email) {
  return `family_${familyId}_${normalizeInviteEmail(email)}`;
}

export function custodyInvitationId(groupId, email) {
  return `custody_${groupId}_${normalizeInviteEmail(email)}`;
}

export function buildFamilyInvitation({
  familyId,
  familyName = "",
  recipientName = "",
  recipientEmail,
  role = "parent",
  type = INVITATION_TYPES.FAMILY_COPARENT,
  permissions = null,
  createdBy = "",
  createdByEmail = "",
  now = new Date().toISOString(),
}) {
  const cleanEmail = normalizeInviteEmail(recipientEmail);
  if (!familyId || !cleanEmail) return null;

  const id = familyInvitationId(familyId, cleanEmail);

  return {
    id,
    familyId,
    family_id: familyId,
    familyName,
    family_name: familyName,
    type,
    inviteType: type,
    invite_type: type,
    status: INVITATION_STATUS.PENDING,
    recipientName: String(recipientName || "").trim(),
    recipient_name: String(recipientName || "").trim(),
    recipientEmail: cleanEmail,
    recipient_email: cleanEmail,
    role,
    permissions,
    createdBy,
    created_by: createdBy,
    createdByEmail: normalizeInviteEmail(createdByEmail),
    created_by_email: normalizeInviteEmail(createdByEmail),
    createdAt: now,
    created_at: now,
    updatedAt: now,
    updated_at: now,
  };
}

export function buildCustodyInvitation({
  groupId,
  householdFamilyId = "",
  groupName = "",
  recipientName = "",
  recipientEmail,
  role = "coparent",
  access = "member",
  type = null,
  permissions = null,
  createdBy = "",
  createdByEmail = "",
  now = new Date().toISOString(),
}) {
  const cleanEmail = normalizeInviteEmail(recipientEmail);
  if (!groupId || !cleanEmail) return null;

  const cleanAccess = access === "viewer" ? "viewer" : "member";
  const inviteType = type || (cleanAccess === "viewer" ? INVITATION_TYPES.CUSTODY_VIEWER : INVITATION_TYPES.CUSTODY_MEMBER);
  const id = custodyInvitationId(groupId, cleanEmail);

  return {
    id,
    familyId: groupId,
    family_id: groupId,
    groupId,
    group_id: groupId,
    householdFamilyId: householdFamilyId || "",
    household_family_id: householdFamilyId || "",
    groupName,
    group_name: groupName,
    familyName: groupName,
    family_name: groupName,
    type: inviteType,
    inviteType,
    invite_type: inviteType,
    access: cleanAccess,
    accessLevel: cleanAccess,
    access_level: cleanAccess,
    status: INVITATION_STATUS.PENDING,
    recipientName: String(recipientName || "").trim(),
    recipient_name: String(recipientName || "").trim(),
    recipientEmail: cleanEmail,
    recipient_email: cleanEmail,
    role,
    permissions,
    createdBy,
    created_by: createdBy,
    createdByEmail: normalizeInviteEmail(createdByEmail),
    created_by_email: normalizeInviteEmail(createdByEmail),
    createdAt: now,
    created_at: now,
    updatedAt: now,
    updated_at: now,
  };
}

function mergeUniqueEmails(...groups) {
  return [
    ...new Set(
      groups
        .flat()
        .map(normalizeInviteEmail)
        .filter(Boolean)
    ),
  ];
}

function mergeInvites(existing = [], invite) {
  if (!invite?.recipientEmail) return Array.isArray(existing) ? existing : [];

  const email = normalizeInviteEmail(invite.recipientEmail);
  const map = new Map();

  (Array.isArray(existing) ? existing : []).forEach((item) => {
    const key = normalizeInviteEmail(item.recipientEmail || item.recipient_email);
    if (key) map.set(key, item);
  });

  map.set(email, invite);
  return Array.from(map.values());
}

export function withPendingFamilyInvitation(family = {}, invite) {
  if (!invite) return family;

  const email = normalizeInviteEmail(invite.recipientEmail);
  const pendingEmails = mergeUniqueEmails(
    family.pendingMemberEmails,
    family.pending_member_emails,
    [email]
  );
  const pendingInvites = mergeInvites(
    family.pendingInvites || family.pending_invites,
    invite
  );

  return {
    ...family,
    pendingMemberEmails: pendingEmails,
    pending_member_emails: pendingEmails,
    pendingInvites,
    pending_invites: pendingInvites,
  };
}

export function withPendingCustodyInvitation(group = {}, invite) {
  if (!invite) return group;

  const email = normalizeInviteEmail(invite.recipientEmail);
  const isViewer = invite.access === "viewer" || invite.accessLevel === "viewer" || invite.access_level === "viewer";
  const pendingInvites = mergeInvites(
    group.pendingInvites || group.pending_invites,
    invite
  );

  if (isViewer) {
    const pendingViewerEmails = mergeUniqueEmails(
      group.pendingViewerEmails,
      group.pending_viewer_emails,
      [email]
    );

    return {
      ...group,
      pendingViewerEmails,
      pending_viewer_emails: pendingViewerEmails,
      pendingInvites,
      pending_invites: pendingInvites,
    };
  }

  const pendingMemberEmails = mergeUniqueEmails(
    group.pendingMemberEmails,
    group.pending_member_emails,
    [email]
  );

  return {
    ...group,
    pendingMemberEmails,
    pending_member_emails: pendingMemberEmails,
    pendingInvites,
    pending_invites: pendingInvites,
  };
}
