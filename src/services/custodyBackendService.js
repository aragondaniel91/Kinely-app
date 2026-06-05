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
