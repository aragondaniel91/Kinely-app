import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { sendActivityNotificationViaWorker } from "@/services/emailQueueService";

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
    };

    const activityRef = await addDoc(collection(db, "familyActivity"), {
      ...activityPayload,
      createdAt: serverTimestamp(),
      readBy: [],
    });

    void sendActivityNotificationViaWorker({
      activity: {
        id: activityRef.id,
        ...activityPayload,
      },
    }).catch((error) => {
      console.warn("Could not send activity notifications:", error);
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
