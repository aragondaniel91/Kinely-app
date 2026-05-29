import React, { useEffect, useMemo, useState } from "react";
import { Baby, Eye, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import {
  collection,
  deleteDoc,
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
  buildCustodyInvitation,
  custodyInvitationId,
  withPendingCustodyInvitation,
} from "@/lib/invitationUtils";
import { PERSON_COLOR_OPTIONS, getColorMeta } from "@/lib/personColorUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  const isMember = memberEmails.includes(normalizeEmail(myEmail));
  const canManage = canManageCustodyGroup(group, user, myEmail, { isOwner, isAdmin, familyId });
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

      <div className="mt-4 grid gap-2 md:grid-cols-2">
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
        </div>
      </div>

      {canManage && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onEdit(group)} className="gap-2 rounded-2xl">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onDelete(group)}
            className="gap-2 rounded-2xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function CustodyGroupsManager() {
  const { user, myEmail, profile, familyId, isOwner, isAdmin } = useFamily();
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
      const memberQuery = query(ref, where("memberEmails", "array-contains", email));
      const viewerQuery = query(ref, where("viewerEmails", "array-contains", email));

      const [memberSnap, viewerSnap] = await Promise.allSettled([
        getDocs(memberQuery),
        getDocs(viewerQuery),
      ]);

      const memberGroups = memberSnap.status === "fulfilled"
        ? memberSnap.value.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        : [];

      const viewerGroups = viewerSnap.status === "fulfilled"
        ? viewerSnap.value.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        : [];

      setGroups(mergeCustodyGroups(memberGroups, viewerGroups));
    } catch (error) {
      console.error("Error loading custody groups:", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [myEmail, familyId]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingGroupId(null);
    setShowForm(false);
  };

  const startCreate = () => {
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

    const cleanName = form.name.trim();
    const children = splitCsv(form.children);
    const activeEmail = normalizeEmail(myEmail || user.email);
    const dadEmail = normalizeEmail(form.dadEmail || activeEmail);
    const momEmail = normalizeEmail(form.momEmail);
    const viewerEmails = splitEmailCsv(form.viewerEmails).filter((email) => email !== dadEmail && email !== momEmail);
    const parentEmails = normalizeEmailList([dadEmail, momEmail]);

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
      const acceptedViewerEmails = normalizeEmailList(
        editingGroupId ? getCustodyGroupViewerEmails(existingGroup) : []
      ).filter((email) => !acceptedMemberEmails.includes(email));
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
        relationshipType: CHILD_RELATIONSHIP_TYPES.EXTERNAL_CUSTODY,
        memberEmails: acceptedMemberEmails,
        member_emails: acceptedMemberEmails,
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
        },
        {
          email: momEmail,
          name: form.momName.trim() || "Mom",
          role: "mom",
          access: "member",
        },
        ...viewerEmails.map((email) => ({
          email,
          name: email,
          role: "viewer",
          access: "viewer",
        })),
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

      resetForm();
      await loadGroups();
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
    if (!canManageCustodyGroup(group, user, myEmail, { isOwner, isAdmin, familyId })) {
      showNotice({
        tone: "warning",
        title: "Permission required",
        message: "You do not have permission to delete this custody group.",
      });
      return;
    }

    if (!skipConfirm) {
      askConfirm({
        tone: "danger",
        title: "Delete custody group?",
        message: "This will not delete existing custody days, but it will remove the shared group access.",
        confirmLabel: "Delete group",
        onConfirm: () => deleteGroup(group, { skipConfirm: true }),
      });
      return;
    }

    setSaving(true);

    try {
      await deleteDoc(doc(db, "custodyGroups", group.id));
      await loadGroups();
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

        <Button type="button" onClick={startCreate} className="w-fit gap-2 rounded-2xl">
          <Plus className="h-4 w-4" />
          {showForm && !editingGroupId ? "Close" : "New custody group"}
        </Button>
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
                placeholder="Joaquin custody"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Child / Children</label>
              <Input
                value={form.children}
                onChange={(event) => updateForm("children", event.target.value)}
                placeholder={familyChildren.length ? familyChildren.join(", ") : "Joaquin"}
                className="mt-1"
              />
              <p className="mt-1 text-xs font-semibold text-slate-500">Use commas for multiple children. The app will reuse an existing child record in this household or create one with a unique childId.</p>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Parent A name</label>
              <Input
                value={form.dadName}
                onChange={(event) => updateForm("dadName", event.target.value)}
                placeholder={user?.displayName || "Daniel"}
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
              <p className="mt-1 text-xs font-semibold text-slate-500">Viewers can see this custody group but cannot edit it unless they created or manage this group.</p>
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
    </Card>
  );
}
