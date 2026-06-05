import { authorizedWorkerRequest } from "@/services/kinelyApiClient";

export async function respondToFamilyInvitationViaWorker({ invitationId, action }) {
  if (!invitationId || !action) return null;

  return authorizedWorkerRequest("/invitations/family/respond", {
    invitationId,
    action,
  });
}

export async function respondToCustodyInvitationViaWorker({ invitationId, action }) {
  if (!invitationId || !action) return null;

  return authorizedWorkerRequest("/invitations/custody/respond", {
    invitationId,
    action,
  });
}
