import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

initializeApp();

const db = getFirestore();
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const MAIL_FROM = defineSecret("MAIL_FROM");
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REGION = "us-central1";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  channels: {
    inApp: true,
    email: true,
    push: false,
    sms: false,
  },
  notifyOn: {
    custodyCreated: true,
    custodyEdited: true,
    custodyDeleted: true,
    familyEventCreated: true,
    familyEventEdited: true,
    taskAssigned: true,
    taskCompleted: false,
    childCareUpdated: true,
    medicationOrAllergyUpdated: true,
    mealPlanUpdated: false,
    groceryItemAdded: false,
    invitationReceived: true,
    messageReceived: true,
  },
};

const IDENTITY_UPDATE_KEYS = new Set([
  "id",
  "docId",
  "doc_id",
  "documentId",
  "document_id",
  "firestoreId",
  "firestore_id",
  "legacyId",
  "legacy_id",
  "updatedAt",
  "updated_at",
]);

const userPreferenceCache = new Map();

function cleanText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function normalizeEmailList(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values]).map(normalizeEmail).filter(Boolean))];
}

function listOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function mapOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asEmailList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeEmail).filter(Boolean))];
  }

  const email = normalizeEmail(value);
  return email ? [email] : [];
}

function compactError(value) {
  const text = value instanceof Error ? value.message : cleanText(value, "Unknown email delivery error");
  return text.slice(0, 1200);
}

function stableJson(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function meaningfulChangedKeys(before = {}, after = {}, ignored = IDENTITY_UPDATE_KEYS) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys].filter((key) => !ignored.has(key) && stableJson(before?.[key]) !== stableJson(after?.[key]));
}

function appBaseUrl() {
  return cleanText(process.env.APP_PUBLIC_URL || process.env.VITE_APP_PUBLIC_URL).replace(/\/+$/g, "");
}

function appUrl(pathname = "/") {
  const base = appBaseUrl();
  if (!base) return pathname;

  try {
    return new URL(pathname, base).toString();
  } catch {
    return pathname;
  }
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function notificationEmailHtml({ title, body, actionUrl }) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 620px;">
      <p style="font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #4f46e5; margin: 0 0 8px;">Kinely</p>
      <h1 style="font-size: 24px; margin: 0 0 12px;">${escapeHtml(title)}</h1>
      <p style="font-size: 15px; margin: 0 0 18px;">${escapeHtml(body)}</p>
      <p style="margin: 0 0 22px;">
        <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 14px; padding: 12px 18px; font-weight: 700;">
          Open Kinely
        </a>
      </p>
      <p style="font-size: 12px; color: #64748b; word-break: break-all; margin: 0;">${escapeHtml(actionUrl)}</p>
    </div>
  `.trim();
}

function notificationDocId({ kind, entityId, recipientEmail, dedupeKey = "" }) {
  const seed = dedupeKey || `${entityId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return [kind, seed, recipientEmail]
    .map((part) => cleanText(part, "notification").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120))
    .join("_");
}

function mergePreferences(saved = {}) {
  return {
    channels: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
      ...mapOrEmpty(saved.channels),
    },
    notifyOn: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.notifyOn,
      ...mapOrEmpty(saved.notifyOn || saved.notify_on),
    },
  };
}

async function loadUserByEmail(email) {
  const recipientEmail = normalizeEmail(email);
  if (!recipientEmail) return null;
  if (userPreferenceCache.has(recipientEmail)) return userPreferenceCache.get(recipientEmail);

  const queries = await Promise.allSettled([
    db.collection("users").where("email", "==", recipientEmail).limit(1).get(),
    db.collection("users").where("notificationEmail", "==", recipientEmail).limit(1).get(),
  ]);

  for (const result of queries) {
    if (result.status === "fulfilled" && !result.value.empty) {
      const snap = result.value.docs[0];
      const userDoc = { uid: snap.id, ...snap.data() };
      userPreferenceCache.set(recipientEmail, userDoc);
      return userDoc;
    }
  }

  userPreferenceCache.set(recipientEmail, null);
  return null;
}

