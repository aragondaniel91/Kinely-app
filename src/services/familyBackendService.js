import { authorizedWorkerRequest } from "@/services/kinelyApiClient";

export async function updateFamilyViaWorker({ familyId, updates }) {
  if (!familyId || !updates || typeof updates !== "object") {
    throw new Error("Family update requires a familyId and updates.");
  }

  const result = await authorizedWorkerRequest("/families/update", {
    familyId,
    updates,
  });

  if (!result) {
    throw new Error("Kinely API is required to update family settings.");
  }

  return result;
}

export async function deleteFamilyViaWorker({ familyId }) {
  if (!familyId) throw new Error("Family delete requires a familyId.");

  const result = await authorizedWorkerRequest("/families/delete", {
    familyId,
  });

  if (!result) {
    throw new Error("Kinely API is required to delete a family space.");
  }

  return result;
}
