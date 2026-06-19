import { authorizedWorkerRequest } from "@/services/kinelyApiClient";

const USE_CUSTODY_DAY_WORKER = import.meta.env.VITE_USE_CUSTODY_DAY_WORKER === "true";

function isNetworkFailure(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("timed out") ||
    message.includes("abort")
  );
}

async function optionalCustodyDayRequest(pathname, payload) {
  try {
    return await authorizedWorkerRequest(pathname, payload);
  } catch (error) {
    if (isNetworkFailure(error)) {
      console.warn("Kinely API unavailable for custody day write; falling back to Firestore.", error);
      return null;
    }

    throw error;
  }
}

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
  if (!USE_CUSTODY_DAY_WORKER) return null;

  const dayList = Array.isArray(days) ? days : [days].filter(Boolean);
  if (!dayList.length) return null;

  return optionalCustodyDayRequest("/custody-days/save", {
    familyId,
    custodyGroupId,
    days: dayList,
  });
}

export async function deleteCustodyDayViaWorker({ familyId, custodyGroupId, date, docId }) {
  if (!USE_CUSTODY_DAY_WORKER) return null;

  if (!date || (!familyId && !custodyGroupId)) return null;

  return optionalCustodyDayRequest("/custody-days/delete", {
    familyId,
    custodyGroupId,
    date,
    docId,
  });
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
