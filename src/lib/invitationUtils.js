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
