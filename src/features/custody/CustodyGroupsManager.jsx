import React, { useEffect, useMemo, useState } from "react";
import { Baby, Eye, Pencil, Plus, ShieldCheck, Trash2, Users, WalletCards } from "lucide-react";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { mapSettledFirestoreSnapshots } from "@/core/firestore/firestoreDocUtils";
import { deleteCustodyGroupCascade } from "@/services/familyAdminService";
import {
  CHILD_RELATIONSHIP_TYPES,
  buildCustodyGroupPayload,
  getCustodyGroupChildren,
  getCustodyGroupMemberEmails,
  getCustodyGroupParents,
  getCustodyGroupViewerEmails,
  getHouseholdChildren,
  mergeCustodyGroups,
  normalizeChildRecord,
  normalizeEmail,
  normalizeEmailList,
  normalizeKey,
} from "@/lib/custodyGroupUtils";
import {
  buildCustodyGroupAccessQueries,
  custodyGroupIdsFromFamily,
  getCustodyGroupsByIds,
  shouldIncludeCustodyGroup,
} from "@/lib/custodyGroupAccess";
import {
  buildCustodyInvitation,
  custodyInvitationId,
  withPendingCustodyInvitation,
} from "@/lib/invitationUtils";
import {
  queueCustodyInvitationEmail,
  sendCustodyInvitationViaWorker,
} from "@/services/emailQueueService";
import { queueCustodyInvitationNotifications } from "@/services/notificationService";
import { PERSON_COLOR_OPTIONS, getColorMeta } from "@/lib/personColorUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AppDialog from "@/components/app/AppDialog";

const EMPTY_FORM = {
  name: "",
  children: "",
  dadName: "",
  dadEmail: "",
  dadColor: "blue",
  momName: "",
  momEmail: "",
  momColor: "amber",
  viewerEmails: "",
  budgetViewerEmails: "",
  budgetEditorEmails: "",
};

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitEmailCsv(value) {
  return [...new Set(splitCsv(value).map(normalizeEmail).filter(Boolean))];
}

function getPendingMemberEmails(group) {
  return normalizeEmailList([
    ...(Array.isArray(group?.pendingMemberEmails) ? group.pendingMemberEmails : []),
    ...(Array.isArray(group?.pending_member_emails) ? group.pending_member_emails : []),
  ]);
}

function getPendingViewerEmails(group) {
  return normalizeEmailList([
    ...(Array.isArray(group?.pendingViewerEmails) ? group.pendingViewerEmails : []),
    ...(Array.isArray(group?.pending_viewer_emails) ? group.pending_viewer_emails : []),
  ]);
}

