import {
  arrayRemove,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

const BATCH_SIZE = 400;

const HOUSEHOLD_COLLECTIONS = [
  "familyEvents",
  "tasks",
  "taskTemplates",
  "routineRuns",
  "rewards",
  "meals",
  "mealTemplates",
  "familyLists",
  "familyListItems",
  "familyPantryItems",
  "children",
  "familyMembers",
  "familyActivity",
  "familyInvitations",
  "notifications",
  "groceries",
];

const CUSTODY_COLLECTIONS = [
  "custodyDays",
  "custodySpecialEvents",
  "custodyTravelPlans",
  "custodyPackingItems",
  "custodyExpenses",
  "custodyExchanges",
  "custodyInvitations",
  "familyActivity",
  "notifications",
];

const CUSTODY_GROUP_LOOKUP_FIELDS = [
  "familyId",
  "family_id",
  "householdFamilyId",
  "household_family_id",
  "actualFamilyId",
  "actual_family_id",
];

const CUSTODY_SCOPE_LOOKUP_FIELDS = [
  "custodyGroupId",
  "custody_group_id",
  "groupId",
  "group_id",
  "familyId",
  "family_id",
];

function addRef(refsByPath, ref) {
  if (!ref?.path) return;
  refsByPath.set(ref.path, ref);
}

function addSnapshotRefs(refsByPath, snapshot) {
  snapshot?.docs?.forEach((docSnap) => addRef(refsByPath, docSnap.ref));
}

async function collectWhereRefs({ collectionName, filters, refsByPath }) {
  const collectionRef = collection(db, collectionName);

  const results = await Promise.allSettled(
    filters
      .filter((filter) => filter?.value !== undefined && filter?.value !== null && filter?.value !== "")
      .map((filter) => getDocs(query(collectionRef, where(filter.field, filter.op || "==", filter.value))))
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length === results.length && results.length > 0) {
    throw failures[0].reason;
  }

  results.forEach((result) => {
    if (result.status === "fulfilled") addSnapshotRefs(refsByPath, result.value);
  });
}

async function collectDirectDocRef(refsByPath, collectionName, docId) {
  if (!docId) return;

  const ref = doc(db, collectionName, docId);
  const snap = await getDoc(ref);
  if (snap.exists()) addRef(refsByPath, ref);
}

async function deleteRefsInBatches(refs) {
  const uniqueRefs = [...new Map(refs.map((ref) => [ref.path, ref])).values()];
  let deleted = 0;

  for (let index = 0; index < uniqueRefs.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = uniqueRefs.slice(index, index + BATCH_SIZE);

    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

async function collectCustodyGroupRefsForFamily(familyId) {
  const refsByPath = new Map();

  await collectWhereRefs({
    collectionName: "custodyGroups",
    refsByPath,
    filters: [
      ...CUSTODY_GROUP_LOOKUP_FIELDS.map((field) => ({ field, value: familyId })),
      { field: "linkedFamilyIds", op: "array-contains", value: familyId },
      { field: "linked_family_ids", op: "array-contains", value: familyId },
    ],
  });

  return [...refsByPath.values()];
}

async function collectCustodyCascadeRefs(groupId, refsByPath) {
  for (const collectionName of CUSTODY_COLLECTIONS) {
    await collectWhereRefs({
      collectionName,
      refsByPath,
      filters: CUSTODY_SCOPE_LOOKUP_FIELDS.map((field) => ({ field, value: groupId })),
    });
  }

  await collectDirectDocRef(refsByPath, "custodyNotificationPrefs", groupId);
}

export async function deleteCustodyGroupCascade(groupId) {
  if (!groupId) {
    throw new Error("A custody group id is required.");
  }

  const refsByPath = new Map();
  await collectCustodyCascadeRefs(groupId, refsByPath);

  const groupRef = doc(db, "custodyGroups", groupId);
  await deleteRefsInBatches([...refsByPath.values()]);
  await deleteRefsInBatches([groupRef]);

  return {
    deletedRecords: refsByPath.size + 1,
  };
}

export async function deleteFamilyCascade({ familyId, userId }) {
  if (!familyId) {
    throw new Error("A family id is required.");
  }

  const refsByPath = new Map();

  const custodyGroupRefs = await collectCustodyGroupRefsForFamily(familyId);
  for (const groupRef of custodyGroupRefs) {
    await collectCustodyCascadeRefs(groupRef.id, refsByPath);
    addRef(refsByPath, groupRef);
  }

  for (const collectionName of HOUSEHOLD_COLLECTIONS) {
    await collectWhereRefs({
      collectionName,
      refsByPath,
      filters: [
        { field: "familyId", value: familyId },
        { field: "family_id", value: familyId },
      ],
    });
  }

  await deleteRefsInBatches([...refsByPath.values()]);
  await deleteRefsInBatches([doc(db, "families", familyId)]);

  if (userId) {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      await updateDoc(userRef, {
        familyIds: arrayRemove(familyId),
        ...(userData.familyId === familyId ? { familyId: deleteField() } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  }

  return {
    deletedRecords: refsByPath.size + 1,
    deletedCustodyGroups: custodyGroupRefs.length,
  };
}
