import { useEffect, useMemo, useState } from "react";
import { Check, Mail, RefreshCw, X } from "lucide-react";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
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
import {
  roleToPersonType,
  roleToRelationship,
} from "@/lib/memberRoles";

const DEFAULT_MEMBER_PERMISSIONS = {
  home: { read: false, write: false },
  calendar: { read: false, write: false },
  tasks: { read: false, write: false },
  meals: { read: false, write: false },
  lists: { read: false, write: false },
  groceries: { read: false, write: false },
  custody: { read: false, write: false },
  budget: { read: false, write: false },
  notifications: { read: false, write: false },
};

const FAMILY_PERMISSION_MODULES = [
  "home",
  "calendar",
  "tasks",
  "meals",
  "lists",
  "groceries",
  "custody",
  "budget",
  "notifications",
];

const DEFAULT_CUSTODY_MEMBER_PERMISSIONS = {
  custody: { read: true, write: true },
  budget: { read: true, write: true },
};

const DEFAULT_CUSTODY_VIEWER_PERMISSIONS = {
  custody: { read: true, write: false },
  budget: { read: false, write: false },
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

function invitationWithoutClientFields(invitation = {}) {
  const { collectionName, collection_name, ...data } = invitation;
  return data;
}

function sameInvitation(left = {}, right = {}) {
  const leftId = left.id || "";
  const rightId = right.id || "";
  const leftEmail = invitationEmail(left);
  const rightEmail = invitationEmail(right);
  const leftFamilyId = invitationFamilyId(left);
  const rightFamilyId = invitationFamilyId(right);
  const leftGroupId = invitationGroupId(left);
  const rightGroupId = invitationGroupId(right);

  return (
    (leftId && rightId && leftId === rightId) ||
    Boolean(
      leftEmail &&
        rightEmail &&
        leftEmail === rightEmail &&
        ((leftFamilyId && rightFamilyId && leftFamilyId === rightFamilyId) ||
          (leftGroupId && rightGroupId && leftGroupId === rightGroupId))
    )
  );
}

function removeEmbeddedInvitation(list = [], invitation = {}) {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => !sameInvitation(item, invitation));
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

function modulePermission(permission = {}) {
  return {
    read: permission?.read === true || permission?.write === true || permission?.visible === true || permission?.assignable === true,
    write: permission?.write === true,
  };
}

function addModuleArrayUnionUpdates(target, { uid, email, moduleName, permission }) {
  const access = modulePermission(permission);
  if (access.read) {
    target[`${moduleName}ReaderIds`] = arrayUnion(uid);
    target[`${moduleName}ReaderEmails`] = arrayUnion(email);
  }
  if (access.write) {
    target[`${moduleName}WriterIds`] = arrayUnion(uid);
    target[`${moduleName}WriterEmails`] = arrayUnion(email);
  }
}

function buildFamilyModuleArrayUnionUpdates({ uid, email, permissions = {} }) {
  return FAMILY_PERMISSION_MODULES.reduce((updates, moduleName) => {
    addModuleArrayUnionUpdates(updates, {
      uid,
      email,
      moduleName,
      permission: permissions?.[moduleName],
    });
    return updates;
  }, {});
}

function custodyPermissionsForInvite(invitation) {
  const access = invitationAccess(invitation);
  const defaults = access === "viewer" ? DEFAULT_CUSTODY_VIEWER_PERMISSIONS : DEFAULT_CUSTODY_MEMBER_PERMISSIONS;
  return {
    ...defaults,
    ...(invitation?.permissions || {}),
  };
}

function buildCustodyModuleArrayUnionUpdates({ uid, email, permissions = {} }) {
  return ["custody", "budget"].reduce((updates, moduleName) => {
    addModuleArrayUnionUpdates(updates, {
      uid,
      email,
      moduleName,
      permission: permissions?.[moduleName],
    });
    return updates;
  }, {});
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
  const admin =
    invitation?.admin === true ||
    invitation?.isAdmin === true ||
    invitation?.is_admin === true ||
    invitation?.appRole === "admin" ||
    invitation?.app_role === "admin";
  const appRole = invitation?.appRole || invitation?.app_role || (admin ? "admin" : "viewer");
  const relationship =
    invitation?.relationship ||
    invitation?.memberRelationship ||
    invitation?.member_relationship ||
    roleToRelationship(role);
  const livesHere = invitation?.livesHere === true || invitation?.lives_here === true;
  const showOnHomeDashboard =
    invitation?.showOnHomeDashboard === true ||
    invitation?.show_on_home_dashboard === true ||
    invitation?.homeDashboard === true ||
    invitation?.home_dashboard === true ||
    livesHere;

  return {
    id: `user_${user.uid}`,
    personId: `user_${user.uid}`,
    person_id: `user_${user.uid}`,
    uid: user.uid,
    email,
    name,
    displayName: name,
    display_name: name,
    type: invitation?.personType || invitation?.person_type || roleToPersonType(role),
    personType: invitation?.personType || invitation?.person_type || roleToPersonType(role),
    person_type: invitation?.person_type || invitation?.personType || roleToPersonType(role),
    role,
    relationship,
    memberRelationship: relationship,
    member_relationship: relationship,
    livesHere,
    lives_here: livesHere,
    showOnHomeDashboard,
    show_on_home_dashboard: showOnHomeDashboard,
    homeDashboard: showOnHomeDashboard,
    home_dashboard: showOnHomeDashboard,
    appRole,
    app_role: appRole,
    color: invitation?.color || invitation?.colorId || invitation?.color_id || invitation?.familyColor || invitation?.family_color || "",
    colorId: invitation?.colorId || invitation?.color_id || invitation?.color || invitation?.familyColor || invitation?.family_color || "",
    color_id: invitation?.color_id || invitation?.colorId || invitation?.color || invitation?.familyColor || invitation?.family_color || "",
    familyColor: invitation?.familyColor || invitation?.family_color || invitation?.color || invitation?.colorId || invitation?.color_id || "",
    family_color: invitation?.family_color || invitation?.familyColor || invitation?.color || invitation?.colorId || invitation?.color_id || "",
    admin,
    isAdmin: admin,
    is_admin: admin,
    invitationStatus: "accepted",
    invitation_status: "accepted",
    invitationId: invitation.id,
    invitation_id: invitation.id,
    modules: invitation?.modules || {},
    permissions: invitation?.permissions || DEFAULT_MEMBER_PERMISSIONS,
  };
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function memberMatchesAcceptedInvite(member = {}, acceptedMember = {}, invitation = {}) {
  const memberEmail = normalizeInviteEmail(member.email);
  const acceptedEmail = normalizeInviteEmail(acceptedMember.email);
  const memberPersonId = member.personId || member.person_id || member.id || "";
  const acceptedPersonId = acceptedMember.personId || acceptedMember.person_id || acceptedMember.id || "";
  const memberInvitationId = member.invitationId || member.invitation_id || "";

  return (
    (acceptedMember.uid && member.uid === acceptedMember.uid) ||
    (acceptedEmail && memberEmail === acceptedEmail) ||
    (acceptedPersonId && memberPersonId === acceptedPersonId) ||
    (invitation.id && memberInvitationId === invitation.id)
  );
}

function mergeAcceptedMember(existingMember = {}, acceptedMember = {}) {
  const color =
    acceptedMember.color ||
    acceptedMember.colorId ||
    acceptedMember.color_id ||
    acceptedMember.familyColor ||
    acceptedMember.family_color ||
    existingMember.color ||
    existingMember.colorId ||
    existingMember.color_id ||
    existingMember.familyColor ||
    existingMember.family_color ||
    "teal";

  return {
    ...existingMember,
    ...acceptedMember,
    color,
    colorId: color,
    color_id: color,
    familyColor: color,
    family_color: color,
    invitationStatus: "accepted",
    invitation_status: "accepted",
    status: "active",
  };
}

function mergeAcceptedMemberIntoFamilyMembers(members = [], acceptedMember = {}, invitation = {}) {
  const currentMembers = Array.isArray(members) ? members : [];
  let merged = false;

  const nextMembers = currentMembers.reduce((result, member) => {
    if (!memberMatchesAcceptedInvite(member, acceptedMember, invitation)) {
      result.push(member);
      return result;
    }

    if (!merged) {
      result.push(mergeAcceptedMember(member, acceptedMember));
      merged = true;
    }

    return result;
  }, []);

  if (!merged) {
    nextMembers.push(mergeAcceptedMember({}, acceptedMember));
  }

  return nextMembers;
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
        pendingInvites: arrayRemove(invitationWithoutClientFields(invitation)),
        pending_invites: arrayRemove(invitationWithoutClientFields(invitation)),
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

      Object.assign(
        groupUpdate,
        buildCustodyModuleArrayUnionUpdates({
          uid: user.uid,
          email: recipientEmail,
          permissions: custodyPermissionsForInvite(invitation),
        })
      );

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
      const invitationRef = doc(db, "familyInvitations", invitation.id);
      const familyRef = doc(db, "families", familyId);
      const userRef = doc(db, "users", user.uid);
      const member = buildAcceptedMember({ invitation, user, email: recipientEmail });

      await runTransaction(db, async (transaction) => {
        const familySnap = await transaction.get(familyRef);
        if (!familySnap.exists()) {
          throw new Error("Family space was not found.");
        }

        const family = familySnap.data();
        const memberIds = uniqueStrings([
          ...(Array.isArray(family.memberIds) ? family.memberIds : []),
          user.uid,
        ]);
        const memberEmails = uniqueStrings([
          ...(Array.isArray(family.memberEmails) ? family.memberEmails : []),
          recipientEmail,
        ]);
        const pendingMemberEmails = uniqueStrings(
          (Array.isArray(family.pendingMemberEmails) ? family.pendingMemberEmails : [])
            .filter((item) => normalizeInviteEmail(item) !== recipientEmail)
        );
        const pendingMemberEmailsSnake = uniqueStrings(
          (Array.isArray(family.pending_member_emails) ? family.pending_member_emails : [])
            .filter((item) => normalizeInviteEmail(item) !== recipientEmail)
        );
        const members = mergeAcceptedMemberIntoFamilyMembers(family.members, member, invitation);

        transaction.update(invitationRef, {
          status: INVITATION_STATUS.ACCEPTED,
          acceptedBy: user.uid,
          accepted_by: user.uid,
          acceptedAt: serverTimestamp(),
          accepted_at: new Date().toISOString(),
          updatedAt: serverTimestamp(),
          updated_at: new Date().toISOString(),
        });

        const familyUpdate = {
          memberIds,
          memberEmails,
          member_emails: memberEmails,
          pendingMemberEmails,
          pending_member_emails: pendingMemberEmailsSnake,
          pendingInvites: removeEmbeddedInvitation(family.pendingInvites, invitation),
          pending_invites: removeEmbeddedInvitation(family.pending_invites, invitation),
          members,
          updatedAt: serverTimestamp(),
        };

        if (member.isAdmin === true) {
          familyUpdate.adminIds = arrayUnion(user.uid);
          familyUpdate.admin_ids = arrayUnion(user.uid);
          familyUpdate.adminEmails = arrayUnion(recipientEmail);
          familyUpdate.admin_emails = arrayUnion(recipientEmail);
        } else {
          Object.assign(
            familyUpdate,
            buildFamilyModuleArrayUnionUpdates({
              uid: user.uid,
              email: recipientEmail,
              permissions: member.permissions || DEFAULT_MEMBER_PERMISSIONS,
            })
          );
        }

        transaction.update(familyRef, familyUpdate);

        transaction.set(
          userRef,
          {
            uid: user.uid,
            email: recipientEmail,
            familyIds: arrayUnion(familyId),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
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
        pendingInvites: arrayRemove(invitationWithoutClientFields(invitation)),
        pending_invites: arrayRemove(invitationWithoutClientFields(invitation)),
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
        pendingInvites: arrayRemove(invitationWithoutClientFields(invitation)),
        pending_invites: arrayRemove(invitationWithoutClientFields(invitation)),
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
