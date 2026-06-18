import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { sendActivityNotificationViaWorker } from "@/services/emailQueueService";
import { queueInAppNotification } from "@/services/notificationService";

function actorName(profile, user) {
  return (
    profile?.displayName ||
    profile?.name ||
    profile?.firstName ||
    user?.displayName ||
    user?.email ||
    "Someone"
  );
}

function normalizeDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmailList(values = []) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map(normalizeEmail).filter(Boolean)));
}

function listFrom(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function normalizeNotifyPayload(notify = null) {
  if (!notify || typeof notify !== "object") return null;
  const recipients = normalizeEmailList([
    ...(Array.isArray(notify.recipients) ? notify.recipients : []),
    ...(Array.isArray(notify.selectedRecipients) ? notify.selectedRecipients : []),
    ...(Array.isArray(notify.selected_recipients) ? notify.selected_recipients : []),
  ]);

  if (!recipients.length) return null;

  return {
    enabled: notify.enabled !== false,
    target: notify.target || "selected",
    recipients,
    selectedRecipients: normalizeEmailList(notify.selectedRecipients || notify.selected_recipients || recipients),
  };
}

function activityPreferenceKey(type = "", moduleName = "") {
  if (moduleName === "tasks" || type.startsWith("task_")) {
    return type === "task_completed" ? "taskCompleted" : "taskAssigned";
  }

  if (moduleName === "calendar" || type.startsWith("event_")) {
    return type.includes("updated") || type.includes("edited")
      ? "familyEventEdited"
      : "familyEventCreated";
  }

  if (moduleName === "budget" || type.includes("custody_budget")) {
    if (type.includes("deleted")) return "budgetExpenseDeleted";
    if (type.includes("updated") || type.includes("edited")) return "budgetExpenseEdited";
    return "budgetExpenseCreated";
  }

  if (
    moduleName === "custody" ||
    type.includes("custody") ||
    type.includes("special_event") ||
    type.includes("travel_plan")
  ) {
    if (type.includes("deleted")) return "custodyDeleted";
    if (type.includes("updated") || type.includes("edited")) return "custodyEdited";
    return "custodyCreated";
  }

  if (moduleName === "meals" || type.includes("meal")) return "mealPlanUpdated";
  if (["lists", "groceries"].includes(moduleName) || type.includes("grocery") || type.includes("list")) {
    return "groceryItemAdded";
  }
  if (type.includes("child") || type.includes("care")) return "childCareUpdated";

  return "notification";
}

function activityActionUrl(moduleName = "", entityId = "") {
  if (moduleName === "tasks") return "/tasks";
  if (moduleName === "meals") return "/meals";
  if (["lists", "groceries"].includes(moduleName)) return "/lists";
  if (moduleName === "custody") return "/custody";
  if (moduleName === "calendar") {
    return entityId ? `/calendar?eventId=${encodeURIComponent(entityId)}` : "/calendar";
  }

  return "/profile?tab=notifications";
}

async function queueLocalActivityFallback({ activity, user, reason }) {
  const recipientEmail = user?.email || activity?.actorEmail || activity?.createdByEmail || "";
  if (!recipientEmail || !activity?.title) return null;

  return queueInAppNotification({
    kind: activityPreferenceKey(activity.type, activity.module),
    title: activity.title,
    body: activity.description || "Kinely saved this update.",
    recipientEmail,
    recipientUid: user?.uid || activity?.actorId || "",
    familyId: activity.householdFamilyId || activity.familyId || "",
    custodyGroupId: activity.custodyGroupId || "",
    scopeType: activity.custodyGroupId ? "custody" : "family",
    module: activity.module || "notifications",
    entityType: activity.entityType || "",
    entityId: activity.entityId || "",
    actionUrl: activityActionUrl(activity.module, activity.entityId),
    createdBy: user?.uid || activity.actorId || "",
    createdByEmail: user?.email || activity.actorEmail || "",
    metadata: {
      activityId: activity.id || "",
      fallback: true,
      reason: reason || "worker_unavailable",
    },
  });
}

function didWorkerCreateVisibleNotification(result) {
  if (!result) return false;
  if (result.skipped === true) return false;

  const inAppCount = Number(result.inAppCount ?? result.in_app_count ?? 0);
  return Number.isFinite(inAppCount) && inAppCount > 0;
}

export async function logFamilyActivity({
  familyId,
  custodyScopeFields = {},
  user,
  profile,
  module = "",
  type,
  title,
  description = "",
  entityType = "",
  entityId = "",
  date = "",
  visibility = "",
  visibleTo = [],
  notify = null,
  targetRecipientEmails = [],
  targetRecipientUids = [],
  metadata = {},
}) {
  const activityFamilyId = familyId || custodyScopeFields.familyId || custodyScopeFields.custodyGroupId || "";
  if (!activityFamilyId || !user?.uid || !type || !title) return null;

  try {
    const custodyGroupId = custodyScopeFields.custodyGroupId || "";
    const householdFamilyId = custodyScopeFields.householdFamilyId || "";
    const custodyGroupName = custodyScopeFields.custodyGroupName || "";
    const effectiveModule = module || (custodyGroupId ? "custody" : "home");
    const effectiveVisibility = visibility || (custodyGroupId ? "custody" : "family");
    const notifyPayload = normalizeNotifyPayload(notify);
    const recipientEmails = normalizeEmailList([
      ...listFrom(targetRecipientEmails),
      ...(notifyPayload?.recipients || []),
    ]);
    const recipientUids = Array.from(new Set(listFrom(targetRecipientUids).filter(Boolean)));
    const activityPayload = {
      familyId: activityFamilyId,
      family_id: activityFamilyId,
      ...(custodyGroupId
        ? {
            custodyGroupId,
            custody_group_id: custodyGroupId,
            householdFamilyId,
            household_family_id: householdFamilyId,
            custodyGroupName,
            custody_group_name: custodyGroupName,
          }
        : {}),
      module: effectiveModule,
      visibility: effectiveVisibility,
      visibleTo: normalizeEmailList(visibleTo),
      visible_to: normalizeEmailList(visibleTo),
      ...(notifyPayload ? { notify: notifyPayload } : {}),
      ...(recipientEmails.length
        ? {
            recipientEmails,
            recipient_emails: recipientEmails,
            targetRecipientEmails: recipientEmails,
            target_recipient_emails: recipientEmails,
          }
        : {}),
      ...(recipientUids.length
        ? {
            recipientUids,
            recipient_uids: recipientUids,
            targetRecipientUids: recipientUids,
            target_recipient_uids: recipientUids,
          }
        : {}),
      type,
      title,
      description,
      entityType,
      entityId,
      date: normalizeDateKey(date),
      metadata,
      createdBy: user.uid,
      createdByEmail: user.email || null,
      actorId: user.uid,
      actorEmail: user.email || null,
      actorName: actorName(profile, user),
      notificationTarget: notifyPayload?.target || "",
      notification_target: notifyPayload?.target || "",
    };

    const activityRef = await addDoc(collection(db, "familyActivity"), {
      ...activityPayload,
      notificationStatus: "pending",
      notification_status: "pending",
      createdAt: serverTimestamp(),
      readBy: [],
    });

    void sendActivityNotificationViaWorker({
      activity: {
        id: activityRef.id,
        ...activityPayload,
      },
    })
      .then((result) => {
        if (didWorkerCreateVisibleNotification(result)) return null;

        return queueLocalActivityFallback({
          activity: {
            id: activityRef.id,
            ...activityPayload,
          },
          user,
          reason: result ? "worker_created_no_in_app_notification" : "worker_not_configured",
        });
      })
      .catch((error) => {
        console.warn("Could not send activity notifications; creating local in-app fallback.", {
          message: error?.message || String(error),
          familyId: activityFamilyId,
          module: effectiveModule,
          type,
        });

        return queueLocalActivityFallback({
          activity: {
            id: activityRef.id,
            ...activityPayload,
          },
          user,
          reason: error?.message || "worker_failed",
        });
      })
      .catch((fallbackError) => {
        console.warn("Could not create local activity notification fallback.", {
          message: fallbackError?.message || String(fallbackError),
          familyId: activityFamilyId,
          module: effectiveModule,
          type,
        });
      });

    return activityRef;
  } catch (error) {
    console.warn("Could not log family activity:", error);
    return null;
  }
}

export function queueFamilyActivity(payload) {
  void logFamilyActivity(payload);
}
