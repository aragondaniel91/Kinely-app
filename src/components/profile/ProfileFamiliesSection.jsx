import { useEffect, useMemo, useState } from "react";
import { Check, Home, Layers3, Plus, Save, Trash2, Users, X } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { deleteFamilyCascade } from "@/services/familyAdminService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FAMILY_TYPES = [
  {
    value: "household",
    label: "Household",
    description: "Daily home wall for calendar, tasks, meals, lists, and shared routines.",
  },
  {
    value: "coparenting",
    label: "Co-parenting",
    description: "Separated custody space with child schedules, exchanges, packing, and budget controls.",
  },
  {
    value: "shared_household",
    label: "Shared household",
    description: "A home with partners, relatives, adult children, or roommates sharing selected modules.",
  },
  {
    value: "caregiving",
    label: "Caregiving support",
    description: "Limited access space for grandparents, babysitters, caregivers, or trusted helpers.",
  },
];

const FAMILY_TYPE_BY_VALUE = FAMILY_TYPES.reduce((map, option) => {
  map[option.value] = option;
  return map;
}, {});

function familyNameOf(family) {
  return family?.familyName || family?.family_name || "Untitled family";
}

function familyTypeOf(family) {
  const type = family?.familyType || family?.family_type || family?.type || "household";
  return FAMILY_TYPE_BY_VALUE[type] ? type : "household";
}

function familyTypeMeta(type) {
  return FAMILY_TYPE_BY_VALUE[type] || FAMILY_TYPE_BY_VALUE.household;
}

function memberCountOf(family) {
  const memberIds = Array.isArray(family?.memberIds) ? family.memberIds.length : 0;
  const memberEmails = Array.isArray(family?.memberEmails) ? family.memberEmails.length : 0;
  const members = Array.isArray(family?.members) ? family.members.length : 0;
  return Math.max(memberIds, memberEmails, members, family?.ownerEmail || family?.ownerId ? 1 : 0);
}

function childCountOf(family) {
  if (Array.isArray(family?.children)) return family.children.length;
  return family?.child_name || family?.childName ? 1 : 0;
}

