import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { mapFirestoreDoc } from "@/core/firestore/firestoreDocUtils";
import { adaptFamilyEvents } from "@/core/events/familyEventAdapter";

export async function getFamilyEvents({ familyId, people = [] } = {}) {
  if (!familyId) return [];

  const familyEventsQuery = query(collection(db, "familyEvents"), where("familyId", "==", familyId));
  const snapshot = await getDocs(familyEventsQuery);
  const rawEvents = snapshot.docs.map((docSnap) => mapFirestoreDoc(docSnap, { type: "familyEvent" }));

  return adaptFamilyEvents(rawEvents, people);
}
