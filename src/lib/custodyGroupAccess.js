import { doc, getDoc, query, where } from "firebase/firestore";

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

function listIncludes(values, target) {
  if (!target || !Array.isArray(values)) return false;
  return values.map(String).includes(String(target));
}

function emailListIncludes(values, target) {
  const cleanTarget = normalizeAccessEmail(target);
  if (!cleanTarget || !Array.isArray(values)) return false;
  return values.map(normalizeAccessEmail).includes(cleanTarget);
}

export function custodyGroupHasPrincipalAccess(group = {}, user, email) {
  const uid = user?.uid || "";
  const cleanEmail = normalizeAccessEmail(email || user?.email);

  if (uid) {
    const uidArrayFields = [
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
    ];
    const uidEqualFields = ["ownerId", "owner_id", "createdBy", "created_by"];

    if (uidArrayFields.some((fieldName) => listIncludes(group[fieldName], uid))) return true;
    if (uidEqualFields.some((fieldName) => String(group[fieldName] || "") === uid)) return true;
  }

  if (cleanEmail) {
    const emailArrayFields = [
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
    ];
    const emailEqualFields = ["ownerEmail", "owner_email", "createdByEmail", "created_by_email", "created_by"];

    if (emailArrayFields.some((fieldName) => emailListIncludes(group[fieldName], cleanEmail))) return true;
    if (emailEqualFields.some((fieldName) => normalizeAccessEmail(group[fieldName]) === cleanEmail)) return true;
  }

  return false;
}

export function shouldIncludeCustodyGroup(group = {}, { familyId, user, email } = {}) {
  return custodyGroupBelongsToFamily(group, familyId) || custodyGroupHasPrincipalAccess(group, user, email);
}

export function custodyGroupIdsFromFamily(family = {}) {
  const linkedGroups = Array.isArray(family.custodyGroups) ? family.custodyGroups : [];
  const linkedGroupIds = linkedGroups
    .map((group) => (typeof group === "string" ? group : group?.id || group?.custodyGroupId || group?.custody_group_id))
    .filter(Boolean);

  return [
    family.custodyGroupId,
    family.custody_group_id,
    ...(Array.isArray(family.custodyGroupIds) ? family.custodyGroupIds : []),
    ...(Array.isArray(family.custody_group_ids) ? family.custody_group_ids : []),
    ...linkedGroupIds,
  ]
    .filter(Boolean)
    .map(String)
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export async function getCustodyGroupsByIds(db, groupIds = []) {
  const uniqueIds = [...new Set(groupIds.filter(Boolean).map(String))];
  if (!uniqueIds.length) return [];

  const results = await Promise.allSettled(
    uniqueIds.map(async (groupId) => {
      const snap = await getDoc(doc(db, "custodyGroups", groupId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    })
  );

  return results
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);
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
