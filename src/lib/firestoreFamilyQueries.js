import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { mapFirestoreDoc, uniqueFirestoreDocsFromSnapshots } from "@/core/firestore/firestoreDocUtils";

export async function getFamilyScopedDocSnaps(collectionName, familyId) {
  if (!collectionName || !familyId) return [];

  const collectionRef = collection(db, collectionName);
  const results = await Promise.allSettled([
    getDocs(query(collectionRef, where("familyId", "==", familyId))),
    getDocs(query(collectionRef, where("family_id", "==", familyId))),
  ]);

  if (results.every((result) => result.status === "rejected")) {
    throw results[0].reason;
  }

  return uniqueFirestoreDocsFromSnapshots(
    results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
  );
}

export async function getCustodyScopedDocSnaps(collectionName, custodyScopeId) {
  if (!collectionName || !custodyScopeId) return [];

  const collectionRef = collection(db, collectionName);
  const results = await Promise.allSettled([
    getDocs(query(collectionRef, where("custodyGroupId", "==", custodyScopeId))),
    getDocs(query(collectionRef, where("familyId", "==", custodyScopeId))),
    getDocs(query(collectionRef, where("family_id", "==", custodyScopeId))),
  ]);

  if (results.every((result) => result.status === "rejected")) {
    throw results[0].reason;
  }

  return uniqueFirestoreDocsFromSnapshots(
    results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
  );
}

export async function getFamilyScopedDocs(collectionName, familyId, options = {}) {
  const docs = await getFamilyScopedDocSnaps(collectionName, familyId);
  return docs.map((docSnap) => mapFirestoreDoc(docSnap, options));
}