function FamilySpaceRow({ active, family, onSelect }) {
  const type = familyTypeMeta(familyTypeOf(family));
  const members = memberCountOf(family);
  const children = childCountOf(family);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-indigo-300 bg-indigo-50 text-slate-950 shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{familyNameOf(family)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{type.label}</p>
        </div>
        {active && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1 text-[11px]">
          <Users className="h-3 w-3" />
          {members} member{members === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline" className="text-[11px]">
          {children} child{children === 1 ? "" : "ren"}
        </Badge>
      </div>
    </button>
  );
}

function StatusMessage({ error, message }) {
  if (!error && !message) return null;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {error || message}
    </div>
  );
}

export default function ProfileFamiliesSection() {
  const {
    user,
    profile,
    allProfiles = [],
    activeProfileId,
    setActiveProfileId,
    createFamily,
    updateActiveFamily,
    refreshFamilies,
    isOwner,
    isAdmin,
  } = useFamily();
  const { toast } = useToast();

  const canManageSpace = isOwner || isAdmin;
  const canDeleteSpace = isOwner;
  const familyOptions = useMemo(() => {
    const families = Array.isArray(allProfiles) ? [...allProfiles] : [];
    return families.sort((a, b) => familyNameOf(a).localeCompare(familyNameOf(b)));
  }, [allProfiles]);

  const [familyName, setFamilyName] = useState("");
  const [familyType, setFamilyType] = useState("household");
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyType, setNewFamilyType] = useState("household");
  const [confirmDeleteFamily, setConfirmDeleteFamily] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFamilyName(familyNameOf(profile));
    setFamilyType(familyTypeOf(profile));
    setMessage("");
    setError("");
  }, [profile?.id, profile?.familyName, profile?.family_name, profile?.type, profile?.familyType, profile?.family_type]);

  const activeType = familyTypeMeta(familyType);
  const activeFamilyId = profile?.id || activeProfileId;

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  async function handleSaveFamily(event) {
    event.preventDefault();
    clearFeedback();

    if (!activeFamilyId) {
      setError("Select a family space before saving.");
      return;
    }

    if (!canManageSpace) {
      setError("Only the owner or an admin can update this family space.");
      return;
    }

    const cleanName = familyName.trim();
    if (!cleanName) {
      setError("Family space name is required.");
      return;
    }

    setSaving(true);
    try {
      await updateActiveFamily({
        familyName: cleanName,
        family_name: cleanName,
        type: familyType,
        familyType,
        family_type: familyType,
      });
      await refreshFamilies?.();
      setMessage("Family space saved.");
      toast({
        title: "Saved",
        description: "Your family space settings have been updated.",
        duration: 3000,
      });
    } catch (saveError) {
      console.error("Error saving family space:", saveError);
      setError(saveError?.message || "Could not save the family space.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateFamily(event) {
    event.preventDefault();
    clearFeedback();

    if (!newFamilyName.trim()) {
      setError("Name the new family space first.");
      return;
    }

    setCreating(true);
    try {
      const newFamilyId = await createFamily?.({
        familyName: newFamilyName.trim(),
        familyType: newFamilyType,
        children: [],
      });
      if (newFamilyId) setActiveProfileId?.(newFamilyId);
      setNewFamilyName("");
      setNewFamilyType("household");
      setShowCreateFamily(false);
      await refreshFamilies?.();
      setMessage("New family space created.");
    } catch (createError) {
      console.error("Error creating family space:", createError);
      setError(createError?.message || "Could not create the family space.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteFamily() {
    const targetFamily = confirmDeleteFamily;
    if (!targetFamily?.id) return;

    clearFeedback();

    if (!canDeleteSpace) {
      setError("Only the owner can delete this family space.");
      setConfirmDeleteFamily(null);
      return;
    }

    setDeleting(true);
    try {
      const remainingFamilies = familyOptions.filter((family) => family.id !== targetFamily.id);
      await deleteFamilyCascade({ familyId: targetFamily.id, userId: user?.uid });
      setConfirmDeleteFamily(null);

      if (remainingFamilies.length > 0) {
        setActiveProfileId?.(remainingFamilies[0].id);
      } else {
        const fallbackFamilyId = await createFamily?.({
          familyName: `${user?.displayName || "My"} Family`,
          familyType: "household",
          children: [],
        });
        if (fallbackFamilyId) setActiveProfileId?.(fallbackFamilyId);
      }

      await refreshFamilies?.();
      setMessage("Family space deleted.");
    } catch (deleteError) {
      console.error("Error deleting family space:", deleteError);
      setError(deleteError?.message || "Could not delete the family space.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <Layers3 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Family Space</h2>
                <p className="text-sm font-semibold text-slate-500">
                  Spaces are the containers. People, roles, invitations, and module permissions live in People & Access.
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowCreateFamily((value) => !value)} className="gap-2 rounded-xl">
            {showCreateFamily ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreateFamily ? "Cancel" : "New space"}
          </Button>
        </div>
      </div>

      <StatusMessage error={error} message={message} />

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <Home className="h-5 w-5 text-indigo-600" />
              Your spaces
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {familyOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
                No family spaces yet.
              </div>
            ) : (
              familyOptions.map((family) => (
                <FamilySpaceRow
                  key={family.id}
                  family={family}
                  active={family.id === activeFamilyId}
                  onSelect={() => setActiveProfileId?.(family.id)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black">
              {showCreateFamily ? "Create a family space" : "Active space settings"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showCreateFamily ? (
              <form className="space-y-5" onSubmit={handleCreateFamily}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-family-name">Space name</Label>
                    <Input
                      id="new-family-name"
                      name="new-family-name"
                      value={newFamilyName}
                      onChange={(event) => setNewFamilyName(event.target.value)}
                      placeholder="Aragon Home"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-family-type">Space type</Label>
                    <Select value={newFamilyType} onValueChange={setNewFamilyType}>
                      <SelectTrigger id="new-family-type" className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FAMILY_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-sm font-black text-indigo-950">{familyTypeMeta(newFamilyType).label}</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-700">
                    {familyTypeMeta(newFamilyType).description}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={creating} className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" />
                    {creating ? "Creating..." : "Create space"}
                  </Button>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleSaveFamily}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="family-name">Space name</Label>
                    <Input
                      id="family-name"
                      name="family-name"
                      value={familyName}
                      onChange={(event) => setFamilyName(event.target.value)}
                      disabled={!canManageSpace}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="family-type">Space type</Label>
                    <Select value={familyType} onValueChange={setFamilyType} disabled={!canManageSpace}>
                      <SelectTrigger id="family-type" className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FAMILY_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">{activeType.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{activeType.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {memberCountOf(profile)} member{memberCountOf(profile) === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline">
                      {childCountOf(profile)} child{childCountOf(profile) === 1 ? "" : "ren"}
                    </Badge>
                    {activeFamilyId && (
                      <Badge variant="outline" className="text-[10px]">
                        ID: {activeFamilyId.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                </div>

                {!canManageSpace && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    You can view this family space, but only the owner or an admin can edit it.
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">Need to change people or access?</p>
                    <p className="text-sm font-semibold text-slate-500">
                      Use People & Access for roles, home presence, invitations, module permissions, and admin access.
                    </p>
                  </div>
                  <Button type="submit" disabled={!canManageSpace || saving} className="gap-2 rounded-xl">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save space"}
                  </Button>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-black text-red-950">Delete this family space</p>
                      <p className="text-sm font-semibold text-red-700">
                        Deletes the space and its household records. Custody groups tied to this family are included.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!canDeleteSpace || !profile?.id}
                      onClick={() => setConfirmDeleteFamily(profile)}
                      className="gap-2 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                  {!canDeleteSpace && (
                    <p className="mt-3 text-xs font-bold text-red-700">Only the owner can delete this space.</p>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(confirmDeleteFamily)} onOpenChange={(open) => !open && setConfirmDeleteFamily(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete {familyNameOf(confirmDeleteFamily)}?</DialogTitle>
            <DialogDescription>
              This removes the family space and related household data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteFamily(null)}
              disabled={deleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteFamily}
              disabled={deleting}
              className="gap-2 rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete space"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
