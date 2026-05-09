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
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const EMPTY_FORM = {
  name: "",
  children: "",
  dadName: "",
  dadEmail: "",
  momName: "",
  momEmail: "",
  viewerEmails: "",
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitEmailCsv(value) {
  return [...new Set(splitCsv(value).map(normalizeEmail).filter(Boolean))];
}

function childLabel(child) {
  if (!child) return "";
  if (typeof child === "string") return child;
  return child.name || child.fullName || child.displayName || child.childName || child.firstName || "Child";
}

function groupChildNames(group) {
  if (Array.isArray(group?.children) && group.children.length) {
    return group.children.map(childLabel).filter(Boolean);
  }

  if (Array.isArray(group?.childNames) && group.childNames.length) return group.childNames;
  if (Array.isArray(group?.childIds) && group.childIds.length) return group.childIds;
  if (group?.childName) return [group.childName];

  return [];
}

function groupParents(group) {
  if (Array.isArray(group?.parents)) return group.parents;
  if (Array.isArray(group?.coParents)) return group.coParents;
  return [];
}

function parentNames(group) {
  return groupParents(group)
    .map((parent) => parent.name || parent.displayName || parent.email)
    .filter(Boolean);
}

function groupViewerEmails(group) {
  const viewerEmails = Array.isArray(group?.viewerEmails) ? group.viewerEmails : [];
  const legacyViewerEmails = Array.isArray(group?.viewer_emails) ? group.viewer_emails : [];
  return [...new Set([...viewerEmails, ...legacyViewerEmails].map(normalizeEmail).filter(Boolean))];
}

function groupMemberEmails(group) {
  const memberEmails = Array.isArray(group?.memberEmails) ? group.memberEmails : [];
  const legacyMemberEmails = Array.isArray(group?.member_emails) ? group.member_emails : [];
  const parentEmails = groupParents(group).map((parent) => parent.email).filter(Boolean);
  return [...new Set([...memberEmails, ...legacyMemberEmails, ...parentEmails].map(normalizeEmail).filter(Boolean))];
}

function mergeGroups(...groupLists) {
  const map = new Map();
  groupLists.flat().forEach((group) => {
    if (group?.id) map.set(group.id, group);
  });
  return Array.from(map.values());
}

function GroupCard({ group, myEmail, onEdit, onDelete }) {
  const memberEmails = groupMemberEmails(group);
  const viewerEmails = groupViewerEmails(group);
  const isMember = memberEmails.includes(normalizeEmail(myEmail));
  const isViewerOnly = !isMember && viewerEmails.includes(normalizeEmail(myEmail));
  const children = groupChildNames(group);
  const parents = parentNames(group);

  return (
    <Card className="rounded-3xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black text-slate-950">
              {group.name || "Custody Group"}
            </h3>
            {isViewerOnly && (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
                View only
              </Badge>
            )}
            {isMember && (
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
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
          <p className="mt-2 text-sm font-bold text-slate-600">
            {parents.length ? parents.join(" & ") : memberEmails.join(", ") || "Not configured"}
          </p>
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

      {isMember && (
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
  const { user, myEmail, profile, familyId } = useFamily();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const familyChildren = useMemo(() => {
    if (Array.isArray(profile?.children)) return profile.children.map(childLabel).filter(Boolean);
    if (profile?.child_name) return [profile.child_name];
    return [];
  }, [profile]);

  const loadGroups = async () => {
    if (!myEmail) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const ref = collection(db, "custodyGroups");
      const memberQuery = query(ref, where("memberEmails", "array-contains", myEmail));
      const viewerQuery = query(ref, where("viewerEmails", "array-contains", myEmail));

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

      setGroups(mergeGroups(memberGroups, viewerGroups));
    } catch (error) {
      console.error("Error loading custody groups:", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const parents = groupParents(group);
    const dadParent = parents.find((parent) => parent.role === "dad") || parents[0] || {};
    const momParent = parents.find((parent) => parent.role === "mom") || parents[1] || {};

    setEditingGroupId(group.id);
    setForm({
      name: group.name || "",
      children: groupChildNames(group).join(", "),
      dadName: dadParent.name || dadParent.displayName || "",
      dadEmail: dadParent.email || groupMemberEmails(group)[0] || myEmail || "",
      momName: momParent.name || momParent.displayName || "",
      momEmail: momParent.email || groupMemberEmails(group)[1] || "",
      viewerEmails: groupViewerEmails(group).join(", "),
    });
    setShowForm(true);
  };

  const saveGroup = async (event) => {
    event.preventDefault();

    if (!user || !myEmail || saving) return;

    const cleanName = form.name.trim();
    const children = splitCsv(form.children);
    const dadEmail = normalizeEmail(form.dadEmail || myEmail);
    const momEmail = normalizeEmail(form.momEmail);
    const viewerEmails = splitEmailCsv(form.viewerEmails).filter((email) => email !== dadEmail && email !== momEmail);
    const memberEmails = [...new Set([dadEmail, momEmail].filter(Boolean))];

    if (!cleanName) {
      window.alert("Please add a custody group name.");
      return;
    }

    if (!children.length) {
      window.alert("Please add at least one child.");
      return;
    }

    if (memberEmails.length < 2) {
      window.alert("Please add both parent/member emails.");
      return;
    }

    setSaving(true);

    try {
      const now = serverTimestamp();
      const parents = [
        {
          role: "dad",
          name: form.dadName.trim() || user.displayName || "Dad",
          email: dadEmail,
        },
        {
          role: "mom",
          name: form.momName.trim() || "Mom",
          email: momEmail,
        },
      ];

      const payload = {
        name: cleanName,
        familyId: familyId || null,
        householdFamilyId: familyId || null,
        children,
        childNames: children,
        parents,
        coParents: parents,
        memberEmails,
        member_emails: memberEmails,
        viewerEmails,
        viewer_emails: viewerEmails,
        updatedAt: now,
      };

      if (editingGroupId) {
        await updateDoc(doc(db, "custodyGroups", editingGroupId), payload);
      } else {
        const groupRef = doc(collection(db, "custodyGroups"));
        await setDoc(groupRef, {
          ...payload,
          createdBy: user.uid,
          createdByEmail: user.email || myEmail,
          createdAt: now,
        });
      }

      resetForm();
      await loadGroups();
    } catch (error) {
      console.error("Error saving custody group:", error);
      window.alert(`Could not save custody group: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (group) => {
    const confirmed = window.confirm(
      `Delete ${group.name || "this custody group"}? This removes the group profile. Existing custody days are not deleted.`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await deleteDoc(doc(db, "custodyGroups", group.id));
      await loadGroups();
    } catch (error) {
      console.error("Error deleting custody group:", error);
      window.alert(`Could not delete custody group: ${error.message}`);
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
          <h2 className="text-lg font-black text-slate-950">Manage child custody profiles</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Create separate custody groups so Joaquin and Mady can have independent schedules and permissions.
          </p>
        </div>

        <Button type="button" onClick={startCreate} className="w-fit gap-2 rounded-2xl">
          <Plus className="h-4 w-4" />
          {showForm && !editingGroupId ? "Close" : "New custody group"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={saveGroup} className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">
                {editingGroupId ? "Edit custody group" : "Create custody group"}
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
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Children</label>
              <Input
                value={form.children}
                onChange={(event) => updateForm("children", event.target.value)}
                placeholder={familyChildren.length ? familyChildren.join(", ") : "Joaquin"}
                className="mt-1"
              />
              <p className="mt-1 text-xs font-semibold text-slate-500">Use commas for multiple children.</p>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Dad / Parent A name</label>
              <Input
                value={form.dadName}
                onChange={(event) => updateForm("dadName", event.target.value)}
                placeholder={user?.displayName || "Daniel"}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Dad / Parent A email</label>
              <Input
                value={form.dadEmail}
                onChange={(event) => updateForm("dadEmail", event.target.value)}
                placeholder={myEmail || "daniel@email.com"}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mom / Parent B name</label>
              <Input
                value={form.momName}
                onChange={(event) => updateForm("momName", event.target.value)}
                placeholder="Amanda"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mom / Parent B email</label>
              <Input
                value={form.momEmail}
                onChange={(event) => updateForm("momEmail", event.target.value)}
                placeholder="amanda@email.com"
                className="mt-1"
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
              <p className="mt-1 text-xs font-semibold text-slate-500">Viewers can see this custody group but cannot edit it.</p>
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
            No custody groups yet. Create Joaquin custody, Mady custody, or any separate custody profile you need.
          </div>
        )}

        {!loading && groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            myEmail={myEmail}
            onEdit={startEdit}
            onDelete={deleteGroup}
          />
        ))}
      </div>
    </Card>
  );
}
