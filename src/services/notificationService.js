import {
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { normalizeInviteEmail } from "@/lib/invitationUtils";

const NOTIFICATIONS_COLLECTION = "notifications";

function cleanText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function notificationPayload({
  id,
  kind,
  title,
  body,
  recipientEmail,
  recipientUid = "",
  familyId = "",
  custodyGroupId = "",
  scopeType = "family",
  module = "notifications",
  entityType = "",
  entityId = "",
  actionUrl = "/profile?tab=notifications",
  createdBy = "",
  createdByEmail = "",
  metadata = {},
}) {
  const cleanRecipientEmail = normalizeInviteEmail(recipientEmail);

  return {
    id,
    kind: cleanText(kind, "notification"),
    title: cleanText(title, "New notification"),
    body: cleanText(body),
    recipientEmail: cleanRecipientEmail,
    recipient_email: cleanRecipientEmail,
    recipientUid: cleanText(recipientUid),
    recipient_uid: cleanText(recipientUid),
    familyId: cleanText(familyId),
    family_id: cleanText(familyId),
    custodyGroupId: cleanText(custodyGroupId),
    custody_group_id: cleanText(custodyGroupId),
    scopeType,
    scope_type: scopeType,
    module,
    entityType,
    entity_type: entityType,
    entityId: cleanText(entityId),
    entity_id: cleanText(entityId),
    actionUrl,
    action_url: actionUrl,
    status: "unread",
    read: false,
    readBy: [],
    read_by: [],
    channels: {
      inApp: true,
      email: false,
    },
    createdBy: cleanText(createdBy),
    created_by: cleanText(createdBy),
    createdByEmail: normalizeInviteEmail(createdByEmail),
    created_by_email: normalizeInviteEmail(createdByEmail),
    metadata,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function normalizeNotification(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    ...data,
    title: data.title || "Notification",
    body: data.body || data.description || "",
    recipientEmail: data.recipientEmail || data.recipient_email || "",
    familyId: data.familyId || data.family_id || "",
    custodyGroupId: data.custodyGroupId || data.custody_group_id || "",
    actionUrl: data.actionUrl || data.action_url || "",
    status: data.status || (data.read ? "read" : "unread"),
    createdAt: data.createdAt || data.created_at || null,
  };
}

export async function queueInAppNotification(options) {
  const recipientEmail = normalizeInviteEmail(options?.recipientEmail);
  if (!recipientEmail || !options?.title) return null;

  const notificationRef = options.id
    ? doc(db, NOTIFICATIONS_COLLECTION, options.id)
    : doc(collection(db, NOTIFICATIONS_COLLECTION));
  const id = options.id || notificationRef.id;
  const payload = notificationPayload({
    ...options,
    id,
    recipientEmail,
  });

  await setDoc(notificationRef, payload);
  return id;
}

export async function queueInAppNotifications(notifications = []) {
  const validNotifications = notifications
    .map((item) => ({
      ...item,
      recipientEmail: normalizeInviteEmail(item?.recipientEmail),
    }))
    .filter((item) => item.recipientEmail && item.title);

  if (!validNotifications.length) return [];

  const batch = writeBatch(db);
  const ids = [];

  validNotifications.forEach((item) => {
    const notificationRef = item.id
      ? doc(db, NOTIFICATIONS_COLLECTION, item.id)
      : doc(collection(db, NOTIFICATIONS_COLLECTION));
    const id = item.id || notificationRef.id;
    ids.push(id);
    batch.set(
      notificationRef,
      notificationPayload({ ...item, id })
    );
  });

  await batch.commit();
  return ids;
}

export function buildFamilyInvitationNotification({ invitation, familyName, inviterName = "Family admin" }) {
  const recipientEmail = normalizeInviteEmail(invitation?.recipientEmail || invitation?.recipient_email);
  const invitationId = cleanText(invitation?.id);
  const safeFamilyName = cleanText(familyName || invitation?.familyName || invitation?.family_name, "a family space");
  const safeInviterName = cleanText(inviterName, "Family admin");

  return {
    kind: "family_invitation",
    title: `Invitation to ${safeFamilyName}`,
    body: `${safeInviterName} invited you to join ${safeFamilyName}.`,
    recipientEmail,
    familyId: invitation?.familyId || invitation?.family_id || "",
    scopeType: "family",
    module: "notifications",
    entityType: "familyInvitation",
    entityId: invitationId,
    actionUrl: "/profile?tab=invitations",
    createdBy: invitation?.createdBy || invitation?.created_by || "",
    createdByEmail: invitation?.createdByEmail || invitation?.created_by_email || "",
    metadata: {
      familyName: safeFamilyName,
      invitationId,
    },
  };
}

export function buildCustodyInvitationNotification({ invitation, groupName, inviterName = "Custody admin" }) {
  const recipientEmail = normalizeInviteEmail(invitation?.recipientEmail || invitation?.recipient_email);
  const invitationId = cleanText(invitation?.id);
  const custodyGroupId = cleanText(invitation?.groupId || invitation?.group_id || invitation?.custodyGroupId || invitation?.familyId || invitation?.family_id);
  const safeGroupName = cleanText(groupName || invitation?.groupName || invitation?.group_name, "a custody space");
  const safeInviterName = cleanText(inviterName, "Custody admin");

  return {
    kind: "custody_invitation",
    title: `Custody invitation to ${safeGroupName}`,
    body: `${safeInviterName} invited you to join ${safeGroupName}.`,
    recipientEmail,
    familyId: invitation?.householdFamilyId || invitation?.household_family_id || "",
    custodyGroupId,
    scopeType: "custody",
    module: "notifications",
    entityType: "custodyInvitation",
    entityId: invitationId,
    actionUrl: "/profile?tab=invitations",
    createdBy: invitation?.createdBy || invitation?.created_by || "",
    createdByEmail: invitation?.createdByEmail || invitation?.created_by_email || "",
    metadata: {
      groupName: safeGroupName,
      invitationId,
      access: invitation?.access || invitation?.accessLevel || invitation?.access_level || "",
    },
  };
}

export function queueFamilyInvitationNotification(options) {
  return queueInAppNotification(buildFamilyInvitationNotification(options));
}

export function queueCustodyInvitationNotifications({ invitations = [], groupName, inviterName }) {
  return queueInAppNotifications(
    invitations.map((invitation) =>
      buildCustodyInvitationNotification({ invitation, groupName, inviterName })
    )
  );
}

export function subscribeUserNotifications({ email, limitCount = 25, onChange, onError }) {
  const recipientEmail = normalizeInviteEmail(email);
  if (!recipientEmail) {
    onChange?.([]);
    return () => {};
  }

  const notificationsQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("recipientEmail", "==", recipientEmail),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onChange?.(snapshot.docs.map(normalizeNotification));
    },
    (error) => {
      console.error("Error loading notifications:", error);
      onError?.(error);
    }
  );
}

export async function markNotificationRead(notificationId, user) {
  if (!notificationId) return;

  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
    status: "read",
    read: true,
    readAt: serverTimestamp(),
    read_by: arrayUnion(user?.uid || user?.email || "user"),
    readBy: arrayUnion(user?.uid || user?.email || "user"),
    updatedAt: serverTimestamp(),
  });
}

export async function markNotificationsRead(notifications = [], user) {
  const unread = notifications.filter((notification) => notification.status !== "read");
  await Promise.all(unread.map((notification) => markNotificationRead(notification.id, user)));
}