async function preferencesForRecipient(candidate = {}) {
  const embeddedPrefs = candidate.notificationPreferences || candidate.notification_preferences;
  if (embeddedPrefs) return mergePreferences(embeddedPrefs);

  const userDoc = await loadUserByEmail(candidate.email);
  return mergePreferences(userDoc?.notificationPreferences || userDoc?.notification_preferences || {});
}

function addCandidate(map, candidate = {}) {
  const email = normalizeEmail(candidate.email || candidate.recipientEmail || candidate.recipient_email);
  if (!email) return;
  const existing = map.get(email) || {};
  map.set(email, {
    ...existing,
    ...candidate,
    email,
    uid: candidate.uid || candidate.userId || candidate.user_id || existing.uid || "",
    personId: candidate.personId || candidate.person_id || candidate.id || existing.personId || "",
    name: candidate.name || candidate.displayName || candidate.display_name || existing.name || email,
  });
}

function recipientsFromFamily(family = {}) {
  const map = new Map();

  addCandidate(map, {
    email: family.ownerEmail || family.owner_email || family.createdByEmail || family.created_by_email,
    uid: family.ownerId || family.owner_id,
    personId: family.parent1PersonId || family.parent1_person_id,
    name: family.parent1Name || family.parent1_name || "Family owner",
  });

  addCandidate(map, {
    email: family.parent2Email || family.parent2_email,
    personId: family.parent2PersonId || family.parent2_person_id,
    name: family.parent2Name || family.parent2_name || "Co-parent",
  });

  listOrEmpty(family.members).forEach((member) => addCandidate(map, member));
  normalizeEmailList([
    ...listOrEmpty(family.memberEmails),
    ...listOrEmpty(family.member_emails),
    ...listOrEmpty(family.adminEmails),
    ...listOrEmpty(family.admin_emails),
  ]).forEach((email) => addCandidate(map, { email }));

  return [...map.values()];
}

function recipientsFromCustodyGroup(group = {}, family = {}) {
  const map = new Map();

  recipientsFromFamily(family).forEach((candidate) => addCandidate(map, candidate));
  addCandidate(map, {
    email: group.ownerEmail || group.owner_email || group.createdByEmail || group.created_by_email,
    uid: group.ownerId || group.owner_id,
    name: group.ownerName || group.owner_name || "Custody owner",
  });

  listOrEmpty(group.parents).forEach((parent) => addCandidate(map, parent));
  listOrEmpty(group.coParents).forEach((parent) => addCandidate(map, parent));
  listOrEmpty(group.members).forEach((member) => addCandidate(map, member));

  normalizeEmailList([
    ...listOrEmpty(group.memberEmails),
    ...listOrEmpty(group.member_emails),
    ...listOrEmpty(group.viewerEmails),
    ...listOrEmpty(group.viewer_emails),
    ...listOrEmpty(group.custodyReaderEmails),
    ...listOrEmpty(group.custody_reader_emails),
    ...listOrEmpty(group.custodyWriterEmails),
    ...listOrEmpty(group.custody_writer_emails),
    ...listOrEmpty(group.adminEmails),
    ...listOrEmpty(group.admin_emails),
  ]).forEach((email) => addCandidate(map, { email }));

  return [...map.values()];
}

function filterRecipientsByEmails(candidates = [], emails = []) {
  const emailSet = new Set(normalizeEmailList(emails));
  if (!emailSet.size) return [];
  return candidates.filter((candidate) => emailSet.has(normalizeEmail(candidate.email)));
}

function filterRecipientsByPersonIds(candidates = [], personIds = []) {
  const idSet = new Set(listOrEmpty(personIds).map((id) => cleanText(id)).filter(Boolean));
  if (!idSet.size) return [];
  return candidates.filter((candidate) => idSet.has(cleanText(candidate.personId || candidate.id || candidate.uid)));
}

