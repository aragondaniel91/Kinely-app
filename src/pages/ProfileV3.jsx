import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Baby,
  CalendarHeart,
  Check,
  Home,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Settings,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { resetCustodyDays } from "@/lib/resetCustodyData";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "families", label: "Families", icon: Users },
  { id: "custody", label: "Custody", icon: CalendarHeart },
  { id: "members", label: "Members", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

const privateModules = ["Family Calendar", "Tasks", "Meals", "Groceries", "Notes"];

function childLabel(child, index = 0) {
  if (!child) return `Child ${index + 1}`;
  if (typeof child === "string") return child;
  return child.name || child.displayName || child.childName || `Child ${index + 1}`;
}

function familyNameOf(family) {
  return family?.family_name || family?.familyName || "Family";
}

function getChildren(family) {
  if (Array.isArray(family?.children)) return family.children.map((child, index) => childLabel(child, index));
  if (family?.child_name) return [family.child_name];
  return [];
}

function getMemberEmails(family) {
  if (Array.isArray(family?.memberEmails)) return family.memberEmails;
  if (Array.isArray(family?.member_emails)) return family.member_emails;
  return [];
}

function getMembers(profile, user, myEmail) {
  const result = [];
  const seen = new Set();

  function add(member) {
    const key = (member.email || member.name || Math.random().toString()).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(member);
  }

  add({
    name: profile?.parent1_name || profile?.parent1Name || user?.displayName || "Me",
    email: profile?.owner_email || profile?.ownerEmail || myEmail || user?.email || "",
    role: profile?.parent1_role || profile?.parent1Role || "parent",
    admin: true,
  });

  if (profile?.parent2_name || profile?.parent2Name || profile?.parent2_email || profile?.parent2Email) {
    add({
      name: profile?.parent2_name || profile?.parent2Name || "Co-parent / caregiver",
      email: profile?.parent2_email || profile?.parent2Email || "",
      role: profile?.parent2_role || profile?.parent2Role || "parent",
      admin: false,
    });
  }

  (profile?.members || []).forEach((member) => {
    add({
      name: member.name || member.displayName || member.email || "Member",
      email: member.email || "",
      role: member.role || "member",
      admin: member.isAdmin === true || member.is_admin === true,
    });
  });

  return result;
}

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
        active ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
    </button>
  );
}

