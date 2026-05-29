import { deleteDoc, doc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { getFamilyScopedDocs } from "@/lib/firestoreFamilyQueries";
import { adaptFamilyEvents } from "@/core/events/familyEventAdapter";

export async function getFamilyEvents({ familyId, people = [] } = {}) {
  if (!familyId) return [];

  const rawEvents = await getFamilyScopedDocs("familyEvents", familyId, { type: "familyEvent" });

  return adaptFamilyEvents(rawEvents, people);
}

export async function deleteFamilyEventById(documentId) {
  if (!documentId) return false;

  await deleteDoc(doc(db, "familyEvents", documentId));
  return true;
}