function uniqueClean(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function groupAccessEmails(group, camelKey, snakeKey) {
  return normalizeEmailList([
    ...(Array.isArray(group?.[camelKey]) ? group[camelKey] : []),
    ...(Array.isArray(group?.[snakeKey]) ? group[snakeKey] : []),
  ]);
}

function emailListWithout(values = [], blocked = []) {
  const blockedSet = new Set(normalizeEmailList(blocked));
  return normalizeEmailList(values).filter((email) => !blockedSet.has(email));
}

function groupPendingInvites(group) {
  return Array.isArray(group?.pendingInvites)
    ? group.pendingInvites
    : Array.isArray(group?.pending_invites)
    ? group.pending_invites
    : [];
}

function inviteEmail(invite) {
  return normalizeEmail(invite?.recipientEmail || invite?.recipient_email);
}

function invitePermission(invite, moduleName) {
  return invite?.permissions?.[moduleName] || {};
}

function permissionCanRead(permission = {}) {
  return permission.read === true || permission.write === true;
}

function buildCustodyModuleAccessArrays({
  memberIds = [],
  memberEmails = [],
  viewerIds = [],
  viewerEmails = [],
  budgetViewerEmails = [],
  budgetEditorEmails = [],
}) {
  const custodyReaderIds = uniqueClean([...memberIds, ...viewerIds]);
  const custodyReaderEmails = normalizeEmailList([...memberEmails, ...viewerEmails]);
  const custodyWriterIds = uniqueClean(memberIds);
  const custodyWriterEmails = normalizeEmailList(memberEmails);
  const budgetEditors = emailListWithout(budgetEditorEmails, memberEmails);
  const budgetViewers = emailListWithout(budgetViewerEmails, [...memberEmails, ...budgetEditors]);
  const budgetReaderEmails = normalizeEmailList([...memberEmails, ...budgetEditors, ...budgetViewers]);
  const budgetWriterEmails = normalizeEmailList([...memberEmails, ...budgetEditors]);

  return {
    custodyReaderIds,
    custodyWriterIds,
    custodyReaderEmails,
    custodyWriterEmails,
    budgetReaderIds: custodyWriterIds,
    budgetWriterIds: custodyWriterIds,
    budgetReaderEmails,
    budgetWriterEmails,
  };
}

function childLabel(child) {
  if (!child) return "";
  if (typeof child === "string") return child;
  return child.name || child.fullName || child.displayName || child.childName || child.firstName || "Child";
}

function parentNames(group) {
  return getCustodyGroupParents(group)
    .map((parent) => parent.name || parent.displayName || parent.email)
    .filter(Boolean);
}

function isGroupLinkedToFamily(group, familyId) {
  if (!group || !familyId) return false;
  return Boolean(
    group.familyId === familyId ||
      group.householdFamilyId === familyId ||
      group.actualFamilyId === familyId ||
      (Array.isArray(group.linkedFamilyIds) && group.linkedFamilyIds.includes(familyId))
  );
}

function canManageCustodyGroup(group, user, myEmail, { isOwner, isAdmin, familyId } = {}) {
  const email = normalizeEmail(myEmail || user?.email);
  const memberEmails = getCustodyGroupMemberEmails(group);
  const householdAdminCanManage = Boolean((isOwner || isAdmin) && isGroupLinkedToFamily(group, familyId));

  return Boolean(
    householdAdminCanManage ||
      memberEmails.includes(email) ||
      group?.createdBy === user?.uid ||
      group?.ownerId === user?.uid ||
      normalizeEmail(group?.createdByEmail) === email ||
      normalizeEmail(group?.ownerEmail) === email
  );
}

function canDeleteCustodyGroup(group, user, myEmail) {
  const uid = user?.uid || "";
  const email = normalizeEmail(myEmail || user?.email);
  const adminIds = [
    ...(Array.isArray(group?.adminIds) ? group.adminIds : []),
    ...(Array.isArray(group?.admin_ids) ? group.admin_ids : []),
  ];
  const adminEmails = normalizeEmailList([
    ...(Array.isArray(group?.adminEmails) ? group.adminEmails : []),
    ...(Array.isArray(group?.admin_emails) ? group.admin_emails : []),
  ]);

  return Boolean(
    group?.ownerId === uid ||
      group?.owner_id === uid ||
      group?.createdBy === uid ||
      group?.created_by === uid ||
      adminIds.includes(uid) ||
      normalizeEmail(group?.ownerEmail) === email ||
      normalizeEmail(group?.owner_email) === email ||
      normalizeEmail(group?.createdByEmail) === email ||
      normalizeEmail(group?.created_by_email) === email ||
      adminEmails.includes(email)
  );
}

function ColorSelector({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {PERSON_COLOR_OPTIONS.map((color) => {
          const active = value === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className={`h-3 w-3 rounded-full ${color.dot}`} />
              {color.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GroupCard({ group, user, myEmail, isOwner, isAdmin, familyId, onEdit, onDelete }) {
  const memberEmails = getCustodyGroupMemberEmails(group);
  const viewerEmails = getCustodyGroupViewerEmails(group);
  const budgetWriterEmails = groupAccessEmails(group, "budgetWriterEmails", "budget_writer_emails");
  const budgetReaderEmails = groupAccessEmails(group, "budgetReaderEmails", "budget_reader_emails");
  const budgetEditors = emailListWithout(budgetWriterEmails, memberEmails);
  const budgetViewers = emailListWithout(budgetReaderEmails, [...memberEmails, ...budgetWriterEmails]);
  const pendingMemberEmails = getPendingMemberEmails(group);
  const pendingViewerEmails = getPendingViewerEmails(group);
  const pendingInvites = groupPendingInvites(group);
  const pendingBudgetEditors = pendingInvites
    .filter((invite) => invitePermission(invite, "budget").write === true)
    .map(inviteEmail)
    .filter(Boolean);
  const pendingBudgetViewers = pendingInvites
    .filter((invite) => {
      const budgetPermission = invitePermission(invite, "budget");
      return permissionCanRead(budgetPermission) && budgetPermission.write !== true;
    })
    .map(inviteEmail)
    .filter(Boolean);
  const isMember = memberEmails.includes(normalizeEmail(myEmail));
  const canManage = canManageCustodyGroup(group, user, myEmail, { isOwner, isAdmin, familyId });
  const canDelete = canDeleteCustodyGroup(group, user, myEmail);
  const isViewerOnly = !canManage && !isMember && viewerEmails.includes(normalizeEmail(myEmail));
  const children = getCustodyGroupChildren(group);
  const parents = getCustodyGroupParents(group);
  const parentLabels = parentNames(group);

  return (
    <Card className="rounded-3xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black text-slate-950">
              {group.name || "Custody Group"}
            </h3>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              External custody
            </Badge>
            {isViewerOnly && (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
                View only
              </Badge>
            )}
            {canManage && !isMember && (
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                Manager
              </Badge>
            )}
            {isMember && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Member
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {children.length ? children.join(", ") : "No child selected"}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Baby className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Parents / Members
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parents.length > 0 ? parents.map((parent, index) => {
              const color = getColorMeta(parent.color || parent.custodyColor || (index === 0 ? "blue" : "amber"));
              return (
                <span
                  key={`${parent.email || parent.name}-${index}`}
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${color.bg} ${color.text} ${color.border}`}
                >
                  {parent.name || parent.email || "Parent"}
                </span>
              );
            }) : (
              <p className="text-sm font-bold text-slate-600">
                {parentLabels.length ? parentLabels.join(" & ") : memberEmails.join(", ") || "Not configured"}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            <Eye className="h-3.5 w-3.5" />
            Viewers
          </div>
          <p className="mt-2 text-sm font-bold text-slate-600">
            {viewerEmails.length ? viewerEmails.join(", ") : "No viewers"}
          </p>
          {pendingViewerEmails.length > 0 && (
            <p className="mt-1 text-xs font-bold text-amber-700">
              Pending: {pendingViewerEmails.join(", ")}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            <WalletCards className="h-3.5 w-3.5" />
            Budget access
          </div>
          <div className="mt-2 space-y-1.5 text-sm font-bold text-slate-600">
            <p>
              Editors: {budgetEditors.length ? budgetEditors.join(", ") : "Parents only"}
            </p>
            <p>
              View only: {budgetViewers.length ? budgetViewers.join(", ") : "No extra viewers"}
            </p>
            {(pendingBudgetEditors.length > 0 || pendingBudgetViewers.length > 0) && (
              <p className="text-xs text-amber-700">
                Pending: {[...pendingBudgetEditors, ...pendingBudgetViewers].join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {pendingMemberEmails.length > 0 && (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          Pending parent invite: {pendingMemberEmails.join(", ")}
        </p>
      )}

      {(canManage || canDelete) && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {canManage && (
            <Button type="button" variant="outline" onClick={() => onEdit(group)} className="gap-2 rounded-2xl">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onDelete(group)}
              className="gap-2 rounded-2xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function CustodyGroupsManager() {
  const { user, myEmail, profile, familyId, isOwner, isAdmin, refreshCustodyGroups } = useFamily();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticeDialog, setNoticeDialog] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showNotice = ({ tone = "info", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };

  const askConfirm = ({ tone = "danger", title, message, confirmLabel = "Confirm", onConfirm }) => {
    setConfirmDialog({ tone, title, message, confirmLabel, onConfirm });
  };


  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const householdChildren = useMemo(() => getHouseholdChildren(profile), [profile]);
  const familyChildren = useMemo(() => householdChildren.map(childLabel).filter(Boolean), [householdChildren]);
  const canCreateCustodyGroups = Boolean(isOwner || isAdmin);

  const loadGroups = async () => {
    const email = normalizeEmail(myEmail);
    if (!email) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const ref = collection(db, "custodyGroups");
      const groupQueries = buildCustodyGroupAccessQueries({
        collectionRef: ref,
        user,
        email,
        familyId,
      });
      const results = await Promise.allSettled(
        groupQueries.map((groupQuery) => getDocs(groupQuery))
      );
      const linkedGroups = await getCustodyGroupsByIds(db, custodyGroupIdsFromFamily(profile));

      if (!linkedGroups.length && results.every((result) => result.status === "rejected")) {
        throw results[0].reason;
      }

      setGroups(
        mergeCustodyGroups([
          ...linkedGroups,
          ...mapSettledFirestoreSnapshots(results, { type: "custodyGroup" }),
        ])
          .filter((group) => shouldIncludeCustodyGroup(group, { familyId, user, email }))
      );
    } catch (error) {
      console.error("Error loading custody groups:", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [myEmail, familyId, profile, user]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingGroupId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    if (!canCreateCustodyGroups) {
      showNotice({
        tone: "warning",
        title: "Admin access required",
        message: "Only the owner or an admin of this family space can create a custody group here. If you need your own custody setup, create it inside your own family space.",
      });
      return;
    }

    if (showForm && !editingGroupId) {
      resetForm();
      return;
    }

    setForm(EMPTY_FORM);
    setEditingGroupId(null);
    setShowForm(true);
  };

  const startEdit = (group) => {
    const parents = getCustodyGroupParents(group);
    const dadParent = parents.find((parent) => parent.role === "dad") || parents[0] || {};
    const momParent = parents.find((parent) => parent.role === "mom") || parents[1] || {};
    const memberEmails = getCustodyGroupMemberEmails(group);
    const budgetWriterEmails = groupAccessEmails(group, "budgetWriterEmails", "budget_writer_emails");
    const budgetReaderEmails = groupAccessEmails(group, "budgetReaderEmails", "budget_reader_emails");
    const budgetEditors = emailListWithout(budgetWriterEmails, memberEmails);
    const budgetViewers = emailListWithout(budgetReaderEmails, [...memberEmails, ...budgetWriterEmails]);

    setEditingGroupId(group.id);
    setForm({
      name: group.name || "",
      children: getCustodyGroupChildren(group).join(", "),
      dadName: dadParent.name || dadParent.displayName || "",
      dadEmail: dadParent.email || memberEmails[0] || myEmail || "",
      dadColor: dadParent.color || dadParent.custodyColor || "blue",
      momName: momParent.name || momParent.displayName || "",
      momEmail: momParent.email || memberEmails[1] || "",
      momColor: momParent.color || momParent.custodyColor || "amber",
      viewerEmails: getCustodyGroupViewerEmails(group).join(", "),
      budgetViewerEmails: budgetViewers.join(", "),
      budgetEditorEmails: budgetEditors.join(", "),
    });
    setShowForm(true);
  };

  const ensureChildRecords = async (childNames, now) => {
    const cleanNames = splitCsv(childNames.join(","));
    const records = [];

    for (const name of cleanNames) {
      const nameKey = normalizeKey(name);
      let existing = null;

      try {
        const q = query(
          collection(db, "children"),
          where("householdFamilyId", "==", familyId),
          where("nameKey", "==", nameKey)
        );
        const snap = await getDocs(q);
        existing = snap.docs[0] || null;
      } catch (error) {
        console.warn("Could not query child record, creating a new one:", error);
      }

      if (existing) {
        records.push(normalizeChildRecord({ id: existing.id, ...existing.data() }));
        continue;
      }

      const childRef = doc(collection(db, "children"));
      const childPayload = {
        id: childRef.id,
        childId: childRef.id,
        name,
        childName: name,
        nameKey,
        householdFamilyId: familyId || null,
        familyId: familyId || null,
        linkedFamilyIds: [familyId].filter(Boolean),
        relationshipType: CHILD_RELATIONSHIP_TYPES.EXTERNAL_CUSTODY,
        custodyGroupIds: [],
        createdBy: user.uid,
        createdByEmail: user.email || myEmail || null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(childRef, childPayload);
      records.push(normalizeChildRecord(childPayload));
    }

    return records;
  };

  const saveGroup = async (event) => {
    event.preventDefault();

    if (!user || !myEmail || saving) return;

    if (!editingGroupId && !canCreateCustodyGroups) {
      showNotice({
        tone: "warning",
        title: "Admin access required",
        message: "Only the owner or an admin of this family space can create custody groups here.",
      });
      return;
    }

    const cleanName = form.name.trim();
    const children = splitCsv(form.children);
    const activeEmail = normalizeEmail(myEmail || user.email);
    const dadEmail = normalizeEmail(form.dadEmail || activeEmail);
    const momEmail = normalizeEmail(form.momEmail);
    const parentEmails = normalizeEmailList([dadEmail, momEmail]);
    const blockedParentEmails = new Set(parentEmails);
    const budgetEditorEmails = splitEmailCsv(form.budgetEditorEmails)
      .filter((email) => !blockedParentEmails.has(email));
    const budgetViewerEmails = splitEmailCsv(form.budgetViewerEmails)
      .filter((email) => !blockedParentEmails.has(email) && !budgetEditorEmails.includes(email));
    const viewerEmails = normalizeEmailList([
      ...splitEmailCsv(form.viewerEmails),
      ...budgetViewerEmails,
      ...budgetEditorEmails,
    ]).filter((email) => !blockedParentEmails.has(email));

    if (!cleanName) {
      showNotice({
        tone: "warning",
        title: "Group name required",
        message: "Please add a custody group name.",
      });
      return;
    }

    if (!children.length) {
      showNotice({
        tone: "warning",
        title: "Child required",
        message: "Please add at least one child.",
      });
      return;
    }

    if (parentEmails.length < 2) {
      showNotice({
        tone: "warning",
        title: "Parent emails required",
        message: "Please add both parent emails. The other parent will be invited before access is granted.",
      });
      return;
    }

    setSaving(true);

    try {
      const now = serverTimestamp();
      const nowIso = new Date().toISOString();
      const childRecords = await ensureChildRecords(children, now);
      const existingGroup = editingGroupId ? groups.find((group) => group.id === editingGroupId) : null;
      const groupRef = editingGroupId ? doc(db, "custodyGroups", editingGroupId) : doc(collection(db, "custodyGroups"));
      const groupId = editingGroupId || groupRef.id;
      const acceptedMemberEmails = normalizeEmailList([
        ...(editingGroupId ? getCustodyGroupMemberEmails(existingGroup) : []),
        activeEmail,
      ]);
      const acceptedMemberIds = [
        ...new Set([
          ...(Array.isArray(existingGroup?.memberIds) ? existingGroup.memberIds : []),
          user.uid,
        ].filter(Boolean)),
      ];
      const acceptedViewerEmails = normalizeEmailList(
        editingGroupId ? getCustodyGroupViewerEmails(existingGroup) : []
      ).filter((email) => !acceptedMemberEmails.includes(email));
      const acceptedViewerIds = (Array.isArray(existingGroup?.viewerIds) ? existingGroup.viewerIds : [])
        .filter((uid) => !acceptedMemberIds.includes(uid));
      const acceptedPrincipalEmails = normalizeEmailList([...acceptedMemberEmails, ...acceptedViewerEmails]);
      const acceptedBudgetEditorEmails = budgetEditorEmails.filter((email) => acceptedPrincipalEmails.includes(email));
      const acceptedBudgetViewerEmails = budgetViewerEmails.filter((email) => acceptedPrincipalEmails.includes(email));
      const adminIds = [
        ...new Set([
          ...(Array.isArray(existingGroup?.adminIds) ? existingGroup.adminIds : []),
          ...(Array.isArray(existingGroup?.admin_ids) ? existingGroup.admin_ids : []),
          existingGroup?.ownerId,
          existingGroup?.owner_id,
          user.uid,
        ].filter(Boolean)),
      ];
      const adminEmails = normalizeEmailList([
        ...(Array.isArray(existingGroup?.adminEmails) ? existingGroup.adminEmails : []),
        ...(Array.isArray(existingGroup?.admin_emails) ? existingGroup.admin_emails : []),
        existingGroup?.ownerEmail,
        existingGroup?.owner_email,
        user.email,
        myEmail,
      ]);
      const pendingMemberEmails = getPendingMemberEmails(existingGroup);
      const pendingViewerEmails = getPendingViewerEmails(existingGroup);
      const payload = buildCustodyGroupPayload({
        groupName: cleanName,
        familyId,
        childRecords,
        currentUser: user,
        currentEmail: myEmail,
        parentName: form.dadName.trim() || user.displayName || "Dad",
        parentEmail: dadEmail,
        parentRole: "dad",
        parentColor: form.dadColor || "blue",
        coparentName: form.momName.trim() || "Mom",
        coparentEmail: momEmail,
        coparentRole: "mom",
        coparentColor: form.momColor || "amber",
        now,
      });

      let finalPayload = {
        ...payload,
        custodyGroupId: groupId,
        relationshipType: CHILD_RELATIONSHIP_TYPES.EXTERNAL_CUSTODY,
        memberIds: acceptedMemberIds,
        memberEmails: acceptedMemberEmails,
        member_emails: acceptedMemberEmails,
        viewerIds: acceptedViewerIds,
        viewerEmails: acceptedViewerEmails,
        viewer_emails: acceptedViewerEmails,
        pendingMemberEmails,
        pending_member_emails: pendingMemberEmails,
        pendingViewerEmails,
        pending_viewer_emails: pendingViewerEmails,
        pendingInvites: existingGroup?.pendingInvites || existingGroup?.pending_invites || [],
        pending_invites: existingGroup?.pendingInvites || existingGroup?.pending_invites || [],
        ownerId: existingGroup?.ownerId || existingGroup?.owner_id || payload.ownerId,
        owner_id: existingGroup?.owner_id || existingGroup?.ownerId || payload.ownerId,
        ownerEmail: existingGroup?.ownerEmail || existingGroup?.owner_email || payload.ownerEmail,
        owner_email: existingGroup?.owner_email || existingGroup?.ownerEmail || payload.ownerEmail,
        adminIds,
        admin_ids: adminIds,
        adminEmails,
        admin_emails: adminEmails,
        ...buildCustodyModuleAccessArrays({
          memberIds: acceptedMemberIds,
          memberEmails: acceptedMemberEmails,
          viewerIds: acceptedViewerIds,
          viewerEmails: acceptedViewerEmails,
          budgetViewerEmails: acceptedBudgetViewerEmails,
          budgetEditorEmails: acceptedBudgetEditorEmails,
        }),
        createdBy: existingGroup?.createdBy || existingGroup?.created_by || payload.createdBy,
        created_by: existingGroup?.created_by || existingGroup?.createdBy || payload.createdBy,
        createdByEmail: existingGroup?.createdByEmail || existingGroup?.created_by_email || payload.createdByEmail,
        created_by_email: existingGroup?.created_by_email || existingGroup?.createdByEmail || payload.createdByEmail,
      };

      const inviteSpecs = [
        {
          email: dadEmail,
          name: form.dadName.trim() || "Dad",
          role: "dad",
          access: "member",
          permissions: {
            custody: { read: true, write: true },
            budget: { read: true, write: true },
          },
        },
        {
          email: momEmail,
          name: form.momName.trim() || "Mom",
          role: "mom",
          access: "member",
          permissions: {
            custody: { read: true, write: true },
            budget: { read: true, write: true },
          },
        },
        ...viewerEmails.map((email) => {
          const budgetWrite = budgetEditorEmails.includes(email);
          const budgetRead = budgetWrite || budgetViewerEmails.includes(email);

          return {
            email,
            name: email,
            role: budgetWrite ? "budget_editor" : "viewer",
            access: "viewer",
            permissions: {
              custody: { read: true, write: false },
              budget: { read: budgetRead, write: budgetWrite },
            },
          };
        }),
      ];

      const invitationMap = new Map();
      inviteSpecs.forEach((spec) => {
        const email = normalizeEmail(spec.email);
        if (!email || email === activeEmail) return;
        if (spec.access === "viewer" && (acceptedViewerEmails.includes(email) || acceptedMemberEmails.includes(email))) return;
        if (spec.access !== "viewer" && acceptedMemberEmails.includes(email)) return;

        const invite = buildCustodyInvitation({
          groupId,
          householdFamilyId: familyId,
          groupName: cleanName,
          recipientName: spec.name,
          recipientEmail: email,
          role: spec.role,
          access: spec.access,
          permissions: spec.permissions,
          createdBy: user.uid,
          createdByEmail: user.email || myEmail,
          now: nowIso,
        });

        if (invite) invitationMap.set(invite.id, invite);
      });

      const invitations = Array.from(invitationMap.values());
      invitations.forEach((invite) => {
        finalPayload = withPendingCustodyInvitation(finalPayload, invite);
      });

      if (editingGroupId) {
        if (invitations.length) {
          const batch = writeBatch(db);
          batch.update(groupRef, finalPayload);
          invitations.forEach((invite) => {
            batch.set(
              doc(db, "custodyInvitations", custodyInvitationId(groupId, invite.recipientEmail)),
              invite,
              { merge: true }
            );
          });
          await batch.commit();
        } else {
          await updateDoc(groupRef, finalPayload);
        }
      } else {
        const basePayload = {
          ...finalPayload,
          pendingMemberEmails: [],
          pending_member_emails: [],
          pendingViewerEmails: [],
          pending_viewer_emails: [],
          pendingInvites: [],
          pending_invites: [],
        };

        await setDoc(groupRef, {
          ...basePayload,
          createdAt: now,
        });

        if (invitations.length) {
          const batch = writeBatch(db);
          batch.update(groupRef, {
            pendingMemberEmails: finalPayload.pendingMemberEmails || [],
            pending_member_emails: finalPayload.pending_member_emails || [],
            pendingViewerEmails: finalPayload.pendingViewerEmails || [],
            pending_viewer_emails: finalPayload.pending_viewer_emails || [],
            pendingInvites: finalPayload.pendingInvites || [],
            pending_invites: finalPayload.pending_invites || [],
            updatedAt: now,
          });
          invitations.forEach((invite) => {
            batch.set(
              doc(db, "custodyInvitations", custodyInvitationId(groupId, invite.recipientEmail)),
              invite,
              { merge: true }
            );
          });
          await batch.commit();
        }
      }

      if (familyId) {
        await setDoc(
          doc(db, "families", familyId),
          {
            custodyGroupIds: arrayUnion(groupId),
            custody_group_ids: arrayUnion(groupId),
            updatedAt: now,
          },
          { merge: true }
        );
      }

      await Promise.all(
        childRecords.map((child) =>
          setDoc(
            doc(db, "children", child.id),
            {
              custodyGroupIds: [...new Set([...(child.custodyGroupIds || []), groupId].filter(Boolean))],
              updatedAt: now,
            },
            { merge: true }
          )
        )
      );

      let queuedEmailCount = 0;
      let queuedNotificationCount = 0;
      if (invitations.length) {
        const emailQueueResults = await Promise.allSettled(
          invitations.map(async (invite) => {
            const inviteDeliveryOptions = {
              invitation: invite,
              groupName: cleanName,
              inviterName: user?.displayName || myEmail || user?.email || "Custody admin",
            };

            try {
              const workerResult = await sendCustodyInvitationViaWorker(inviteDeliveryOptions);
              if (workerResult) return workerResult;
            } catch (workerError) {
              console.warn("Custody invitation Worker delivery failed, falling back to Firestore queue:", workerError);
            }

            return queueCustodyInvitationEmail(inviteDeliveryOptions);
          })
        );
        queuedEmailCount = emailQueueResults.filter((result) => result.status === "fulfilled").length;
        emailQueueResults
          .filter((result) => result.status === "rejected")
          .forEach((result) => {
            console.warn("Custody invitation email could not be queued:", result.reason);
          });

        try {
          const notificationIds = await queueCustodyInvitationNotifications({
            invitations,
            groupName: cleanName,
            inviterName: user?.displayName || myEmail || user?.email || "Custody admin",
          });
          queuedNotificationCount = notificationIds.length;
        } catch (notificationError) {
          console.warn("Custody invitation notifications could not be queued:", notificationError);
        }
      }

      resetForm();
      await loadGroups();
      refreshCustodyGroups?.();
      showNotice({
        tone: "success",
        title: editingGroupId ? "Custody group updated" : "Custody group created",
        message: invitations.length
          ? queuedEmailCount === invitations.length && queuedNotificationCount === invitations.length
            ? `${invitations.length} invitation${invitations.length === 1 ? "" : "s"} pending with email and in-app notification queued.`
            : `${invitations.length} invitation${invitations.length === 1 ? "" : "s"} pending. ${queuedEmailCount} email${queuedEmailCount === 1 ? "" : "s"} and ${queuedNotificationCount} in-app notification${queuedNotificationCount === 1 ? "" : "s"} queued.`
          : "No new invitations were needed because every listed email already has access or belongs to you.",
      });
    } catch (error) {
      console.error("Error saving custody group:", error);
      showNotice({
        tone: "danger",
        title: "Could not save custody group",
        message: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (group, { skipConfirm = false } = {}) => {
    if (!canDeleteCustodyGroup(group, user, myEmail)) {
      showNotice({
        tone: "warning",
        title: "Permission required",
        message: "Only the custody group owner, creator, or group admin can delete it. Invited parents can accept or decline access from Invitations.",
      });
      return;
    }

    if (!skipConfirm) {
      askConfirm({
        tone: "danger",
        title: "Delete custody group?",
        message: "This will delete the custody group plus its calendar days, exchanges, packing items, travel plans, expenses, notifications, and pending invitations.",
        confirmLabel: "Delete group and records",
        onConfirm: () => deleteGroup(group, { skipConfirm: true }),
      });
      return;
    }

    setSaving(true);

    try {
      const result = await deleteCustodyGroupCascade(group.id);
      await loadGroups();
      refreshCustodyGroups?.();
      showNotice({
        tone: "success",
        title: "Custody group deleted",
        message: `${result.deletedRecords} related record${result.deletedRecords === 1 ? "" : "s"} removed.`,
      });
    } catch (error) {
      console.error("Error deleting custody group:", error);
      showNotice({
        tone: "danger",
        title: "Could not delete custody group",
        message: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-5 rounded-[2rem] border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Custody Groups
          </p>
          <h2 className="text-lg font-black text-slate-950">Manage external custody profiles</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Create custody groups only for children who need a separate custody schedule with another parent. Joint household children do not require a custody group.
          </p>
        </div>

        {canCreateCustodyGroups ? (
          <Button type="button" onClick={startCreate} className="w-fit gap-2 rounded-2xl">
            <Plus className="h-4 w-4" />
            {showForm && !editingGroupId ? "Close" : "New custody group"}
          </Button>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            View access. Ask a family admin to create custody groups here.
          </div>
        )}
      </div>

      {familyChildren.length > 0 && (
        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Household children
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {familyChildren.map((child) => (
              <span key={child} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                {child}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            These children can appear in family calendar, tasks, meals, and groceries. Add a custody group only when a child has custody with another parent outside this household.
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={saveGroup} className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">
                {editingGroupId ? "Edit external custody group" : "Create external custody group"}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Members can edit. Viewers can only see this custody calendar.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Group name</label>
              <Input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Child custody"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Child / Children</label>
              <Input
                value={form.children}
                onChange={(event) => updateForm("children", event.target.value)}
                placeholder={familyChildren.length ? familyChildren.join(", ") : "Child name"}
                className="mt-1"
              />
              <p className="mt-1 text-xs font-semibold text-slate-500">Use commas for multiple children. The app will reuse an existing child record in this household or create one with a unique childId.</p>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Parent A name</label>
              <Input
                value={form.dadName}
                onChange={(event) => updateForm("dadName", event.target.value)}
                placeholder={user?.displayName || "Your name"}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Parent A email</label>
              <Input
                value={form.dadEmail}
                onChange={(event) => updateForm("dadEmail", event.target.value)}
                placeholder={myEmail || "daniel@email.com"}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <ColorSelector
                label="Parent A custody color"
                value={form.dadColor}
                onChange={(color) => updateForm("dadColor", color)}
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Parent B name</label>
              <Input
                value={form.momName}
                onChange={(event) => updateForm("momName", event.target.value)}
                placeholder="Amanda"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Parent B email</label>
              <Input
                value={form.momEmail}
                onChange={(event) => updateForm("momEmail", event.target.value)}
                placeholder="amanda@email.com"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <ColorSelector
                label="Parent B custody color"
                value={form.momColor}
                onChange={(color) => updateForm("momColor", color)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Viewers</label>
              <Input
                value={form.viewerEmails}
                onChange={(event) => updateForm("viewerEmails", event.target.value)}
                placeholder="mary@email.com"
                className="mt-1"
              />
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Viewers can see the custody calendar. Budget access is controlled separately below.
              </p>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-blue-100 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-500">Access permissions</p>
                  <h3 className="mt-1 text-base font-black text-slate-950">Custody and budget stay separate</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Parents can edit custody and budget by default. Add extra people only when they truly need access.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-700">
                  Budget is sensitive
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Custody calendar
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    Parents edit. Viewers read only.
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Use the Viewers field for grandparents, caregivers, or partners who should only see custody information.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    <WalletCards className="h-3.5 w-3.5" />
                    Budget
                  </div>
                  <div className="mt-3 grid gap-3">
                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Budget viewers</span>
                      <Input
                        value={form.budgetViewerEmails}
                        onChange={(event) => updateForm("budgetViewerEmails", event.target.value)}
                        placeholder="viewer@email.com"
                        className="mt-1 bg-white"
                      />
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                        Can view expenses but cannot add payments or edit records.
                      </span>
                    </label>

                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Budget editors</span>
                      <Input
                        value={form.budgetEditorEmails}
                        onChange={(event) => updateForm("budgetEditorEmails", event.target.value)}
                        placeholder="editor@email.com"
                        className="mt-1 bg-white"
                      />
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                        Can add expenses, mark payments, and edit the shared ledger.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Users className="h-4 w-4" />
              {saving ? "Saving..." : editingGroupId ? "Save changes" : "Create custody group"}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {loading && [0, 1].map((item) => <div key={item} className="h-44 animate-pulse rounded-3xl bg-slate-100" />)}

        {!loading && groups.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500 xl:col-span-2">
            No external custody groups yet. Create one only if a child needs a separate custody calendar with another parent.
          </div>
        )}

        {!loading && groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            user={user}
            myEmail={myEmail}
            isOwner={isOwner}
            isAdmin={isAdmin}
            familyId={familyId}
            onEdit={startEdit}
            onDelete={deleteGroup}
          />
        ))}
      </div>

      <AppDialog
        open={Boolean(confirmDialog)}
        tone={confirmDialog?.tone}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel || "Confirm"}
        cancelLabel="Cancel"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          action?.();
        }}
      />

      <AppDialog
        open={Boolean(noticeDialog)}
        tone={noticeDialog?.tone}
        title={noticeDialog?.title}
        message={noticeDialog?.message}
        confirmLabel="Got it"
        onCancel={() => setNoticeDialog(null)}
        onConfirm={() => setNoticeDialog(null)}
      />
    </Card>
  );
}