function FamilyCard({ family, active, onSelect }) {
  const children = getChildren(family);
  const memberCount = getMemberEmails(family).length || (Array.isArray(family?.members) ? family.members.length : 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-3xl border p-4 text-left transition ${
        active
          ? "border-indigo-300 bg-indigo-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-950">{familyNameOf(family)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {memberCount || 1} member{memberCount === 1 ? "" : "s"} · {children.length} child{children.length === 1 ? "" : "ren"}
          </p>
        </div>
        {active && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {children.length > 0 ? (
          children.slice(0, 4).map((child) => (
            <span key={child} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              👶 {child}
            </span>
          ))
        ) : (
          <span className="text-xs font-bold text-slate-400">No children added</span>
        )}
      </div>
    </button>
  );
}

function CustodyGroupCard({ group, onEdit, onReset, onDelete }) {
  const children = getChildren(group);
  const parents = Array.isArray(group.coParents) ? group.coParents : [];

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Baby className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-950">{group.name || "Custody Group"}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Child: {children.join(", ") || "Not selected"}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            Co-parents: {parents.map((parent) => parent.name || parent.email).filter(Boolean).join(" & ") || "Pending"}
          </p>
          <Badge variant="outline" className="mt-2 border-blue-200 bg-blue-50 text-blue-700">
            Shared custody space
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button type="button" variant="outline" onClick={() => onEdit(group)} className="gap-1 text-xs">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button type="button" variant="outline" onClick={() => onReset(group)} className="gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-800">
          <RefreshCcw className="h-3.5 w-3.5" /> Reset
        </Button>
        <Button type="button" variant="outline" onClick={() => onDelete(group)} className="gap-1 border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100 hover:text-red-800">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}

export default function ProfileV3() {
  const { logout } = useAuth();
  const {
    user,
    profile,
    familyId,
    isOwner,
    isAdmin,
    myEmail,
    allProfiles,
    activeProfileId,
    setActiveProfileId,
    createFamily,
    updateActiveFamily,
    refreshFamilies,
  } = useFamily();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const [familyName, setFamilyName] = useState("");
  const [children, setChildren] = useState([]);
  const [newChild, setNewChild] = useState("");
  const [parent1Name, setParent1Name] = useState("");
  const [parent1Role, setParent1Role] = useState("dad");
  const [parent2Name, setParent2Name] = useState("");
  const [parent2Email, setParent2Email] = useState("");
  const [parent2Role, setParent2Role] = useState("mom");

  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyAdultName, setNewFamilyAdultName] = useState("");
  const [newFamilyAdultEmail, setNewFamilyAdultEmail] = useState("");
  const [newFamilyChildren, setNewFamilyChildren] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");

  const [custodyGroups, setCustodyGroups] = useState([]);
  const [loadingCustody, setLoadingCustody] = useState(false);
  const [showCreateCustody, setShowCreateCustody] = useState(false);
  const [creatingCustody, setCreatingCustody] = useState(false);
  const [custodyChild, setCustodyChild] = useState("");
  const [custodyName, setCustodyName] = useState("");
  const [custodyCoparentName, setCustodyCoparentName] = useState("");
  const [custodyCoparentEmail, setCustodyCoparentEmail] = useState("");

  const families = allProfiles || [];
  const members = useMemo(() => getMembers(profile, user, myEmail), [profile, user, myEmail]);
  const canEdit = isAdmin === true;

  useEffect(() => {
    if (!profile) return;
    setFamilyName(profile.family_name || profile.familyName || "");
    setChildren(getChildren(profile));
    setParent1Name(profile.parent1_name || profile.parent1Name || user?.displayName || "");
    setParent1Role(profile.parent1_role || profile.parent1Role || "dad");
    setParent2Name(profile.parent2_name || profile.parent2Name || "");
    setParent2Email(profile.parent2_email || profile.parent2Email || "");
    setParent2Role(profile.parent2_role || profile.parent2Role || "mom");
    setInviteEmail(profile.parent2_email || profile.parent2Email || "");
  }, [profile, user]);

  useEffect(() => {
    if (!custodyChild && children.length > 0) setCustodyChild(children[0]);
  }, [children, custodyChild]);

  async function reloadCustodyGroups() {
    if (!myEmail) return;
    setLoadingCustody(true);
    try {
      const custodyQuery = query(collection(db, "custodyGroups"), where("memberEmails", "array-contains", myEmail));
      const snap = await getDocs(custodyQuery);
      setCustodyGroups(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    } catch (error) {
      console.error("Error loading custody groups:", error);
      setCustodyGroups([]);
    } finally {
      setLoadingCustody(false);
    }
  }

  useEffect(() => {
    reloadCustodyGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmail, familyId]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleAddChild = () => {
    const value = newChild.trim();
    if (!value) return;
    setChildren((current) => [...current, value]);
    setNewChild("");
  };

  const handleRemoveChild = (childToRemove) => {
    if (!window.confirm(`Remove ${childToRemove} from this family space?`)) return;
    setChildren((current) => current.filter((child) => child !== childToRemove));
  };

  const handleSaveFamily = async () => {
    if (!familyId) return alert("No active family found.");
    if (!isAdmin) return alert("Only a family admin can edit this family.");

    setSaving(true);
    setSavedMessage("");

    try {
      const cleanChildren = children.map((child) => child.trim()).filter(Boolean);
      await updateActiveFamily({
        familyName: familyName.trim() || "My Family",
        family_name: familyName.trim() || "My Family",
        children: cleanChildren,
        parent1Name: parent1Name.trim(),
        parent1_name: parent1Name.trim(),
        parent1Role,
        parent1_role: parent1Role,
        parent2Name: parent2Name.trim(),
        parent2_name: parent2Name.trim(),
        parent2Email: parent2Email.trim().toLowerCase(),
        parent2_email: parent2Email.trim().toLowerCase(),
        parent2Role,
        parent2_role: parent2Role,
      });
      await refreshFamilies?.();
      setSavedMessage("Family changes saved.");
    } catch (error) {
      console.error("Error saving family:", error);
      alert(`Error saving family: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return alert("Please enter a family name.");

    setCreatingFamily(true);
    setSavedMessage("");

    try {
      const cleanChildren = newFamilyChildren.split(",").map((child) => child.trim()).filter(Boolean);
      const newFamilyId = await createFamily?.({
        familyName: newFamilyName,
        parent2Name: newFamilyAdultName,
        parent2Email: newFamilyAdultEmail,
        children: cleanChildren,
      });

      await refreshFamilies?.();
      if (newFamilyId) setActiveProfileId?.(newFamilyId);
      setShowCreateFamily(false);
      setNewFamilyName("");
      setNewFamilyAdultName("");
      setNewFamilyAdultEmail("");
      setNewFamilyChildren("");
      setSavedMessage("New family space created and selected.");
    } catch (error) {
      console.error("Error creating family:", error);
      alert(`Error creating family: ${error.message}`);
    } finally {
      setCreatingFamily(false);
    }
  };

  const handleSaveInviteEmail = async () => {
    if (!familyId || !isAdmin || !inviteEmail.trim()) return;
    const email = inviteEmail.trim().toLowerCase();
    setSaving(true);
    setSavedMessage("");

    try {
      const existingMembers = Array.isArray(profile?.members) ? profile.members : [];
      const existingEmails = Array.from(new Set([...getMemberEmails(profile), email, myEmail].filter(Boolean)));
      const exists = existingMembers.some((member) => member.email?.toLowerCase() === email);
      const updatedMembers = exists
        ? existingMembers
        : [
            ...existingMembers,
            {
              email,
              name: parent2Name || "",
              role: "member",
              isAdmin: false,
              permissions: {
                calendar: { read: true, write: true },
                tasks: { read: true, write: true },
                meals: { read: true, write: true },
                groceries: { read: true, write: true },
              },
            },
          ];

      await updateActiveFamily({
        parent2Email: email,
        parent2_email: email,
        members: updatedMembers,
        memberEmails: existingEmails,
        member_emails: existingEmails,
      });
      await refreshFamilies?.();
      setParent2Email(email);
      setSavedMessage("Email added. The other person must register using that same email.");
    } catch (error) {
      console.error("Error saving invite email:", error);
      alert(`Error saving invite email: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustodyGroup = async () => {
    if (!custodyChild.trim()) return alert("Please select a child.");
    if (!custodyCoparentEmail.trim()) return alert("Please enter the co-parent email.");

    setCreatingCustody(true);
    setSavedMessage("");

    try {
      const coparentEmail = custodyCoparentEmail.trim().toLowerCase();
      const groupName = custodyName.trim() || `${custodyChild.trim()} Custody`;
      const parentName = parent1Name || user?.displayName || "Parent 1";
      const coparentName = custodyCoparentName.trim() || parent2Name || "Co-parent";

      await addDoc(collection(db, "custodyGroups"), {
        name: groupName,
        type: "custody",
        status: "active",
        children: [custodyChild.trim()],
        childNames: [custodyChild.trim()],
        linkedFamilyIds: [familyId].filter(Boolean),
        createdBy: user?.uid || null,
        createdByEmail: myEmail || "",
        ownerId: user?.uid || null,
        ownerEmail: myEmail || "",
        memberEmails: [myEmail, coparentEmail].filter(Boolean),
        coParents: [
          {
            uid: user?.uid || null,
            email: myEmail || "",
            name: parentName,
            role: parent1Role || "parent",
            permissions: { custodyCalendar: { read: true, write: true } },
          },
          {
            uid: null,
            email: coparentEmail,
            name: coparentName,
            role: parent1Role === "dad" ? "mom" : "dad",
            permissions: { custodyCalendar: { read: true, write: true } },
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await reloadCustodyGroups();
      setCustodyName("");
      setCustodyCoparentName("");
      setCustodyCoparentEmail("");
      setShowCreateCustody(false);
      setSavedMessage("Custody group created.");
    } catch (error) {
      console.error("Error creating custody group:", error);
      alert(`Error creating custody group: ${error.message}`);
    } finally {
      setCreatingCustody(false);
    }
  };

  const handleEditCustodyGroup = async (group) => {
    if (!isAdmin) return alert("Only an admin can edit custody groups.");

    const currentChildren = getChildren(group);
    const currentParents = Array.isArray(group.coParents) ? group.coParents : [];
    const newName = window.prompt("Custody group name", group.name || "Custody Group");
    if (newName === null) return;
    const newChildName = window.prompt("Child name", currentChildren[0] || "");
    if (newChildName === null) return;
    const coparent = currentParents[1] || {};
    const newCoparentName = window.prompt("Co-parent name", coparent.name || "");
    if (newCoparentName === null) return;
    const newCoparentEmail = window.prompt("Co-parent email", coparent.email || "");
    if (newCoparentEmail === null) return;

    const updatedParents = [...currentParents];
    if (updatedParents.length === 0) {
      updatedParents.push({
        uid: user?.uid || null,
        email: myEmail || "",
        name: parent1Name || user?.displayName || "Parent",
        role: parent1Role || "parent",
        permissions: { custodyCalendar: { read: true, write: true } },
      });
    }
    updatedParents[1] = {
      ...(updatedParents[1] || {}),
      uid: updatedParents[1]?.uid || null,
      name: newCoparentName.trim(),
      email: newCoparentEmail.trim().toLowerCase(),
      role: updatedParents[1]?.role || (parent1Role === "dad" ? "mom" : "dad"),
      permissions: updatedParents[1]?.permissions || { custodyCalendar: { read: true, write: true } },
    };

    const memberEmails = Array.from(new Set([myEmail, ...updatedParents.map((parent) => parent.email)].filter(Boolean).map((email) => email.toLowerCase())));

    try {
      await updateDoc(doc(db, "custodyGroups", group.id), {
        name: newName.trim() || group.name || "Custody Group",
        children: [newChildName.trim()].filter(Boolean),
        childNames: [newChildName.trim()].filter(Boolean),
        coParents: updatedParents,
        memberEmails,
        updatedAt: serverTimestamp(),
      });
      await reloadCustodyGroups();
      setSavedMessage("Custody group updated.");
    } catch (error) {
      console.error("Error updating custody group:", error);
      alert(`Error updating custody group: ${error.message}`);
    }
  };

  const handleResetCustodyGroup = async (group) => {
    if (!isAdmin) return alert("Only an admin can reset custody data.");
    const confirmed = window.confirm(
      `Reset custody schedule data for ${group.name || "this custody group"}? This deletes custody days for this group, but keeps the group itself.`
    );
    if (!confirmed) return;

    try {
      const result = await resetCustodyDays({
        familyId,
        userId: user?.uid,
        custodyGroupId: group.id,
      });
      await reloadCustodyGroups();
      setSavedMessage(`Custody data reset. Deleted ${result.deleted} day(s).`);
    } catch (error) {
      console.error("Error resetting custody group:", error);
      alert(`Error resetting custody group: ${error.message}`);
    }
  };

  const handleDeleteCustodyGroup = async (group) => {
    if (!isAdmin) return alert("Only an admin can delete custody groups.");
    const confirmed = window.confirm(
      `Delete ${group.name || "this custody group"}? This will remove the shared custody group. You can reset its calendar data first if needed.`
    );
    if (!confirmed) return;

    const resetFirst = window.confirm("Also delete custody schedule days linked to this group?");

    try {
      if (resetFirst) {
        await resetCustodyDays({ familyId, userId: user?.uid, custodyGroupId: group.id });
      }
      await deleteDoc(doc(db, "custodyGroups", group.id));
      await reloadCustodyGroups();
      setSavedMessage("Custody group deleted.");
    } catch (error) {
      console.error("Error deleting custody group:", error);
      alert(`Error deleting custody group: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <Home className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Family Management</h1>
              <p className="text-sm font-semibold text-slate-500">Private family spaces and shared custody groups.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {isOwner && <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Owner</Badge>}
                {isAdmin && <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>}
                {familyId && <Badge variant="outline" className="text-[10px]">Family ID: {familyId.slice(0, 8)}...</Badge>}
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={handleLogout} className="gap-2 border-red-200 text-red-500 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
        </div>

        {!canEdit && (
          <Card className="mb-5 border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">You have read access. Only a family admin can edit this family space.</p>
          </Card>
        )}
        {savedMessage && (
          <Card className="mb-5 border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">{savedMessage}</p>
          </Card>
        )}

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <p className="text-sm font-black uppercase tracking-wider text-slate-500">Active Family Space</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">{familyName || "My Family"}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                This controls private Family Calendar, Tasks, Meals, Groceries and Notes.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {privateModules.map((module) => (
                  <span key={module} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
                    {module}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-sm font-black uppercase tracking-wider text-slate-500">Quick Stats</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{families.length}</p><p className="text-xs font-bold text-slate-400">Family spaces</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{custodyGroups.length}</p><p className="text-xs font-bold text-slate-400">Custody groups</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{children.length}</p><p className="text-xs font-bold text-slate-400">Children in active family</p></div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "families" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500"><Users className="h-4 w-4" /> My Families</h2>
              <div className="space-y-3">
                {families.map((family) => (
                  <FamilyCard key={family.id} family={family} active={family.id === activeProfileId} onSelect={() => setActiveProfileId?.(family.id)} />
                ))}
                {families.length === 0 && <p className="text-sm font-semibold text-slate-400">No family spaces found.</p>}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-slate-500">Active Family Details</p>
                  <p className="text-sm font-semibold text-slate-400">Edit the private household space.</p>
                </div>
                <Button variant="outline" onClick={() => setShowCreateFamily((current) => !current)} className="gap-2">
                  {showCreateFamily ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showCreateFamily ? "Close" : "New Family"}
                </Button>
              </div>

              {showCreateFamily ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><Label>Family name</Label><Input value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} placeholder="Daniel & Mary Family" className="mt-1" /></div>
                  <div><Label>Second adult name</Label><Input value={newFamilyAdultName} onChange={(e) => setNewFamilyAdultName(e.target.value)} placeholder="Mary" className="mt-1" /></div>
                  <div><Label>Second adult email</Label><Input type="email" value={newFamilyAdultEmail} onChange={(e) => setNewFamilyAdultEmail(e.target.value)} placeholder="email@example.com" className="mt-1" /></div>
                  <div><Label>Children</Label><Input value={newFamilyChildren} onChange={(e) => setNewFamilyChildren(e.target.value)} placeholder="Joaquin, Mady" className="mt-1" /></div>
                  <div className="md:col-span-2"><Button onClick={handleCreateFamily} disabled={creatingFamily || !newFamilyName.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700">{creatingFamily ? "Creating..." : "Create and switch"}</Button></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><Label>Family name</Label><Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} disabled={!canEdit} className="mt-1" /></div>
                  <div><Label>Parent 1 name</Label><Input value={parent1Name} onChange={(e) => setParent1Name(e.target.value)} disabled={!canEdit} className="mt-1" /></div>
                  <div><Label>Parent 1 role</Label><select value={parent1Role} onChange={(e) => setParent1Role(e.target.value)} disabled={!canEdit} className="mt-1 w-full rounded-xl border bg-white px-3 py-2"><option value="dad">Dad</option><option value="mom">Mom</option><option value="caregiver">Caregiver</option></select></div>
                  <div><Label>Parent 2 name</Label><Input value={parent2Name} onChange={(e) => setParent2Name(e.target.value)} disabled={!canEdit} className="mt-1" /></div>
                  <div><Label>Parent 2 email</Label><Input value={parent2Email} onChange={(e) => setParent2Email(e.target.value)} disabled={!canEdit} className="mt-1" /></div>
                  <div><Label>Parent 2 role</Label><select value={parent2Role} onChange={(e) => setParent2Role(e.target.value)} disabled={!canEdit} className="mt-1 w-full rounded-xl border bg-white px-3 py-2"><option value="mom">Mom</option><option value="dad">Dad</option><option value="caregiver">Caregiver</option></select></div>

                  <div className="md:col-span-2">
                    <Label>Children</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {children.map((child) => (
                        <button key={child} type="button" onClick={() => canEdit && handleRemoveChild(child)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                          {child} {canEdit ? "×" : ""}
                        </button>
                      ))}
                    </div>
                    {canEdit && (
                      <div className="mt-3 flex gap-2">
                        <Input value={newChild} onChange={(e) => setNewChild(e.target.value)} placeholder="Add child" />
                        <Button type="button" variant="outline" onClick={handleAddChild}>Add</Button>
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div className="md:col-span-2">
                      <Button onClick={handleSaveFamily} disabled={saving} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save family changes"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "custody" && (
          <div className="space-y-5">
            <Card className="border-blue-100 bg-blue-50 p-5">
              <h2 className="text-xl font-black text-slate-950">Custody Management</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Custody groups are shared co-parent spaces. They stay separate from private family data.
              </p>
            </Card>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500"><CalendarHeart className="h-4 w-4" /> Custody Groups</h2>
                  {loadingCustody && <span className="text-xs font-bold text-slate-400">Loading...</span>}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {!loadingCustody && custodyGroups.map((group) => (
                    <CustodyGroupCard
                      key={group.id}
                      group={group}
                      onEdit={handleEditCustodyGroup}
                      onReset={handleResetCustodyGroup}
                      onDelete={handleDeleteCustodyGroup}
                    />
                  ))}
                  {!loadingCustody && custodyGroups.length === 0 && <p className="text-sm font-semibold text-slate-400">No custody groups yet.</p>}
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-slate-500">Create Custody Group</p>
                    <p className="text-xs font-semibold text-slate-400">Example: Joaquin Custody shared with Amanda.</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowCreateCustody((current) => !current)}>
                    {showCreateCustody ? "Close" : "New"}
                  </Button>
                </div>

                {showCreateCustody ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Child</Label>
                      <select value={custodyChild} onChange={(e) => setCustodyChild(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                        {children.map((child) => <option key={child} value={child}>{child}</option>)}
                      </select>
                    </div>
                    <div><Label>Custody group name</Label><Input value={custodyName} onChange={(e) => setCustodyName(e.target.value)} placeholder={custodyChild ? `${custodyChild} Custody` : "Joaquin Custody"} className="mt-1" /></div>
                    <div><Label>Co-parent name</Label><Input value={custodyCoparentName} onChange={(e) => setCustodyCoparentName(e.target.value)} placeholder="Amanda" className="mt-1" /></div>
                    <div><Label>Co-parent email</Label><Input type="email" value={custodyCoparentEmail} onChange={(e) => setCustodyCoparentEmail(e.target.value)} placeholder="coparent@example.com" className="mt-1" /></div>
                    <Button onClick={handleCreateCustodyGroup} disabled={creatingCustody || !custodyChild || !custodyCoparentEmail.trim()} className="w-full bg-blue-600 hover:bg-blue-700">{creatingCustody ? "Creating..." : "Create custody group"}</Button>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    Create a shared custody space without exposing private household data.
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500"><Shield className="h-4 w-4" /> Members & Permissions</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {members.map((member, index) => (
                  <div key={`${member.email}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-black text-slate-900">{member.name || member.email || "Member"}</p><p className="text-xs font-semibold text-slate-400">{member.email || "No email"}</p></div>
                      <Badge variant={member.admin ? "secondary" : "outline"}>{member.admin ? "Admin" : member.role}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {privateModules.slice(0, 4).map((module) => <span key={module} className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{module}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500"><Mail className="h-4 w-4" /> Invite / Connect</h2>
              <div className="space-y-3">
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@example.com" disabled={!canEdit} />
                <Button onClick={handleSaveInviteEmail} disabled={!canEdit || saving || !inviteEmail.trim()} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Mail className="h-4 w-4" /> Save invite email
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <Card className="p-5">
            <h2 className="text-xl font-black text-slate-950">Settings</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              More settings will live here: default location, timezone, notification preferences, and permissions.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
