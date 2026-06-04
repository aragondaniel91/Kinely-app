import { query, where } from "firebase/firestore";

export function normalizeAccessEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function custodyGroupFamilyIds(group = {}) {
  return [
    group.familyId,
    group.family_id,
    group.householdFamilyId,
    group.household_family_id,
    ...(Array.isArray(group.linkedFamilyIds) ? group.linkedFamilyIds : []),
    ...(Array.isArray(group.linked_family_ids) ? group.linked_family_ids : []),
  ]
    .filter(Boolean)
    .map(String);
}

export function custodyGroupBelongsToFamily(group = {}, familyId = "") {
  if (!familyId) return true;

  const linkedFamilyIds = custodyGroupFamilyIds(group);
  return linkedFamilyIds.length === 0 || linkedFamilyIds.includes(String(familyId));
}

export function buildCustodyGroupAccessQueries({ collectionRef, user, email, familyId }) {
  const uid = user?.uid || "";
  const cleanEmail = normalizeAccessEmail(email || user?.email);
  const cleanFamilyId = String(familyId || "").trim();
  const queries = [];

  if (uid) {
    [
      "custodyReaderIds",
      "custody_reader_ids",
      "custodyWriterIds",
      "custody_writer_ids",
      "memberIds",
      "member_ids",
      "viewerIds",
      "viewer_ids",
      "adminIds",
      "admin_ids",
    ].forEach((fieldName) => {
      queries.push(query(collectionRef, where(fieldName, "array-contains", uid)));
    });

    ["ownerId", "owner_id", "createdBy", "created_by"].forEach((fieldName) => {
      queries.push(query(collectionRef, where(fieldName, "==", uid)));
    });
  }

  if (cleanEmail) {
    [
      "custodyReaderEmails",
      "custody_reader_emails",
      "custodyWriterEmails",
      "custody_writer_emails",
      "memberEmails",
      "member_emails",
      "viewerEmails",
      "viewer_emails",
      "adminEmails",
      "admin_emails",
    ].forEach((fieldName) => {
      queries.push(query(collectionRef, where(fieldName, "array-contains", cleanEmail)));
    });

    ["ownerEmail", "owner_email", "createdByEmail", "created_by_email", "created_by"].forEach((fieldName) => {
      queries.push(query(collectionRef, where(fieldName, "==", cleanEmail)));
    });
  }

  if (cleanFamilyId) {
    ["familyId", "family_id", "householdFamilyId", "household_family_id"].forEach((fieldName) => {
      queries.push(query(collectionRef, where(fieldName, "==", cleanFamilyId)));
    });

    ["linkedFamilyIds", "linked_family_ids"].forEach((fieldName) => {
      queries.push(query(collectionRef, where(fieldName, "array-contains", cleanFamilyId)));
    });
  }

  return queries;
}
