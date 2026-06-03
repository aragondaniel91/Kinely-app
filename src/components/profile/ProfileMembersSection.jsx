import { useMemo, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { Baby, Palette, Pencil, Plus, Shield, Trash2 } from "lucide-react";

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
import ProfileMemberEditorDialog from "@/components/profile/ProfileMemberEditorDialog";
import {
  normalizeMemberRole,
  roleDefaultLivesHere,
  roleToPersonType,
  roleToRelationship,
} from "@/lib/memberRoles";
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildLocalMemberPersonId({ email = "", name = "", fallback = "member" } = {}) {
  const cleanEmail = normalizeEmail(email);
  if (cleanEmail) return `email_${slugify(cleanEmail)}`;
  return `${fallback}_${slugify(name) || Date.now()}`;
}

function memberHasWriteAccess(permissions = {}) {
  return Object.values(permissions || {}).some((permission) => permission?.write === true);
}

function appRoleForMember({ role, admin, permissions }) {
  if (admin) return "admin";
  if (memberHasWriteAccess(permissions)) return "editor";
  return "viewer";
}

function booleanOrFallback(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
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

function permissionAllowsRead(permission = {}) {
  return permission?.read === true || permission?.write === true || permission?.visible === true || permission?.assignable === true;
}

function permissionAllowsWrite(permission = {}) {
  return permission?.write === true;
}

function emptyModuleAccessArrays() {
  return permissionModuleNames.reduce((arrays, moduleName) => ({
    ...arrays,
    [`${moduleName}ReaderIds`]: [],
    [`${moduleName}WriterIds`]: [],
    [`${moduleName}ReaderEmails`]: [],
    [`${moduleName}WriterEmails`]: [],
  }), {});
}

function pushUnique(target, value) {
  const cleanValue = String(value || "").trim();
  if (cleanValue && !target.includes(cleanValue)) target.push(cleanValue);
}

function isAdminMember(member = {}) {
  const appRole = String(member.appRole || member.app_role || "").trim().toLowerCase();
  const role = String(member.role || "").trim().toLowerCase();
  return (
    member.isAdmin === true ||
    member.is_admin === true ||
    member.admin === true ||
    appRole === "owner" ||
    appRole === "admin" ||
    role === "owner" ||
    role === "admin"
  );
}

function modulePermissionFromAccess(access = {}, fallback = { read: false, write: false }) {
  return {
    read: typeof access.read === "boolean" ? access.read : fallback.read === true,
    write: typeof access.write === "boolean" ? access.write : fallback.write === true,
  };
}

function buildPermissionsForMember({ role, admin = false, modules = {} }) {
  if (admin) return defaultPermissions;

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

function buildChildModuleAccess() {
  return {
    ...buildBlankModuleAccess(),
    calendar: buildDefaultModuleAccess({ visible: true, assignable: true }),
    tasks: buildDefaultModuleAccess({ visible: true, assignable: true }),
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
  const adminMembers = activeMembers.filter(isAdminMember);
  const adminIds = uniqueClean([
    ownerId,
    ...adminMembers.map((member) => member.uid),
  ]);
  const adminEmails = uniqueClean([
    ownerEmail,
    ...adminMembers
      .map((member) => normalizeEmail(member.email))
      .filter((email) => email && acceptedEmailSet.has(email)),
  ]);
  const moduleArrays = emptyModuleAccessArrays();
  const principals = [
    {
      uid: ownerId,
      email: ownerEmail,
      admin: true,
      permissions: defaultPermissions,
    },
    ...activeMembers.map((member) => {
      const admin = isAdminMember(member);
      return {
        uid: member.uid || "",
        email: normalizeEmail(member.email),
        admin,
        permissions: admin
          ? defaultPermissions
          : member.permissions || buildPermissionsForMember({
              role: member.role,
              admin,
              modules: member.modules || {},
            }),
      };
    }),
  ];

  principals.forEach((principal) => {
    const email = normalizeEmail(principal.email);
    permissionModuleNames.forEach((moduleName) => {
      const permission = principal.admin ? defaultPermissions[moduleName] : principal.permissions?.[moduleName];
      if (permissionAllowsRead(permission)) {
        pushUnique(moduleArrays[`${moduleName}ReaderIds`], principal.uid);
        pushUnique(moduleArrays[`${moduleName}ReaderEmails`], email);
      }
      if (permissionAllowsWrite(permission)) {
        pushUnique(moduleArrays[`${moduleName}WriterIds`], principal.uid);
        pushUnique(moduleArrays[`${moduleName}WriterEmails`], email);
      }
    });
  });

  return {
    memberIds: uniqueClean([
      ownerId,
      ...activeMembers.map((member) => member.uid),
    ]),
    adminIds,
    admin_ids: adminIds,
    adminEmails,
    admin_emails: adminEmails,
    ...moduleArrays,
  };
}

function getMembers(profile, user, myEmail) {
  const seen = new Set();
  const result = [];
  const memberEmails = getFamilyMemberEmails(profile).map(normalizeEmail);
  const pendingMemberEmails = getPendingMemberEmails(profile).map(normalizeEmail);
  const adminEmails = [
    ...(Array.isArray(profile?.adminEmails) ? profile.adminEmails : []),
    ...(Array.isArray(profile?.admin_emails) ? profile.admin_emails : []),
  ].map(normalizeEmail);
  const storedMembers = Array.isArray(profile?.members) ? profile.members : [];

  function findStoredMember({ email = "", personId = "" } = {}) {
    const cleanEmail = normalizeEmail(email);
    return storedMembers.find((member) => {
      const memberEmail = normalizeEmail(member.email);
      const memberPersonId = member.personId || member.person_id || member.id || "";
      return (
        (cleanEmail && memberEmail === cleanEmail) ||
        (personId && memberPersonId === personId)
      );
    });
  }

  function add(member) {
    const key = member.personId || member.childId || normalizeEmail(member.email) || `${member.source}-${member.name}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(member);
  }

  add({
    source: "owner",
    personId: profile?.parent1PersonId || profile?.parent1_person_id || user?.uid || "",
    name: profile?.parent1_name || profile?.parent1Name || user?.displayName || "Me",
    email: profile?.owner_email || profile?.ownerEmail || myEmail || user?.email || "",
    role: normalizeMemberRole(profile?.parent1_role || profile?.parent1Role, "parent"),
    relationship: profile?.parent1Relationship || profile?.parent1_relationship || roleToRelationship(profile?.parent1_role || profile?.parent1Role || "parent"),
    color: profile?.parent1_color || profile?.parent1Color || "blue",
    admin: true,
    livesHere: true,
    showOnHomeDashboard: true,
    status: "active",
    locked: true,
  });

  if (profile?.parent2_name || profile?.parent2Name || profile?.parent2_email || profile?.parent2Email) {
    const parent2Email = normalizeEmail(profile?.parent2_email || profile?.parent2Email);
    const parent2PersonId = profile?.parent2PersonId || profile?.parent2_person_id || parent2Email || "";
    const storedParent2 = findStoredMember({ email: parent2Email, personId: parent2PersonId });
    const parent2Role = normalizeMemberRole(profile?.parent2_role || profile?.parent2Role || storedParent2?.role, "parent");
    const parent2LivesHereDefault = roleDefaultLivesHere(parent2Role);
    add({
      source: "parent2",
      index: storedMembers.indexOf(storedParent2),
      personId: parent2PersonId,
      uid: storedParent2?.uid || "",
      name: profile?.parent2_name || profile?.parent2Name || "Co-parent / caregiver",
      email: parent2Email,
      role: parent2Role,
      relationship: profile?.parent2Relationship || profile?.parent2_relationship || roleToRelationship(parent2Role),
      type: storedParent2?.type || storedParent2?.personType || storedParent2?.person_type || roleToPersonType(parent2Role),
      color: profile?.parent2_color || profile?.parent2Color || "amber",
      admin: isAdminMember(storedParent2) || adminEmails.includes(parent2Email),
      livesHere: booleanOrFallback(profile?.parent2LivesHere ?? profile?.parent2_lives_here ?? storedParent2?.livesHere ?? storedParent2?.lives_here, parent2LivesHereDefault),
      showOnHomeDashboard: booleanOrFallback(profile?.parent2ShowOnHomeDashboard ?? profile?.parent2_show_on_home_dashboard ?? storedParent2?.showOnHomeDashboard ?? storedParent2?.show_on_home_dashboard, parent2LivesHereDefault),
      modules: storedParent2?.modules || {},
      permissions: storedParent2?.permissions || limitedPermissions,
      status: storedParent2?.status || storedParent2?.invitationStatus || storedParent2?.invitation_status || (memberEmails.includes(parent2Email)
        ? "active"
        : pendingMemberEmails.includes(parent2Email)
        ? "pending"
        : "profile_only"),
      locked: false,
    });
  }

  (profile?.children || []).forEach((child, index) => {
    const personId = child.personId || child.person_id || child.id || child.childId || child.child_id || "";
    const name = child.name || child.displayName || child.display_name || child.childName || child.child_name || `Child ${index + 1}`;
    add({
      source: "child",
      index,
      personId,
      childId: child.childId || child.child_id || personId,
      name,
      email: normalizeEmail(child.email),
      role: "child",
      relationship: "child",
      type: "child",
      color: child.color || child.colorId || child.color_id || child.familyColor || child.family_color || "green",
      admin: false,
      livesHere: booleanOrFallback(child.livesHere ?? child.lives_here, true),
      showOnHomeDashboard: booleanOrFallback(
        child.showOnHomeDashboard ?? child.show_on_home_dashboard ?? child.homeDashboard ?? child.home_dashboard,
        true
      ),
      modules: child.modules || buildChildModuleAccess(),
      permissions: child.permissions || limitedPermissions,
      status: "active",
      locked: false,
    });
  });

  (profile?.members || []).forEach((member, index) => {
    const email = normalizeEmail(member.email);
    add({
      source: "member",
      index,
      personId: member.personId || member.person_id || member.id || "",
      name: member.name || member.displayName || member.email || "Member",
      email,
      role: normalizeMemberRole(member.role, "family"),
      relationship: member.relationship || member.memberRelationship || member.member_relationship || roleToRelationship(member.role || "family"),
      type: member.type || member.personType || member.person_type || roleToPersonType(member.role),
      color: member.color || member.familyColor || member.family_color || "teal",
      admin: isAdminMember(member),
      livesHere: booleanOrFallback(member.livesHere ?? member.lives_here, false),
      showOnHomeDashboard: booleanOrFallback(member.showOnHomeDashboard ?? member.show_on_home_dashboard ?? member.homeDashboard ?? member.home_dashboard, false),
      modules: member.modules || {},
      permissions: member.permissions || limitedPermissions,
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

function MemberCard({ member, canEdit, onEdit, onDelete }) {
  const color = getColorMeta(member.color);
  const hasFullAccess = member.admin === true;
  const isChild = member.source === "child" || member.type === "child" || member.role === "child";
  const moduleBadges = editableModuleNames
    .map((moduleName) => {
      const access = getMemberModuleAccess(member, moduleName);
      const hasAccess =
        access.write === true ||
        access.read === true ||
        (["calendar", "tasks"].includes(moduleName) &&
          (access.visible === true || access.assignable === true));

      if (!hasAccess) return null;

      const suffix = access.write
        ? "edit"
        : access.assignable
        ? "assign"
        : access.visible
        ? "show"
        : "view";

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
        <p className="mt-1 truncate text-xs font-semibold text-slate-400">
          {member.email || (isChild ? "Child profile" : "No email")}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={member.admin ? "secondary" : "outline"}>{member.admin ? "Admin" : isChild ? "Child" : member.role}</Badge>
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

          {member.livesHere && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
              Lives here
            </span>
          )}

          {member.showOnHomeDashboard && !member.livesHere && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
              Home visible
            </span>
          )}

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
        <Button
          type="button"
          variant="outline"
          disabled={!canEdit}
          onClick={() => onEdit(member)}
          className="flex-1 gap-1 text-xs"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canEdit || member.locked}
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
      relationship: "caregiver",
      type: "adult",
      color: "teal",
      admin: false,
      livesHere: false,
      showOnHomeDashboard: false,
      modules: buildBlankModuleAccess(),
    });
  }

  function openAddChildEditor() {
    setEditor({
      mode: "add",
      source: "child",
      name: "",
      email: "",
      role: "child",
      relationship: "child",
      type: "child",
      color: "green",
      admin: false,
      livesHere: true,
      showOnHomeDashboard: true,
      modules: buildChildModuleAccess(),
    });
  }

  function openMemberEditor(member = {}) {
    setEditor({
      ...member,
      mode: "edit",
      source: member.source || "member",
      index: member.index,
      personId: member.personId || member.person_id || member.id || "",
      originalEmail: member.email || "",
      name: member.name || member.displayName || member.email || "",
      email: member.email || "",
      role: normalizeMemberRole(member.role, member.source === "owner" ? "parent" : "caregiver"),
      relationship: member.relationship || member.memberRelationship || member.member_relationship || roleToRelationship(member.role),
      type: member.type || member.personType || member.person_type || roleToPersonType(member.role),
      color: member.color || member.familyColor || member.family_color || "teal",
      admin: isAdminMember(member),
      livesHere: booleanOrFallback(member.livesHere ?? member.lives_here, false),
      showOnHomeDashboard: booleanOrFallback(member.showOnHomeDashboard ?? member.show_on_home_dashboard ?? member.homeDashboard ?? member.home_dashboard, false),
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
    const relationship = nextEditor.relationship || roleToRelationship(role);
    const type = nextEditor.type || roleToPersonType(role);
    const personId = nextEditor.personId || buildLocalMemberPersonId({
      email,
      name,
      fallback: nextEditor.source === "parent2" ? "parent2" : "member",
    });
    const livesHere = nextEditor.livesHere === true || nextEditor.lives_here === true;
    const showOnHomeDashboard =
      nextEditor.showOnHomeDashboard === true ||
      nextEditor.show_on_home_dashboard === true;
    const appRole = appRoleForMember({
      role,
      admin: nextEditor.admin === true,
      permissions,
    });
    const memberIdentityPayload = {
      id: personId,
      personId,
      person_id: personId,
      type,
      personType: type,
      person_type: type,
      relationship,
      memberRelationship: relationship,
      member_relationship: relationship,
      appRole,
      app_role: appRole,
      livesHere,
      lives_here: livesHere,
      showOnHomeDashboard,
      show_on_home_dashboard: showOnHomeDashboard,
      homeDashboard: showOnHomeDashboard,
      home_dashboard: showOnHomeDashboard,
      admin: nextEditor.admin === true,
      isAdmin: nextEditor.admin === true,
      is_admin: nextEditor.admin === true,
    };

    if (nextEditor.source === "child" && !name) {
      setError("Please enter a name for this child.");
      return;
    }

    if (!name && !email) {
      setError("Please enter a name or email for this member.");
      return;
    }

    clearStatus();
    setSaving(true);

    try {
      if (nextEditor.source === "child") {
        const existingChildren = Array.isArray(profile?.children) ? profile.children : [];
        const childPayload = {
          ...(nextEditor.raw || {}),
          id: personId,
          personId,
          person_id: personId,
          childId: nextEditor.childId || nextEditor.child_id || personId,
          child_id: nextEditor.child_id || nextEditor.childId || personId,
          name,
          displayName: name,
          display_name: name,
          childName: name,
          child_name: name,
          email,
          role: "child",
          type: "child",
          personType: "child",
          person_type: "child",
          relationship: "child",
          memberRelationship: "child",
          member_relationship: "child",
          color,
          colorId: color,
          color_id: color,
          familyColor: color,
          family_color: color,
          livesHere,
          lives_here: livesHere,
          showOnHomeDashboard,
          show_on_home_dashboard: showOnHomeDashboard,
          homeDashboard: showOnHomeDashboard,
          home_dashboard: showOnHomeDashboard,
          modules: {
            ...buildChildModuleAccess(),
            ...modules,
            groceries: modules.lists || modules.groceries || buildDefaultModuleAccess(),
          },
          permissions,
          status: "active",
        };
        const updatedChildren =
          nextEditor.mode === "add"
            ? [...existingChildren, childPayload]
            : existingChildren.map((child, index) => {
                const childPersonId = child.personId || child.person_id || child.id || child.childId || child.child_id || "";
                const matchesByPersonId = personId && childPersonId === personId;
                const matchesByIndex = Number.isInteger(nextEditor.index) && index === nextEditor.index;
                return matchesByPersonId || matchesByIndex ? { ...child, ...childPayload } : child;
              });

        await updateActiveFamily({ children: updatedChildren });
        await refreshFamilies?.();
        setEditor(null);
        setMessage("Child saved. Care details live in the Children tab.");
        return;
      }

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
          parent1Relationship: relationship,
          parent1_relationship: relationship,
          parent1LivesHere: livesHere,
          parent1_lives_here: livesHere,
          parent1ShowOnHomeDashboard: showOnHomeDashboard,
          parent1_show_on_home_dashboard: showOnHomeDashboard,
          parent1Color: color,
          parent1_color: color,
        };
      } else if (nextEditor.source === "parent2") {
        const nextParent2Member = {
          ...memberIdentityPayload,
          uid: nextEditor.uid || null,
          name,
          displayName: name,
          display_name: name,
          email,
          role,
          color,
          familyColor: color,
          family_color: color,
          modules,
          permissions,
          invitationStatus: wasAccepted ? "active" : email ? "pending" : "profile_only",
          invitation_status: wasAccepted ? "active" : email ? "pending" : "profile_only",
        };
        const foundIndex = updatedMembers.findIndex((member, index) => {
          const matchesByEmail = email && normalizeEmail(member.email) === email;
          const matchesByPersonId = personId && (member.personId === personId || member.person_id === personId || member.id === personId);
          const matchesByIndex = Number.isInteger(nextEditor.index) && index === nextEditor.index;
          return matchesByEmail || matchesByPersonId || matchesByIndex;
        });

        if (foundIndex >= 0) {
          updatedMembers[foundIndex] = {
            ...updatedMembers[foundIndex],
            ...nextParent2Member,
          };
        } else {
          updatedMembers.push(nextParent2Member);
        }

        updates = {
          parent2PersonId: personId,
          parent2_person_id: personId,
          parent2Name: name,
          parent2_name: name,
          parent2Email: email,
          parent2_email: email,
          parent2Role: role,
          parent2_role: role,
          parent2Relationship: relationship,
          parent2_relationship: relationship,
          parent2LivesHere: livesHere,
          parent2_lives_here: livesHere,
          parent2ShowOnHomeDashboard: showOnHomeDashboard,
          parent2_show_on_home_dashboard: showOnHomeDashboard,
          parent2Color: color,
          parent2_color: color,
          members: updatedMembers,
        };
      } else if (nextEditor.mode === "add") {
        updatedMembers.push({
          ...memberIdentityPayload,
          name,
          displayName: name,
          display_name: name,
          email,
          role,
          color,
          familyColor: color,
          family_color: color,
          admin: nextEditor.admin === true,
          isAdmin: nextEditor.admin === true,
          is_admin: nextEditor.admin === true,
          modules,
          permissions,
          invitationStatus: email ? "pending" : "active",
          invitation_status: email ? "pending" : "active",
        });
        updates = { members: updatedMembers };
      } else {
        updatedMembers = updatedMembers.map((member, index) => {
          const matchesByEmail = normalizeEmail(member.email) && normalizeEmail(member.email) === normalizeEmail(nextEditor.originalEmail);
          const matchesByPersonId = personId && (member.personId === personId || member.person_id === personId || member.id === personId);
          const matchesByIndex = Number.isInteger(nextEditor.index) && index === nextEditor.index;
          return matchesByEmail || matchesByPersonId || matchesByIndex
            ? {
                ...member,
                ...memberIdentityPayload,
                name,
                displayName: name,
                display_name: name,
                email,
                role,
                color,
                familyColor: color,
                family_color: color,
                admin: nextEditor.admin === true,
                isAdmin: nextEditor.admin === true,
                is_admin: nextEditor.admin === true,
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
          relationship,
          personType: type,
          livesHere,
          showOnHomeDashboard,
          modules,
          permissions,
          admin: nextEditor.admin === true,
          appRole,
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
      const targetPersonId = member.personId || member.person_id || member.id || "";

      if (member.source === "child") {
        const updatedChildren = (profile?.children || []).filter((child, index) => {
          const childPersonId = child.personId || child.person_id || child.id || child.childId || child.child_id || "";
          if (targetPersonId) return childPersonId !== targetPersonId;
          if (Number.isInteger(member.index)) return index !== member.index;
          return true;
        });

        await updateActiveFamily({ children: updatedChildren });
        await refreshFamilies?.();
        setMessage("Child removed.");
        setConfirmDelete(null);
        return;
      }

      const existingMembers = Array.isArray(profile?.members) ? profile.members : [];
      const updatedMembers = existingMembers.filter((item, index) => {
        if (targetPersonId) {
          return item.personId !== targetPersonId && item.person_id !== targetPersonId && item.id !== targetPersonId;
        }

        if (email) return normalizeEmail(item.email) !== email;

        if (Number.isInteger(member.index)) return index !== member.index;

        return true;
      });
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
              <Shield className="h-4 w-4" /> People & Permissions
            </h2>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={openAddChildEditor} className="gap-2">
                  <Baby className="h-4 w-4" /> Add child
                </Button>
                <Button type="button" onClick={openAddMemberEditor} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" /> Add member
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {members.map((member, index) => (
              <MemberCard
                key={`${member.source}-${member.email || member.name}-${index}`}
                member={member}
                canEdit={canEdit}
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
              The same person can have different colors in household and custody spaces.
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
