import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { normalizeInviteEmail } from "@/lib/invitationUtils";
import { authorizedWorkerRequest } from "@/services/kinelyApiClient";

const MAIL_COLLECTION = "mail";
const FAMILY_INVITATION_KIND = "family_invitation";
const CUSTODY_INVITATION_KIND = "custody_invitation";
const NOTIFICATION_KIND = "notification";

function cleanText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function appBaseUrl() {
  const configured = cleanText(import.meta.env.VITE_APP_PUBLIC_URL);
  if (configured) return configured.replace(/\/+$/g, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

function buildAppUrl(pathname, params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const cleanValue = cleanText(value);
    if (cleanValue) search.set(key, cleanValue);
  });

  const query = search.toString();
  const base = appBaseUrl();
  if (!base) return `${pathname}${query ? `?${query}` : ""}`;

  const url = new URL(pathname, base);
  search.forEach((value, key) => url.searchParams.set(key, value));
  return url.toString();
}

function invitationRegisterUrl({ email, invitationId, type }) {
  return buildAppUrl("/register", {
    mode: "join",
    email: normalizeInviteEmail(email),
    invite: invitationId,
    type,
  });
}

function mailDocId(prefix, id) {
  return `${prefix}_${cleanText(id).replace(/\//g, "_")}`;
}