function eventRecipients(eventData = {}, family = {}) {
  const notify = mapOrEmpty(eventData.notify || eventData.notifications);
  const target = cleanText(notify.target || notify.notificationTarget || notify.notification_target);
  const candidates = recipientsFromFamily(family);

  if (notify.enabled === false || target === "no_one" || target === "none") return [];

  const selectedEmails = normalizeEmailList([
    ...listOrEmpty(notify.recipients),
    ...listOrEmpty(notify.selectedRecipients),
    ...listOrEmpty(notify.selected_recipients),
    ...listOrEmpty(eventData.notifyRecipients),
    ...listOrEmpty(eventData.notify_recipients),
  ]);
  if (selectedEmails.length) return filterRecipientsByEmails(candidates, selectedEmails);

  const notifyPersonIds = [
    ...listOrEmpty(notify.personIds),
    ...listOrEmpty(notify.person_ids),
  ];
  const selectedPeople = filterRecipientsByPersonIds(candidates, notifyPersonIds);
  if (selectedPeople.length) return selectedPeople;

  const visibleTo = normalizeEmailList(eventData.visibleTo || eventData.visible_to || eventData.audience?.visibleTo);
  if ((target === "all_visible" || target === "visible_people") && visibleTo.length) return filterRecipientsByEmails(candidates, visibleTo);
  if (target === "all_visible" || target === "visible_people") return candidates;

  return [];
}

function assignedTaskRecipients(taskData = {}, family = {}) {
  const candidates = recipientsFromFamily(family);
  const assigneeEmail = normalizeEmail(taskData.assignedToPersonEmail || taskData.assigned_to_person_email);
  if (assigneeEmail) return filterRecipientsByEmails(candidates, [assigneeEmail]);

  const assigneeId = taskData.assignedToPersonId || taskData.assigned_to_person_id;
  if (!assigneeId || assigneeId === "family") return [];

  return filterRecipientsByPersonIds(candidates, [assigneeId]);
}

function isCompletedTask(taskData = {}) {
  const status = cleanText(taskData.status).toLowerCase();
  return status === "done" || status === "completed" || taskData.completed === true || Boolean(taskData.completedAt || taskData.completed_at);
}

