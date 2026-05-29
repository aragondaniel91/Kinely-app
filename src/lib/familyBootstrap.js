import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

export function bootstrapFamilyIdForUser(uid) {
  return uid ? `family_${uid}` : "";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function uniqueClean(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

async function firstExistingFamilyId(db, familyIds = []) {
  for (const familyId of uniqueClean(familyIds)) {
    try {
      const familySnap = await getDoc(doc(db, "families", familyId));
      if (familySnap.exists()) return familySnap.id;
    } catch {
      // Stale profile references can point at deleted family docs.
    }
  }

  return "";
}

function familyLookupQueries(db, firebaseUser = {}) {
  const familiesRef = collection(db, "families");
  const uid = firebaseUser?.uid || "";
  const email = normalizeEmail(firebaseUser?.email);
  const queries = [];

  if (uid) {
    queries.push(query(familiesRef, where("ownerId", "==", uid)));
    queries.push(query(familiesRef, where("memberIds", "array-contains", uid)));
  }

  if (email) {
    queries.push(query(familiesRef, where("ownerEmail", "==", email)));
    queries.push(query(familiesRef, where("owner_email", "==", email)));
    queries.push(query(familiesRef, where("memberEmails", "array-contains", email)));
    queries.push(query(familiesRef, where("member_emails", "array-contains", email)));
  }

  return queries;
}

export async function findExistingFamilyIdForUser(db, firebaseUser = {}, profile = {}) {
  const explicitFamilyId = await firstExistingFamilyId(db, [
    profile?.familyId,
    ...(Array.isArray(profile?.familyIds) ? profile.familyIds : []),
    bootstrapFamilyIdForUser(firebaseUser?.uid),
  ]);

  if (explicitFamilyId) return explicitFamilyId;

  const results = await Promise.allSettled(
    familyLookupQueries(db, firebaseUser).map((familyQuery) => getDocs(familyQuery))
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const familySnap = result.value.docs[0];
    if (familySnap?.exists()) return familySnap.id;
  }

  return "";
}