function mailPayload({
  id,
  kind,
  to,
  subject,
  text,
  html,
  familyId = "",
  custodyGroupId = "",
  invitationId = "",
  invitationCollection = "",
  createdBy = "",
  createdByEmail = "",
  metadata = {},
}) {
  const recipientEmail = normalizeInviteEmail(to);

  return {
    id,
    to: [recipientEmail],
    recipientEmail,
    message: {
      subject: cleanText(subject),
      text: cleanText(text),
      html: cleanText(html),
    },
    kind,
    status: "queued",
    familyId: cleanText(familyId),
    custodyGroupId: cleanText(custodyGroupId),
    invitationId: cleanText(invitationId),
    invitationCollection: cleanText(invitationCollection),
    createdBy: cleanText(createdBy),
    createdByEmail: normalizeInviteEmail(createdByEmail),
    metadata,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function invitationHtml({ heading, intro, actionUrl, fallbackText }) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 620px;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">${escapeHtml(heading)}</h1>
      <p style="font-size: 15px; margin: 0 0 18px;">${escapeHtml(intro)}</p>
      <p style="margin: 0 0 22px;">
        <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 14px; padding: 12px 18px; font-weight: 700;">
          Open invitation
        </a>
      </p>
      <p style="font-size: 13px; color: #475569; margin: 0 0 10px;">${escapeHtml(fallbackText)}</p>
      <p style="font-size: 12px; color: #64748b; word-break: break-all; margin: 0;">${escapeHtml(actionUrl)}</p>
    </div>
  `.trim();
}

export function buildFamilyInvitationEmailPayload({ invitation, familyName, inviterName = "Family admin" }) {
  const recipientEmail = normalizeInviteEmail(invitation?.recipientEmail || invitation?.recipient_email);
  const inviteId = cleanText(invitation?.id);
  const safeFamilyName = cleanText(familyName || invitation?.familyName || invitation?.family_name, "your family space");
  const safeInviterName = cleanText(inviterName, "Family admin");
  const actionUrl = invitationRegisterUrl({
    email: recipientEmail,
    invitationId: inviteId,
    type: FAMILY_INVITATION_KIND,
  });
  const subject = `You're invited to join ${safeFamilyName}`;
  const text = [
    `${safeInviterName} invited you to join ${safeFamilyName} on Kinely.`,
    "Create or sign in with this same email address so the app can match your invitation.",
    `Open the invitation: ${actionUrl}`,
  ].join("\n\n");
  const html = invitationHtml({
    heading: subject,
    intro: `${safeInviterName} invited you to join ${safeFamilyName} on Kinely. Use this same email address when creating or signing in to your account.`,
    actionUrl,
    fallbackText: "If the button does not work, copy and paste this link into your browser.",
  });

  return mailPayload({
    id: mailDocId("family_invitation", inviteId),
    kind: FAMILY_INVITATION_KIND,
    to: recipientEmail,
    subject,
    text,
    html,
    familyId: invitation?.familyId || invitation?.family_id,
    invitationId: inviteId,
    invitationCollection: "familyInvitations",
    createdBy: invitation?.createdBy || invitation?.created_by,
    createdByEmail: invitation?.createdByEmail || invitation?.created_by_email,
    metadata: {
      familyName: safeFamilyName,
      inviteType: invitation?.inviteType || invitation?.invite_type || invitation?.type || "",
    },
  });
}

export function buildCustodyInvitationEmailPayload({ invitation, groupName, inviterName = "Custody admin" }) {
  const recipientEmail = normalizeInviteEmail(invitation?.recipientEmail || invitation?.recipient_email);
  const inviteId = cleanText(invitation?.id);
  const custodyGroupId = cleanText(invitation?.groupId || invitation?.group_id || invitation?.custodyGroupId || invitation?.familyId || invitation?.family_id);
  const safeGroupName = cleanText(groupName || invitation?.groupName || invitation?.group_name, "your custody space");
  const safeInviterName = cleanText(inviterName, "Custody admin");
  const actionUrl = invitationRegisterUrl({
    email: recipientEmail,
    invitationId: inviteId,
    type: CUSTODY_INVITATION_KIND,
  });
  const subject = `You're invited to ${safeGroupName}`;
  const text = [
    `${safeInviterName} invited you to join ${safeGroupName} on Kinely.`,
    "Create or sign in with this same email address so the app can match your custody invitation.",
    `Open the invitation: ${actionUrl}`,
  ].join("\n\n");
  const html = invitationHtml({
    heading: subject,
    intro: `${safeInviterName} invited you to join ${safeGroupName} on Kinely. Use this same email address when creating or signing in to your account.`,
    actionUrl,
    fallbackText: "If the button does not work, copy and paste this link into your browser.",
  });

  return mailPayload({
    id: mailDocId("custody_invitation", inviteId),
    kind: CUSTODY_INVITATION_KIND,
    to: recipientEmail,
    subject,
    text,
    html,
    familyId: invitation?.householdFamilyId || invitation?.household_family_id || "",
    custodyGroupId,
    invitationId: inviteId,
    invitationCollection: "custodyInvitations",
    createdBy: invitation?.createdBy || invitation?.created_by,
    createdByEmail: invitation?.createdByEmail || invitation?.created_by_email,
    metadata: {
      groupName: safeGroupName,
      inviteType: invitation?.inviteType || invitation?.invite_type || invitation?.type || "",
      access: invitation?.access || invitation?.accessLevel || invitation?.access_level || "",
    },
  });
}

export function buildNotificationEmailPayload({
  id,
  to,
  subject,
  text,
  html = "",
  familyId = "",
  custodyGroupId = "",
  createdBy = "",
  createdByEmail = "",
  metadata = {},
}) {
  const safeId = cleanText(id, `notification_${Date.now()}`);
  const safeText = cleanText(text);

  return mailPayload({
    id: mailDocId("notification", safeId),
    kind: NOTIFICATION_KIND,
    to,
    subject,
    text: safeText,
    html: cleanText(html) || `<p>${escapeHtml(safeText).replace(/\n/g, "<br />")}</p>`,
    familyId,
    custodyGroupId,
    createdBy,
    createdByEmail,
    metadata,
  });
}

export async function queueEmailPayload(payload) {
  if (!payload?.id || !payload?.recipientEmail) return null;

  try {
    const result = await authorizedWorkerRequest("/emails/send", payload);
    if (result) {
      return result?.id || payload.id;
    }
  } catch (error) {
    console.warn("Kinely email Worker delivery failed; writing to Firestore mail queue.", error);
  }

  await setDoc(doc(db, MAIL_COLLECTION, payload.id), payload, { merge: true });
  return payload.id;
}

export async function sendFamilyInvitationViaWorker(options) {
  const result = await authorizedWorkerRequest("/invitations/family/send", options);
  return result || null;
}

export async function sendCustodyInvitationViaWorker(options) {
  const result = await authorizedWorkerRequest("/invitations/custody/send", options);
  return result || null;
}

export async function sendActivityNotificationViaWorker(options) {
  const result = await authorizedWorkerRequest("/notifications/activity/send", options);
  return result || null;
}

export async function sendAuthenticatedEmailTest(options = {}) {
  const result = await authorizedWorkerRequest("/diagnostics/email-test-auth", options);
  return result || null;
}

export async function queueFamilyInvitationEmail(options) {
  return queueEmailPayload(buildFamilyInvitationEmailPayload(options));
}

export async function queueCustodyInvitationEmail(options) {
  return queueEmailPayload(buildCustodyInvitationEmailPayload(options));
}

export async function queueNotificationEmail(options) {
  return queueEmailPayload(buildNotificationEmailPayload(options));
}