async function loadFamily(familyId) {
  const id = cleanText(familyId);
  if (!id) return null;
  const snap = await db.collection("families").doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function loadCustodyGroup(groupId) {
  const id = cleanText(groupId);
  if (!id) return null;
  const snap = await db.collection("custodyGroups").doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function dispatchPreferenceNotifications({
  prefKey,
  kind,
  title,
  body,
  recipients = [],
  familyId = "",
  custodyGroupId = "",
  scopeType = "family",
  module = "notifications",
  entityType = "",
  entityId = "",
  actionUrl = "/profile?tab=notifications",
  actorUid = "",
  actorEmail = "",
  dedupeKey = "",
  metadata = {},
}) {
  const actor = normalizeEmail(actorEmail);
  const recipientMap = new Map();
  recipients.forEach((recipient) => addCandidate(recipientMap, recipient));
  const cleanRecipients = [...recipientMap.values()].filter((recipient) => normalizeEmail(recipient.email) !== actor);
  if (!cleanRecipients.length) return { notifications: 0, emails: 0 };

  const batch = db.batch();
  let notificationCount = 0;
  let emailCount = 0;
  const absoluteActionUrl = appUrl(actionUrl);

  for (const recipient of cleanRecipients) {
    const prefs = await preferencesForRecipient(recipient);
    if (prefs.notifyOn?.[prefKey] !== true) continue;

    const recipientEmail = normalizeEmail(recipient.email);
    const baseId = notificationDocId({
      kind,
      entityId,
      recipientEmail,
      dedupeKey,
    });

    if (prefs.channels?.inApp !== false) {
      const ref = db.collection("notifications").doc(baseId);
      batch.set(ref, {
        id: baseId,
        kind,
        title,
        body,
        recipientEmail,
        recipient_email: recipientEmail,
        recipientUid: recipient.uid || "",
        recipient_uid: recipient.uid || "",
        familyId: cleanText(familyId),
        family_id: cleanText(familyId),
        custodyGroupId: cleanText(custodyGroupId),
        custody_group_id: cleanText(custodyGroupId),
        scopeType,
        scope_type: scopeType,
        module,
        entityType,
        entity_type: entityType,
        entityId,
        entity_id: entityId,
        actionUrl: absoluteActionUrl,
        action_url: absoluteActionUrl,
        status: "unread",
        read: false,
        readBy: [],
        read_by: [],
        channels: {
          inApp: true,
          email: prefs.channels?.email === true,
        },
        createdBy: cleanText(actorUid, "system"),
        created_by: cleanText(actorUid, "system"),
        createdByEmail: actor,
        created_by_email: actor,
        metadata,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      notificationCount += 1;
    }

    if (prefs.channels?.email === true) {
      const mailRef = db.collection("mail").doc(`mail_${baseId}`);
      if (dedupeKey) {
        const existingMail = await mailRef.get();
        if (existingMail.exists) continue;
      }

      const text = `${body}\n\nOpen Kinely: ${absoluteActionUrl}`;
      batch.set(mailRef, {
        id: `mail_${baseId}`,
        to: [recipientEmail],
        recipientEmail,
        message: {
          subject: title,
          text,
          html: notificationEmailHtml({ title, body, actionUrl: absoluteActionUrl }),
        },
        kind: "notification",
        status: "queued",
        familyId: cleanText(familyId),
        custodyGroupId: cleanText(custodyGroupId),
        invitationId: "",
        invitationCollection: "",
        createdBy: cleanText(actorUid, "system"),
        createdByEmail: actor,
        metadata,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      emailCount += 1;
    }
  }

  if (notificationCount || emailCount) await batch.commit();
  return { notifications: notificationCount, emails: emailCount };
}

async function dispatchFamilyEventNotification(eventData = {}, eventId = "", prefKey = "familyEventCreated") {
  const familyId = eventData.familyId || eventData.family_id;
  const family = await loadFamily(familyId);
  if (!family) return;

  const title = cleanText(eventData.title, "Family event");
  const date = cleanText(eventData.date || eventData.startDate || eventData.start_date);
  await dispatchPreferenceNotifications({
    prefKey,
    kind: prefKey === "familyEventCreated" ? "family_event_created" : "family_event_updated",
    title: prefKey === "familyEventCreated" ? `New event: ${title}` : `Event updated: ${title}`,
    body: date ? `${title} is scheduled for ${date}.` : `${title} was updated in the family calendar.`,
    recipients: eventRecipients(eventData, family),
    familyId,
    scopeType: "family",
    module: "calendar",
    entityType: "familyEvent",
    entityId: eventId,
    actionUrl: `/calendar?eventId=${encodeURIComponent(eventId)}`,
    actorUid: eventData.updatedBy || eventData.updated_by || eventData.createdByUid || eventData.created_by_uid || eventData.createdBy || eventData.created_by,
    actorEmail: eventData.updatedByEmail || eventData.updated_by_email || eventData.createdByEmail || eventData.created_by_email,
    metadata: { date, eventTitle: title },
  });
}

async function dispatchTaskAssignedNotification(taskData = {}, taskId = "") {
  const familyId = taskData.familyId || taskData.family_id;
  const family = await loadFamily(familyId);
  if (!family) return;

  const taskTitle = cleanText(taskData.title, "Task");
  await dispatchPreferenceNotifications({
    prefKey: "taskAssigned",
    kind: "task_assigned",
    title: `Task assigned: ${taskTitle}`,
    body: cleanText(taskData.dueDate || taskData.due_date)
      ? `${taskTitle} is due ${cleanText(taskData.dueDate || taskData.due_date)}.`
      : `${taskTitle} was assigned in Tasks.`,
    recipients: assignedTaskRecipients(taskData, family),
    familyId,
    scopeType: "family",
    module: "tasks",
    entityType: "task",
    entityId: taskId,
    actionUrl: `/tasks?taskId=${encodeURIComponent(taskId)}`,
    actorUid: taskData.updatedBy || taskData.updated_by || taskData.createdBy || taskData.created_by,
    actorEmail: taskData.updatedByEmail || taskData.updated_by_email || taskData.createdByEmail || taskData.created_by_email,
    metadata: {
      assignedToPersonId: taskData.assignedToPersonId || taskData.assigned_to_person_id || "",
      assignedToPersonName: taskData.assignedToPersonName || taskData.assigned_to_person_name || "",
    },
  });
}

async function dispatchTaskCompletedNotification(taskData = {}, taskId = "") {
  const familyId = taskData.familyId || taskData.family_id;
  const family = await loadFamily(familyId);
  if (!family) return;

  const taskTitle = cleanText(taskData.title, "Task");
  await dispatchPreferenceNotifications({
    prefKey: "taskCompleted",
    kind: "task_completed",
    title: `Task completed: ${taskTitle}`,
    body: `${taskTitle} was marked complete.`,
    recipients: recipientsFromFamily(family),
    familyId,
    scopeType: "family",
    module: "tasks",
    entityType: "task",
    entityId: taskId,
    actionUrl: `/tasks?taskId=${encodeURIComponent(taskId)}`,
    actorUid: taskData.updatedBy || taskData.updated_by || taskData.completedBy || taskData.completed_by || taskData.createdBy || taskData.created_by,
    actorEmail: taskData.updatedByEmail || taskData.updated_by_email || taskData.completedByEmail || taskData.completed_by_email || taskData.createdByEmail || taskData.created_by_email,
  });
}

async function dispatchCustodyDayNotification(dayData = {}, dayId = "", prefKey = "custodyEdited") {
  const custodyGroupId = dayData.custodyGroupId || dayData.custody_group_id || dayData.familyId || dayData.family_id;
  const group = await loadCustodyGroup(custodyGroupId);
  const householdFamilyId = dayData.householdFamilyId || dayData.household_family_id || group?.householdFamilyId || group?.household_family_id || group?.familyId || group?.family_id || "";
  const family = householdFamilyId ? await loadFamily(householdFamilyId) : null;
  const date = cleanText(dayData.date);
  const groupName = cleanText(group?.name || dayData.custodyGroupName || dayData.custody_group_name, "Custody schedule");
  const bulkRunId = cleanText(dayData.bulkRunId || dayData.bulk_run_id);

  await dispatchPreferenceNotifications({
    prefKey,
    kind: prefKey === "custodyCreated" ? "custody_day_created" : prefKey === "custodyDeleted" ? "custody_day_deleted" : "custody_day_updated",
    title: prefKey === "custodyCreated" ? "Custody day added" : prefKey === "custodyDeleted" ? "Custody day removed" : "Custody day updated",
    body: date ? `${groupName} changed for ${date}.` : `${groupName} changed.`,
    recipients: recipientsFromCustodyGroup(group || {}, family || {}),
    familyId: householdFamilyId,
    custodyGroupId,
    scopeType: "custody",
    module: "custody",
    entityType: "custodyDay",
    entityId: dayId,
    actionUrl: "/custody",
    actorUid: dayData.updatedBy || dayData.updated_by || dayData.createdBy || dayData.created_by || dayData.userId || dayData.user_id,
    actorEmail: dayData.updatedByEmail || dayData.updated_by_email || dayData.createdByEmail || dayData.created_by_email,
    dedupeKey: bulkRunId ? `${prefKey}_${bulkRunId}` : "",
    metadata: { date, groupName, bulkRunId },
  });
}

function parseMessage(data = {}) {
  const message = data.message && typeof data.message === "object" ? data.message : {};
  const to = asEmailList(data.to || data.recipientEmail);
  const subject = cleanText(message.subject);
  const text = cleanText(message.text);
  const html = cleanText(message.html);

  if (!to.length) throw new Error("mail.to must include at least one recipient.");
  if (!subject) throw new Error("mail.message.subject is required.");
  if (!text && !html) throw new Error("mail.message.text or mail.message.html is required.");

  return {
    to,
    subject,
    text,
    html,
  };
}

async function sendWithResend({ from, to, subject, text, html, mailId }) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
      headers: {
        "X-Kinely-Mail-Id": mailId,
      },
    }),
  });

  const bodyText = await response.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }

  if (!response.ok) {
    throw new Error(`Resend delivery failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }

  return body;
}

export const deliverQueuedEmail = onDocumentCreated(
  {
    document: "mail/{mailId}",
    region: REGION,
    secrets: [RESEND_API_KEY, MAIL_FROM],
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const mailId = event.params.mailId;
    const mailRef = db.collection("mail").doc(mailId);
    const data = snap.data() || {};

    if (data.status && data.status !== "queued") {
      logger.info("Skipping non-queued mail document.", { mailId, status: data.status });
      return;
    }

    try {
      const message = parseMessage(data);
      const from = cleanText(MAIL_FROM.value());
      if (!from) throw new Error("MAIL_FROM secret is required.");
      if (!RESEND_API_KEY.value()) throw new Error("RESEND_API_KEY secret is required.");

      await mailRef.update({
        status: "processing",
        provider: "resend",
        processingAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        deliveryAttempts: FieldValue.increment(1),
      });

      const providerResult = await sendWithResend({
        from,
        ...message,
        mailId,
      });

      await mailRef.update({
        status: "sent",
        provider: "resend",
        providerMessageId: cleanText(providerResult?.id),
        providerResponse: providerResult,
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastError: FieldValue.delete(),
        erroredAt: FieldValue.delete(),
      });

      logger.info("Queued email sent.", {
        mailId,
        kind: data.kind || "",
        toCount: message.to.length,
      });
    } catch (error) {
      logger.error("Queued email delivery failed.", {
        mailId,
        kind: data.kind || "",
        error: compactError(error),
      });

      await mailRef.update({
        status: "error",
        provider: "resend",
        lastError: compactError(error),
        erroredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
);

export const notifyFamilyEventCreated = onDocumentCreated(
  {
    document: "familyEvents/{eventId}",
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    try {
      await dispatchFamilyEventNotification(data, event.params.eventId, "familyEventCreated");
    } catch (error) {
      logger.error("Family event create notification failed.", {
        eventId: event.params.eventId,
        error: compactError(error),
      });
    }
  }
);

export const notifyFamilyEventUpdated = onDocumentUpdated(
  {
    document: "familyEvents/{eventId}",
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    if (!meaningfulChangedKeys(before, after).length) return;

    try {
      await dispatchFamilyEventNotification(after, event.params.eventId, "familyEventEdited");
    } catch (error) {
      logger.error("Family event update notification failed.", {
        eventId: event.params.eventId,
        error: compactError(error),
      });
    }
  }
);

export const notifyTaskCreated = onDocumentCreated(
  {
    document: "tasks/{taskId}",
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    try {
      await dispatchTaskAssignedNotification(data, event.params.taskId);
    } catch (error) {
      logger.error("Task create notification failed.", {
        taskId: event.params.taskId,
        error: compactError(error),
      });
    }
  }
);

export const notifyTaskUpdated = onDocumentUpdated(
  {
    document: "tasks/{taskId}",
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const changedKeys = meaningfulChangedKeys(before, after);
    if (!changedKeys.length) return;

    try {
      const beforeAssignee = before.assignedToPersonId || before.assigned_to_person_id || "";
      const afterAssignee = after.assignedToPersonId || after.assigned_to_person_id || "";

      if (!isCompletedTask(before) && isCompletedTask(after)) {
        await dispatchTaskCompletedNotification(after, event.params.taskId);
        return;
      }

      if (beforeAssignee !== afterAssignee && afterAssignee && afterAssignee !== "family") {
        await dispatchTaskAssignedNotification(after, event.params.taskId);
      }
    } catch (error) {
      logger.error("Task update notification failed.", {
        taskId: event.params.taskId,
        error: compactError(error),
      });
    }
  }
);

export const notifyCustodyDayCreated = onDocumentCreated(
  {
    document: "custodyDays/{dayId}",
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    try {
      await dispatchCustodyDayNotification(data, event.params.dayId, "custodyCreated");
    } catch (error) {
      logger.error("Custody day create notification failed.", {
        dayId: event.params.dayId,
        error: compactError(error),
      });
    }
  }
);

export const notifyCustodyDayUpdated = onDocumentUpdated(
  {
    document: "custodyDays/{dayId}",
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    if (!meaningfulChangedKeys(before, after).length) return;

    try {
      await dispatchCustodyDayNotification(after, event.params.dayId, "custodyEdited");
    } catch (error) {
      logger.error("Custody day update notification failed.", {
        dayId: event.params.dayId,
        error: compactError(error),
      });
    }
  }
);

export const notifyCustodyDayDeleted = onDocumentDeleted(
  {
    document: "custodyDays/{dayId}",
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    try {
      await dispatchCustodyDayNotification(data, event.params.dayId, "custodyDeleted");
    } catch (error) {
      logger.error("Custody day delete notification failed.", {
        dayId: event.params.dayId,
        error: compactError(error),
      });
    }
  }
);
