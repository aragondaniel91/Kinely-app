import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

const CHUNK_SIZE = 450;

async function deleteDocsInChunks(docRefs) {
  let deleted = 0;

  for (let index = 0; index < docRefs.length; index += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = docRefs.slice(index, index + CHUNK_SIZE);

    chunk.forEach((docRef) => batch.delete(docRef));

    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

async function collectCustodyRefs({ familyId, userId }) {
  const refsByPath = new Map();
  const custodyCollection = collection(db, "custodyDays");

  const queries = [
    query(custodyCollection, where("familyId", "==", familyId)),
    query(custodyCollection, where("family_id", "==", familyId)),
  ];

  // Legacy records were created with the user id as the scope before familyId was added.
  if (userId) {
    queries.push(query(custodyCollection, where("userId", "==", userId)));
  }

  for (const custodyQuery of queries) {
    const snapshot = await getDocs(custodyQuery);
    snapshot.docs.forEach((docSnap) => {
      refsByPath.set(docSnap.ref.path, docSnap.ref);
    });
  }

  return Array.from(refsByPath.values());
}

export async function resetCustodyDays({ familyId, userId }) {
  if (!familyId) {
    throw new Error("familyId is required to reset custody days.");
  }

  const docRefs = await collectCustodyRefs({ familyId, userId });
  const deleted = await deleteDocsInChunks(docRefs);

  await setDoc(
    doc(db, "families", familyId),
    {
      custodyResetAt: serverTimestamp(),
      custodyInitialized: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    deleted,
  };
}
