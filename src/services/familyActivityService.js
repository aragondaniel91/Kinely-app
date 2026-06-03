import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";

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
  user,
  profile,
  module = "home",
  type,
  title,
  description = "",
  entityType = "",
  entityId = "",
  date = "",
  visibility = "family",
  metadata = {},
}) {
  if (!familyId || !user?.uid || !type || !title) return null;

  try {
    return await addDoc(collection(db, "familyActivity"), {
      familyId,
      module,
      visibility,
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
      createdAt: serverTimestamp(),
      readBy: [],
    });
  } catch (error) {
    console.warn("Could not log family activity:", error);
    return null;
  }
}

export function queueFamilyActivity(payload) {
  void logFamilyActivity(payload);
}
