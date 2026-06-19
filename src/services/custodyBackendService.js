import { authorizedWorkerRequest } from "@/services/kinelyApiClient";

export async function saveCustodyGroupViaWorker({ groupId, familyId, group, invitations = [], childIds = [] }) {
  if (!familyId || !group || typeof group !== "object") return null;

  return authorizedWorkerRequest("/custody-groups/save", {
    groupId,
    familyId,
    group,
    invitations,
    childIds,
  });
}

export async function deleteCustodyGroupViaWorker({ groupId }) {
  if (!groupId) return null;

  return authorizedWorkerRequest("/custody-groups/delete", {
    groupId,
  });
}

export async function saveCustodyDaysViaWorker({ familyId, custodyGroupId, days }) {
  const dayList = Array.isArray(days) ? days : [days].filter(Boolean);
  if (!dayList.length) {
    throw new Error("Custody day save requires at least one day.");
  }

  const result = await authorizedWorkerRequest("/custody-days/save", {
    familyId,
    custodyGroupId,
    days: dayList,
  });

  if (!result) {
    throw new Error("Kinely API is required to save custody days.");
  }

  return result;
}

export async function deleteCustodyDayViaWorker({ familyId, custodyGroupId, date, docId }) {
  if (!date || (!familyId && !custodyGroupId)) {
    throw new Error("Custody day delete requires a date and custody scope.");
  }

  const result = await authorizedWorkerRequest("/custody-days/delete", {
    familyId,
    custodyGroupId,
    date,
    docId,
  });

  if (!result) {
    throw new Error("Kinely API is required to delete custody days.");
  }

  return result;
}

export async function saveCustodyScopedRecordViaWorker({ collectionName, familyId, custodyGroupId, record }) {
  if (!collectionName || !record || typeof record !== "object") {
    throw new Error("Custody record save requires a collection and record.");
  }

  const result = await authorizedWorkerRequest("/custody-records/save", {
    collection: collectionName,
    familyId,
    custodyGroupId,
    record,
  });

  if (!result) {
    throw new Error("Kinely API is required to save custody records.");
  }

  return result;
}

export async function deleteCustodyScopedRecordViaWorker({ collectionName, familyId, custodyGroupId, recordId }) {
  if (!collectionName || !recordId) {
    throw new Error("Custody record delete requires a collection and recordId.");
  }

  const result = await authorizedWorkerRequest("/custody-records/delete", {
    collection: collectionName,
    familyId,
    custodyGroupId,
    recordId,
  });

  if (!result) {
    throw new Error("Kinely API is required to delete custody records.");
  }

  return result;
}
