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
  if (!dayList.length) return null;

  return authorizedWorkerRequest("/custody-days/save", {
    familyId,
    custodyGroupId,
    days: dayList,
  });
}

export async function deleteCustodyDayViaWorker({ familyId, custodyGroupId, date, docId }) {
  if (!date || (!familyId && !custodyGroupId)) return null;

  return authorizedWorkerRequest("/custody-days/delete", {
    familyId,
    custodyGroupId,
    date,
    docId,
  });
}
