import { useEffect, useMemo, useState } from "react";
import { Check, Mail, RefreshCw, X } from "lucide-react";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import {
  INVITATION_STATUS,
  normalizeInviteEmail,
} from "@/lib/invitationUtils";

const DEFAULT_MEMBER_PERMISSIONS = {
  calendar: { read: true, write: true },
  tasks: { read: true, write: true },
  meals: { read: true, write: true },
  groceries: { read: true, write: true },
};

const INVITATION_COLLECTIONS = {
  FAMILY: "familyInvitations",
  CUSTODY: "custodyInvitations",
};

function invitationEmail(invitation) {
  return normalizeInviteEmail(invitation?.recipientEmail || invitation?.recipient_email);
}

function invitationCollection(invitation) {
  return invitation?.collectionName || invitation?.collection_name || INVITATION_COLLECTIONS.FAMILY;
}

function invitationKey(invitation) {
  return `${invitationCollection(invitation)}:${invitation?.id || ""}`;
}

function isCustodyInvitation(invitation) {
  const collectionName = invitationCollection(invitation);
  const type = invitation?.type || invitation?.inviteType || invitation?.invite_type || "";
  return collectionName === INVITATION_COLLECTIONS.CUSTODY || type.includes("custody");
}

function invitationFamilyId(invitation) {
  return invitation?.familyId || invitation?.family_id || "";
}

function invitationGroupId(invitation) {
  return invitation?.groupId || invitation?.group_id || invitationFamilyId(invitation);
}

function invitationFamilyName(invitation) {
  return invitation?.groupName || invitation?.group_name || invitation?.familyName || invitation?.family_name || "Family space";
}

function invitationRole(invitation) {
  return invitation?.role || "family";
}

function invitationAccess(invitation) {
  const access = invitation?.access || invitation?.accessLevel || invitation?.access_level || "";
  const type = invitation?.type || invitation?.inviteType || invitation?.invite_type || "";
  if (access === "viewer" || type.includes("viewer") || invitationRole(invitation) === "viewer") return "viewer";
  return "member";
}

function invitationTypeLabel(invitation) {
  const type = invitation?.type || invitation?.inviteType || invitation?.invite_type || "";
  if (type.includes("coparent")) return "Co-parent";
  if (type.includes("custody")) return "Custody";
  return "Family member";
}

function mergeInvitationDocs(...groups) {
  const map = new Map();
  groups.flat().forEach((item) => {
    if (item?.id) map.set(invitationKey(item), item);
  });
  return Array.from(map.values())
    .filter((item) => (item.status || INVITATION_STATUS.PENDING) === INVITATION_STATUS.PENDING)
    .sort((a, b) => String(b.createdAt || b.created_at || "").localeCompare(String(a.createdAt || a.created_at || "")));
}

function buildAcceptedMember({ invitation, user, email }) {
  const name =
    invitation?.recipientName ||
    invitation?.recipient_name ||
    user?.displayName ||
    email;
  const role = invitationRole(invitation);

  return {
    personId: `user_${user.uid}`,
    uid: user.uid,
    email,
    name,
    displayName: name,
    display_name: name,
    role,
    isAdmin: false,
    invitationStatus: "accepted",
    invitation_status: "accepted",
    invitationId: invitation.id,
    invitation_id: invitation.id,
    permissions: invitation?.permissions || DEFAULT_MEMBER_PERMISSIONS,
  };
}

async function readInvitationDocs(collectionName, email) {
  const invitationRef = collection(db, collectionName);
  const [camelSnap, snakeSnap] = await Promise.allSettled([
    getDocs(query(invitationRef, where("recipientEmail", "==", email))),
    getDocs(query(invitationRef, where("recipient_email", "==", email))),
  ]);

  if (camelSnap.status === "rejected" && snakeSnap.status === "rejected") {
    const message =
      camelSnap.reason?.message ||
      snakeSnap.reason?.message ||
      `Could not load ${collectionName}.`;
    throw new Error(`${collectionName}: ${message}`);
  }

  const camelDocs = camelSnap.status === "fulfilled"
    ? camelSnap.value.docs.map((docSnap) => ({ id: docSnap.id, collectionName, ...docSnap.data() }))
    : [];
  const snakeDocs = snakeSnap.status === "fulfilled"
    ? snakeSnap.value.docs.map((docSnap) => ({ id: docSnap.id, collectionName, ...docSnap.data() }))
    : [];

  return [...camelDocs, ...snakeDocs];
}

