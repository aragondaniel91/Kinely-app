import { useMemo, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { Palette, Pencil, Plus, Shield, Trash2 } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import {
  INVITATION_TYPES,
  buildFamilyInvitation,
  familyInvitationId,
  withPendingFamilyInvitation,
} from "@/lib/invitationUtils";
import { getColorMeta } from "@/lib/personColorUtils";
import { Button } from "@/components/ui/button";
import AppDialog from "@/components/app/AppDialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProfileMemberEditorDialog, { normalizeMemberRole } from "@/components/profile/ProfileMemberEditorDialog";
import {
  buildDefaultModuleAccess,
  getMemberModuleAccess,
} from "@/features/tasks/utils/memberModuleVisibility";

const editableModuleNames = [
  "home",
  "calendar",
  "tasks",
  "meals",
  "lists",
  "custody",
  "budget",
  "notifications",
];

const permissionModuleNames = [...editableModuleNames, "groceries"];

const moduleLabels = {
  home: "Home",
  calendar: "Calendar",
  tasks: "Tasks",
  meals: "Meals",
  lists: "Lists",
  custody: "Custody",
  budget: "Budget",
  notifications: "Notifications",
};

function buildPermissionSet(read, write) {
  return permissionModuleNames.reduce(
    (permissions, moduleName) => ({
      ...permissions,
      [moduleName]: { read, write },
    }),
    {}
  );
}

const defaultPermissions = buildPermissionSet(true, true);
const limitedPermissions = buildPermissionSet(false, false);

const parentRoles = new Set(["parent", "dad", "mom"]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getFamilyMemberEmails(profile) {
  if (Array.isArray(profile?.memberEmails)) return profile.memberEmails;
  if (Array.isArray(profile?.member_emails)) return profile.member_emails;
  return [];
}

function getPendingMemberEmails(profile) {
  if (Array.isArray(profile?.pendingMemberEmails)) return profile.pendingMemberEmails;
  if (Array.isArray(profile?.pending_member_emails)) return profile.pending_member_emails;
  return [];
}

function uniqueClean(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function modulePermissionFromAccess(access = {}, fallback = { read: false, write: false }) {
  return {
    read: typeof access.read === "boolean" ? access.read : fallback.read === true,
    write: typeof access.write === "boolean" ? access.write : fallback.write === true,
  };
}

function buildPermissionsForMember({ role, admin = false, modules = {} }) {
  if (admin || parentRoles.has(role)) return defaultPermissions;

  const permissions = editableModuleNames.reduce(
    (nextPermissions, moduleName) => ({
      ...nextPermissions,
      [moduleName]: modulePermissionFromAccess(
        modules[moduleName],
        limitedPermissions[moduleName]
      ),
    }),
    {}
  );

  return {
    ...permissions,
    groceries: permissions.lists || limitedPermissions.groceries,
  };
}

function buildBlankModuleAccess() {
  const modules = editableModuleNames.reduce(
    (nextModules, moduleName) => ({
      ...nextModules,
      [moduleName]: buildDefaultModuleAccess(),
    }),
    {}
  );

  return {
    ...modules,
    groceries: modules.lists,
  };
}

function buildAccessArrayUpdates({ profile, members = [], memberEmails = [], user, myEmail }) {
  const ownerId = profile?.ownerId || profile?.owner_id || user?.uid || "";
  const ownerEmail = normalizeEmail(profile?.ownerEmail || profile?.owner_email || myEmail || user?.email);
  const acceptedEmailSet = new Set(memberEmails.map(normalizeEmail).filter(Boolean));
  const activeMembers = members.filter((member) => {
    const email = normalizeEmail(member.email);
    return member.uid || (email && acceptedEmailSet.has(email));
  });
  const adminMembers = activeMembers.filter((member) => member.isAdmin === true || member.is_admin === true);

  return {
    memberIds: uniqueClean([
      ownerId,
      ...activeMembers.map((member) => member.uid),
    ]),
    adminIds: uniqueClean([
      ownerId,
      ...adminMembers.map((member) => member.uid),
    ]),
    adminEmails: uniqueClean([
      ownerEmail,
      ...adminMembers
        .map((member) => normalizeEmail(member.email))
        .filter((email) => email && acceptedEmailSet.has(email)),
    ]),
  };
}

function getMembers(profile, user, myEmail) {
  const seen = new Set();
  const result = [];
  const memberEmails = getFamilyMemberEmails(profile).map(normalizeEmail);
  const pendingMemberEmails = getPendingMemberEmails(profile).map(normalizeEmail);

  function add(member) {
    const key = normalizeEmail(member.email) || `${member.source}-${member.name}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(member);
  }

  add({
    source: "owner",
    name: profile?.parent1_name || profile?.parent1Name || user?.displayName || "Me",
    email: profile?.owner_email || profile?.ownerEmail || myEmail || user?.email || "",
    role: normalizeMemberRole(profile?.parent1_role || profile?.parent1Role, "parent"),
    color: profile?.parent1_color || profile?.parent1Color || "blue",
    admin: true,
    status: "active",
    locked: true,
  });

  if (profile?.parent2_name || profile?.parent2Name || profile?.parent2_email || profile?.parent2Email) {
    const parent2Email = normalizeEmail(profile?.parent2_email || profile?.parent2Email);
    add({
      source: "parent2",
      name: profile?.parent2_name || profile?.parent2Name || "Co-parent / caregiver",
      email: parent2Email,
      role: normalizeMemberRole(profile?.parent2_role || profile?.parent2Role, "parent"),
      color: profile?.parent2_color || profile?.parent2Color || "amber",
      admin: false,
      status: memberEmails.includes(parent2Email)
        ? "active"
        : pendingMemberEmails.includes(parent2Email)
        ? "pending"
        : "profile_only",
      locked: false,
    });
  }

  (profile?.members || []).forEach((member, index) => {
    const email = normalizeEmail(member.email);
    add({
      source: "member",
      index,
      name: member.name || member.displayName || member.email || "Member",
      email,
      role: normalizeMemberRole(member.role, "family"),
      color: member.color || member.familyColor || member.family_color || "teal",
      admin: member.isAdmin === true || member.is_admin === true,
      modules: member.modules || {},
      permissions: member.permissions || defaultPermissions,
      status: member.status || member.invitationStatus || member.invitation_status || (
        email && !memberEmails.includes(email) && pendingMemberEmails.includes(email)
          ? "pending"
          : "active"
      ),
      locked: false,
    });
  });

  return result;
}

function MemberCard({ member, onEdit, onDelete }) {
  const color = getColorMeta(member.color);
  const hasFullAccess = member.admin || parentRoles.has(member.role);
  const moduleBadges = editableModuleNames
    .map((moduleName) => {
      const access = getMemberModuleAccess(member, moduleName);
      const hasAccess =
        access.write === true ||
        access.read === true ||
        (moduleName === "tasks" && (access.visible === true || access.assignable === true));

      if (!hasAccess) return null;

      const suffix = access.write
        ? "edit"
        : access.read
        ? "view"
        : access.assignable
        ? "assign"
        : "show";

      return `${moduleLabels[moduleName]}: ${suffix}`;
    })
    .filter(Boolean);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${color.dot}`} />
          <p className="truncate font-black text-slate-950">{member.name || member.email || "Member"}</p>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-slate-400">{member.email || "No email"}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={member.admin ? "secondary" : "outline"}>{member.admin ? "Admin" : member.role}</Badge>
          {member.status === "pending" && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
              Invitation pending
            </span>
          )}
          {member.status === "profile_only" && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500">
              Not invited
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${color.bg} ${color.text} ${color.border}`}>
            Family color: {color.label}
          </span>

          {hasFullAccess && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
              Full family access
            </span>
          )}

          {!hasFullAccess &&
            moduleBadges.map((label) => (
              <span
                key={label}
                className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700"
              >
                {label}
              </span>
            ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={() => onEdit(member)} className="flex-1 gap-1 text-xs">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={member.locked}
          onClick={() => onDelete(member)}
          className="flex-1 gap-1 border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100 hover:text-red-800 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}

export default function ProfileMembersSection() {
  const {
    user,
    profile,
    familyId,
    isAdmin,
    myEmail,
    updateActiveFamily,
    refreshFamilies,
  } = useFamily();

  const [editor, setEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const members = useMemo(() => getMembers(profile, user, myEmail), [profile, user, myEmail]);
  const canEdit = isAdmin === true;

  function clearStatus() {
    setMessage("");
    setError("");
  }

  function openAddMemberEditor() {
    setEditor({
      mode: "add",
      source: "member",
      name: "",
      email: "",
      role: "caregiver",
      color: "teal",
      admin: false,
      modules: buildBlankModuleAccess(),
    });
  }

  function openMemberEditor(member = {}) {
    setEditor({
      ...member,
      mode: "edit",
      source: member.source || "member",
      index: member.index,
      originalEmail: member.email || "",
      name: member.name || member.displayName || member.email || "",
      email: member.email || "",
      role: normalizeMemberRole(member.role, member.source === "owner" ? "parent" : "caregiver"),
      color: member.color || member.familyColor || member.family_color || "teal",
      admin: member.admin === true || member.isAdmin === true || member.is_admin === true,
      modules: member.modules || {},
      locked: member.locked === true,
    });
  }

  async function saveMember(nextEditor) {
    if (!nextEditor || !familyId || !canEdit) return;

    const email = normalizeEmail(nextEditor.email);
    const name = String(nextEditor.name || "").trim();
    const role = normalizeMemberRole(nextEditor.role, nextEditor.source === "owner" ? "parent" : "caregiver");
    const color = nextEditor.color || "teal";
    const modules = nextEditor.modules || {};
    const permissions = buildPermissionsForMember({
      role,
      admin: nextEditor.admin === true,
      modules,
    });

    if (!name && !email) {
      setError("Please enter a name or email for this member.");
      return;
    }

    clearStatus();
    setSaving(true);

    try {
      const existingMembers = Array.isArray(profile?.members) ? profile.members : [];
      let updatedMembers = [...existingMembers];
      let updates = {};
      const existingMemberEmails = getFamilyMemberEmails(profile).map(normalizeEmail);
      const originalEmail = normalizeEmail(nextEditor.originalEmail);
      const wasAccepted = existingMemberEmails.includes(originalEmail) || existingMemberEmails.includes(email);
      let pendingInvite = null;

      if (nextEditor.source === "owner") {
        updates = {
          parent1Name: name,
          parent1_name: name,
          parent1Role: role,
          parent1_role: role,
          parent1Color: color,
          parent1_color: color,
        };
      } else if (nextEditor.source === "parent2") {
        updates = {
          parent2Name: name,
          parent2_name: name,
          parent2Email: email,
          parent2_email: email,
          parent2Role: role,
          parent2_role: role,
          parent2Color: color,
          parent2_color: color,
        };
      } else if (nextEditor.mode === "add") {
        updatedMembers.push({
          name,
          email,
          role,
          color,
          familyColor: color,
          isAdmin: nextEditor.admin === true,
          modules,
          permissions,
          invitationStatus: email ? "pending" : "active",
          invitation_status: email ? "pending" : "active",
        });
        updates = { members: updatedMembers };
      } else {
        updatedMembers = updatedMembers.map((member, index) => {
          const matchesByEmail = normalizeEmail(member.email) && normalizeEmail(member.email) === normalizeEmail(nextEditor.originalEmail);
          const matchesByIndex = Number.isInteger(nextEditor.index) && index === nextEditor.index;
          return matchesByEmail || matchesByIndex
            ? {
                ...member,
                name,
                email,
                role,
                color,
                familyColor: color,
                isAdmin: nextEditor.admin === true,
                modules,
                permissions,
                invitationStatus: wasAccepted ? "active" : "pending",
                invitation_status: wasAccepted ? "active" : "pending",
              }
            : member;
        });
        updates = { members: updatedMembers };
      }

      let memberEmails = existingMemberEmails.length ? existingMemberEmails : [normalizeEmail(myEmail)].filter(Boolean);

      if (wasAccepted && email) {
        memberEmails = memberEmails.map((item) => (item === originalEmail ? email : item));
        if (!memberEmails.includes(email)) memberEmails.push(email);
      }

      const shouldInvite = Boolean(email && nextEditor.source !== "owner" && !wasAccepted);

      if (shouldInvite) {
        pendingInvite = buildFamilyInvitation({
          familyId,
          familyName: profile?.familyName || profile?.family_name || "",
          recipientName: name,
          recipientEmail: email,
          role,
          type: nextEditor.source === "parent2"
            ? INVITATION_TYPES.FAMILY_COPARENT
            : INVITATION_TYPES.FAMILY_MEMBER,
          modules,
          permissions,
          createdBy: user?.uid,
          createdByEmail: myEmail || user?.email,
        });
        updates = {
          ...updates,
          ...withPendingFamilyInvitation({
            pendingMemberEmails: profile?.pendingMemberEmails,
            pending_member_emails: profile?.pending_member_emails,
            pendingInvites: profile?.pendingInvites,
            pending_invites: profile?.pending_invites,
          }, pendingInvite),
        };
      }

      await updateActiveFamily({
        ...updates,
        memberEmails,
        member_emails: memberEmails,
        ...buildAccessArrayUpdates({
          profile,
          members: updatedMembers,
          memberEmails,
          user,
          myEmail,
        }),
      });

      if (pendingInvite) {
        await setDoc(
          doc(db, "familyInvitations", familyInvitationId(familyId, email)),
          pendingInvite,
          { merge: true }
        );
      }

      await refreshFamilies?.();
      setEditor(null);
      setMessage(pendingInvite ? "Invitation created. Access stays pending until accepted." : "Member saved.");
    } catch (err) {
      console.error("Error saving member", err);
      setError(err?.message || "Error saving member.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(member) {
    if (!familyId || !canEdit || member?.locked) return;
    clearStatus();
    setSaving(true);

    try {
      const email = normalizeEmail(member.email);
      const existingMembers = Array.isArray(profile?.members) ? profile.members : [];
      const updatedMembers = existingMembers.filter((item) => normalizeEmail(item.email) !== email);
      const memberEmails = getFamilyMemberEmails(profile).filter((item) => normalizeEmail(item) !== email);
      const pendingMemberEmails = getPendingMemberEmails(profile).filter((item) => normalizeEmail(item) !== email);
      const pendingInvites = (profile?.pendingInvites || profile?.pending_invites || []).filter((item) => {
        return normalizeEmail(item.recipientEmail || item.recipient_email) !== email;
      });
      const updates = member.source === "parent2"
        ? {
            parent2Name: "",
            parent2_name: "",
            parent2Email: "",
            parent2_email: "",
            parent2Role: "parent",
            parent2_role: "parent",
            parent2Color: "amber",
            parent2_color: "amber",
            members: updatedMembers,
            memberEmails,
            member_emails: memberEmails,
            ...buildAccessArrayUpdates({
              profile,
              members: updatedMembers,
              memberEmails,
              user,
              myEmail,
            }),
            pendingMemberEmails,
            pending_member_emails: pendingMemberEmails,
            pendingInvites,
            pending_invites: pendingInvites,
          }
        : {
            members: updatedMembers,
            memberEmails,
            member_emails: memberEmails,
            ...buildAccessArrayUpdates({
              profile,
              members: updatedMembers,
              memberEmails,
              user,
              myEmail,
            }),
            pendingMemberEmails,
            pending_member_emails: pendingMemberEmails,
            pendingInvites,
            pending_invites: pendingInvites,
          };

      await updateActiveFamily(updates);
      await refreshFamilies?.();
      setMessage("Member removed.");
      setConfirmDelete(null);
    } catch (err) {
      console.error("Error deleting member", err);
      setError(err?.message || "Error deleting member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {message && <Card className="border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">{message}</Card>}
      {error && <Card className="border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</Card>}

      {!canEdit && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          You have read access. Only a family admin can edit members.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
              <Shield className="h-4 w-4" /> Members & Permissions
            </h2>
            {canEdit && (
              <Button type="button" onClick={openAddMemberEditor} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> Add member
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {members.map((member, index) => (
              <MemberCard
                key={`${member.source}-${member.email || member.name}-${index}`}
                member={member}
                onEdit={openMemberEditor}
                onDelete={(item) => setConfirmDelete(item)}
              />
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
            <Palette className="h-4 w-4" /> Color rules
          </h2>
          <div className="space-y-3 text-sm font-semibold text-slate-500">
            <p>Children, parents, and members have colors inside each private family space.</p>
            <p>Custody colors are separate and belong to each custody group.</p>
            <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
              Example: Daniel can be blue in Joaquin Custody but green in Daniel & Mary Family.
            </div>
          </div>
        </Card>
      </div>

      <ProfileMemberEditorDialog
        editor={editor}
        onChange={setEditor}
        onClose={() => setEditor(null)}
        onSave={saveMember}
        saving={saving}
      />

      <AppDialog
        open={Boolean(confirmDelete)}
        tone="danger"
        title="Delete member?"
        message={`Remove ${confirmDelete?.name || confirmDelete?.email || "this member"} from this family space?`}
        confirmLabel={saving ? "Deleting..." : "Delete member"}
        cancelLabel="Cancel"
        loading={saving}
        onConfirm={() => deleteMember(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
