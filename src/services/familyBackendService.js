import { authorizedWorkerRequest } from "@/services/kinelyApiClient";

export async function updateFamilyViaWorker({ familyId, updates }) {
  if (!familyId || !updates || typeof updates !== "object") return null;

  return authorizedWorkerRequest("/families/update", {
    familyId,
    updates,
  });
}

export async function deleteFamilyViaWorker({ familyId }) {
  if (!familyId) return null;

  return authorizedWorkerRequest("/families/delete", {
    familyId,
  });
}