function InvitationCard({ invitation, busy, onAccept, onDecline }) {
  const custodyInvite = isCustodyInvitation(invitation);
  const access = invitationAccess(invitation);

  return (
    <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
              {invitationTypeLabel(invitation)}
            </Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              Pending
            </Badge>
          </div>
          <h3 className="mt-3 text-xl font-black text-slate-950">
            {invitationFamilyName(invitation)}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {custodyInvite
              ? `You were invited as ${access === "viewer" ? "a viewer" : invitationRole(invitation)}. Accepting adds this custody calendar to your account.`
              : `You were invited as ${invitationRole(invitation)}. Accepting adds this family space to your account.`}
          </p>
          {invitation?.createdByEmail || invitation?.created_by_email ? (
            <p className="mt-2 text-xs font-bold text-slate-400">
              Invited by {invitation.createdByEmail || invitation.created_by_email}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onDecline(invitation)}
            className="gap-2 rounded-2xl border-slate-200"
          >
            <X className="h-4 w-4" />
            Decline
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => onAccept(invitation)}
            className="gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
          >
            <Check className="h-4 w-4" />
            Accept
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function ProfileInvitationsSection() {
  const {
    user,
    myEmail,
    refreshFamilies,
    setActiveProfileId,
  } = useFamily();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const email = normalizeInviteEmail(myEmail || user?.email);
  const pendingCount = invitations.length;

  const emptyCopy = useMemo(() => {
    if (!email) return "Sign in with the email that received an invitation.";
    return `No pending invitations for ${email}.`;
  }, [email]);

  async function loadInvitations() {
    if (!email) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [familyResult, custodyResult] = await Promise.allSettled([
        readInvitationDocs(INVITATION_COLLECTIONS.FAMILY, email),
        readInvitationDocs(INVITATION_COLLECTIONS.CUSTODY, email),
      ]);

      const familyDocs = familyResult.status === "fulfilled" ? familyResult.value : [];
      const custodyDocs = custodyResult.status === "fulfilled" ? custodyResult.value : [];
      const loadErrors = [familyResult, custodyResult]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason?.message)
        .filter(Boolean);

      setInvitations(mergeInvitationDocs(familyDocs, custodyDocs));
      if (loadErrors.length) setError(loadErrors.join("\n"));
    } catch (loadError) {
      console.error("Error loading invitations:", loadError);
      setError(loadError?.message || "Could not load invitations.");
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  function removeInvitationFromList(invitation) {
    const key = invitationKey(invitation);
    setInvitations((current) => current.filter((item) => invitationKey(item) !== key));
  }

  async function acceptCustodyInvitation(invitation) {
    const groupId = invitationGroupId(invitation);
    const recipientEmail = invitationEmail(invitation);

    if (!user || !groupId || !recipientEmail) return;

    setBusyId(invitationKey(invitation));
    setMessage("");
    setError("");

    try {
      const access = invitationAccess(invitation);
      const batch = writeBatch(db);
      const invitationRef = doc(db, INVITATION_COLLECTIONS.CUSTODY, invitation.id);
      const groupRef = doc(db, "custodyGroups", groupId);

      batch.update(invitationRef, {
        status: INVITATION_STATUS.ACCEPTED,
        acceptedBy: user.uid,
        accepted_by: user.uid,
        acceptedAt: serverTimestamp(),
        accepted_at: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        updated_at: new Date().toISOString(),
      });

      const groupUpdate = {
        updatedAt: serverTimestamp(),
      };

      if (access === "viewer") {
        groupUpdate.viewerIds = arrayUnion(user.uid);
        groupUpdate.viewerEmails = arrayUnion(recipientEmail);
        groupUpdate.viewer_emails = arrayUnion(recipientEmail);
        groupUpdate.pendingViewerEmails = arrayRemove(recipientEmail);
        groupUpdate.pending_viewer_emails = arrayRemove(recipientEmail);
      } else {
        groupUpdate.memberIds = arrayUnion(user.uid);
        groupUpdate.memberEmails = arrayUnion(recipientEmail);
        groupUpdate.member_emails = arrayUnion(recipientEmail);
        groupUpdate.pendingMemberEmails = arrayRemove(recipientEmail);
        groupUpdate.pending_member_emails = arrayRemove(recipientEmail);
      }

      batch.update(groupRef, groupUpdate);

      await batch.commit();
      removeInvitationFromList(invitation);
      setMessage(access === "viewer"
        ? "Invitation accepted. The custody calendar is now available in view-only mode."
        : "Invitation accepted. The custody calendar is now active on your account.");
    } catch (acceptError) {
      console.error("Error accepting custody invitation:", acceptError);
      setError(acceptError?.message || "Could not accept custody invitation.");
    } finally {
      setBusyId("");
    }
  }

  async function acceptInvitation(invitation) {
    if (isCustodyInvitation(invitation)) {
      await acceptCustodyInvitation(invitation);
      return;
    }

    const familyId = invitationFamilyId(invitation);
    const recipientEmail = invitationEmail(invitation);

    if (!user || !familyId || !recipientEmail) return;

    setBusyId(invitationKey(invitation));
    setMessage("");
    setError("");

    try {
      const batch = writeBatch(db);
      const invitationRef = doc(db, "familyInvitations", invitation.id);
      const familyRef = doc(db, "families", familyId);
      const userRef = doc(db, "users", user.uid);
      const member = buildAcceptedMember({ invitation, user, email: recipientEmail });

      batch.update(invitationRef, {
        status: INVITATION_STATUS.ACCEPTED,
        acceptedBy: user.uid,
        accepted_by: user.uid,
        acceptedAt: serverTimestamp(),
        accepted_at: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        updated_at: new Date().toISOString(),
      });

      batch.update(familyRef, {
        memberIds: arrayUnion(user.uid),
        memberEmails: arrayUnion(recipientEmail),
        member_emails: arrayUnion(recipientEmail),
        pendingMemberEmails: arrayRemove(recipientEmail),
        pending_member_emails: arrayRemove(recipientEmail),
        members: arrayUnion(member),
        updatedAt: serverTimestamp(),
      });

      batch.set(
        userRef,
        {
          uid: user.uid,
          email: recipientEmail,
          familyIds: arrayUnion(familyId),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();
      await refreshFamilies?.();
      setActiveProfileId?.(familyId);
      removeInvitationFromList(invitation);
      setMessage("Invitation accepted. The family space is now active on your account.");
    } catch (acceptError) {
      console.error("Error accepting invitation:", acceptError);
      setError(acceptError?.message || "Could not accept invitation.");
    } finally {
      setBusyId("");
    }
  }

  async function declineCustodyInvitation(invitation) {
    const groupId = invitationGroupId(invitation);
    const recipientEmail = invitationEmail(invitation);

    if (!user || !groupId || !recipientEmail) return;

    setBusyId(invitationKey(invitation));
    setMessage("");
    setError("");

    try {
      const batch = writeBatch(db);
      const invitationRef = doc(db, INVITATION_COLLECTIONS.CUSTODY, invitation.id);
      const groupRef = doc(db, "custodyGroups", groupId);

      batch.update(invitationRef, {
        status: INVITATION_STATUS.DECLINED,
        declinedBy: user.uid,
        declined_by: user.uid,
        declinedAt: serverTimestamp(),
        declined_at: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        updated_at: new Date().toISOString(),
      });

      batch.update(groupRef, {
        pendingMemberEmails: arrayRemove(recipientEmail),
        pending_member_emails: arrayRemove(recipientEmail),
        pendingViewerEmails: arrayRemove(recipientEmail),
        pending_viewer_emails: arrayRemove(recipientEmail),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      removeInvitationFromList(invitation);
      setMessage("Invitation declined.");
    } catch (declineError) {
      console.error("Error declining custody invitation:", declineError);
      setError(declineError?.message || "Could not decline custody invitation.");
    } finally {
      setBusyId("");
    }
  }

  async function declineInvitation(invitation) {
    if (isCustodyInvitation(invitation)) {
      await declineCustodyInvitation(invitation);
      return;
    }

    const familyId = invitationFamilyId(invitation);
    const recipientEmail = invitationEmail(invitation);

    if (!user || !familyId || !recipientEmail) return;

    setBusyId(invitationKey(invitation));
    setMessage("");
    setError("");

    try {
      const batch = writeBatch(db);
      const invitationRef = doc(db, "familyInvitations", invitation.id);
      const familyRef = doc(db, "families", familyId);

      batch.update(invitationRef, {
        status: INVITATION_STATUS.DECLINED,
        declinedBy: user.uid,
        declined_by: user.uid,
        declinedAt: serverTimestamp(),
        declined_at: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        updated_at: new Date().toISOString(),
      });

      batch.update(familyRef, {
        pendingMemberEmails: arrayRemove(recipientEmail),
        pending_member_emails: arrayRemove(recipientEmail),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      removeInvitationFromList(invitation);
      setMessage("Invitation declined.");
    } catch (declineError) {
      console.error("Error declining invitation:", declineError);
      setError(declineError?.message || "Could not decline invitation.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-[2rem] border-indigo-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">
              Invitations
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Pending access
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Accept family and custody invitations only when you recognize the space and sender.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={loadInvitations}
            disabled={loading || Boolean(busyId)}
            className="w-fit gap-2 rounded-2xl"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </Card>

      {message && <Card className="border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">{message}</Card>}
      {error && <Card className="border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</Card>}

      {loading ? (
        <Card className="rounded-[2rem] border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
          Loading invitations...
        </Card>
      ) : pendingCount ? (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <InvitationCard
              key={invitationKey(invitation)}
              invitation={invitation}
              busy={busyId === invitationKey(invitation)}
              onAccept={acceptInvitation}
              onDecline={declineInvitation}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-[2rem] border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Mail className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-lg font-black text-slate-950">No pending invitations</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{emptyCopy}</p>
        </Card>
      )}
    </div>
  );
}
