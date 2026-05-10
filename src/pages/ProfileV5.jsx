import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Baby,
  CalendarHeart,
  Check,
  Home,
  LogOut,
  Mail,
  Palette,
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
import {
  PERSON_COLOR_OPTIONS,
  childName,
  colorClasses,
  getColorMeta,
  normalizeChildren,
} from "@/lib/personColorUtils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ProfileCustodySection from "@/components/profile/ProfileCustodySection";

const ACTIVE_TAB_KEY = "familyWall.profile.activeTab";

const tabs = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "families", label: "Families", icon: Users },
  { id: "custody", label: "Custody", icon: CalendarHeart },
  { id: "members", label: "Members", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

const roleOptions = [
  { value: "parent", label: "Parent" },
  { value: "dad", label: "Dad" },
  { value: "mom", label: "Mom" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "babysitter", label: "Babysitter" },
  { value: "caregiver", label: "Caregiver" },
  { value: "family", label: "Family member" },
];

const defaultPermissions = {
  calendar: { read: true, write: true },
  tasks: { read: true, write: true },
  meals: { read: true, write: true },
  groceries: { read: true, write: true },
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function familyNameOf(family) {
  return family?.family_name || family?.familyName || "Family";
}

function getFamilyMemberEmails(profile) {
  if (Array.isArray(profile?.memberEmails)) return profile.memberEmails;
  if (Array.isArray(profile?.member_emails)) return profile.member_emails;
  return [];
}

function getMembers(profile, user, myEmail) {
  const seen = new Set();
  const result = [];

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
    role: profile?.parent1_role || profile?.parent1Role || "parent",
    color: profile?.parent1_color || profile?.parent1Color || "blue",
    admin: true,
    locked: true,
  });

  if (profile?.parent2_name || profile?.parent2Name || profile?.parent2_email || profile?.parent2Email) {
    add({
      source: "parent2",
      name: profile?.parent2_name || profile?.parent2Name || "Co-parent / caregiver",
      email: profile?.parent2_email || profile?.parent2Email || "",
      role: profile?.parent2_role || profile?.parent2Role || "parent",
      color: profile?.parent2_color || profile?.parent2Color || "orange",
      admin: false,
      locked: false,
    });
  }

  (profile?.members || []).forEach((member, index) => {
    add({
      source: "member",
      index,
      name: member.name || member.displayName || member.email || "Member",
      email: member.email || "",
      role: member.role || "member",
      color: member.color || member.familyColor || member.family_color || "teal",
      admin: member.isAdmin === true || member.is_admin === true,
      permissions: member.permissions || defaultPermissions,
      locked: false,
    });
  });

  return result;
}

function Modal({ title, description, children, footer, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-slate-100 p-5">{footer}</div>}
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange, label = "Color" }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {PERSON_COLOR_OPTIONS.map((color) => {
          const active = value === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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
  const children = normalizeChildren(family?.children || []);
  const memberCount = getFamilyMemberEmails(family).length || (Array.isArray(family?.members) ? family.members.length + 1 : 1);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-3xl border p-4 text-left transition ${
        active ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-950">{familyNameOf(family)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {memberCount} member{memberCount === 1 ? "" : "s"} · {children.length} child{children.length === 1 ? "" : "ren"}
          </p>
        </div>
        {active && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"><Check className="h-4 w-4" /></span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {children.length > 0 ? children.slice(0, 4).map((child) => {
          const color = getColorMeta(child.color);
          return <span key={child.name} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${color.bg} ${color.text} ${color.border}`}>👶 {child.name}</span>;
        }) : <span className="text-xs font-bold text-slate-400">No children added</span>}
      </div>
    </button>
  );
}

function MemberCard({ member, onEdit, onDelete }) {
  const color = getColorMeta(member.color);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${color.dot}`} />
            <p className="truncate font-black text-slate-950">{member.name || member.email || "Member"}</p>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">{member.email || "No email"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={member.admin ? "secondary" : "outline"}>{member.admin ? "Admin" : member.role}</Badge>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${color.bg} ${color.text} ${color.border}`}>Family color: {color.label}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={() => onEdit(member)} className="flex-1 gap-1 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        <Button type="button" variant="outline" disabled={member.locked} onClick={() => onDelete(member)} className="flex-1 gap-1 border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100 hover:text-red-800 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
      </div>
    </div>
  );
}

function CustodyGroupCard({ group, onEdit, onReset, onDelete }) {
  const children = normalizeChildren(group?.children || []);
  const parents = Array.isArray(group.coParents) ? group.coParents : [];
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Baby className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-950">{group.name || "Custody Group"}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Child: {children.map((child) => child.name).join(", ") || "Not selected"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parents.map((parent, index) => {
              const color = getColorMeta(parent.color || parent.custodyColor || (index === 0 ? "blue" : "orange"));
              return <span key={`${parent.email || parent.name}-${index}`} className={`rounded-full border px-2 py-1 text-[10px] font-black ${color.bg} ${color.text} ${color.border}`}>{parent.name || parent.email || "Parent"}</span>;
            })}
            {parents.length === 0 && <span className="text-xs font-semibold text-slate-400">Co-parents pending</span>}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button type="button" variant="outline" onClick={() => onEdit(group)} className="gap-1 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        <Button type="button" variant="outline" onClick={() => onReset(group)} className="gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-800"><RefreshCcw className="h-3.5 w-3.5" /> Reset</Button>
        <Button type="button" variant="outline" onClick={() => onDelete(group)} className="gap-1 border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100 hover:text-red-800"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
      </div>
    </div>
  );
}

export default function ProfileV5() {
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
  const [activeTab, setActiveTab] = useState(() => window.localStorage.getItem(ACTIVE_TAB_KEY) || "overview");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [familyName, setFamilyName] = useState("");
  const [children, setChildren] = useState([]);
  const [newChild, setNewChild] = useState("");
  const [newChildColor, setNewChildColor] = useState("green");
  const [parent1Name, setParent1Name] = useState("");
  const [parent1Role, setParent1Role] = useState("dad");
  const [parent1Color, setParent1Color] = useState("blue");
  const [parent2Name, setParent2Name] = useState("");
  const [parent2Email, setParent2Email] = useState("");
  const [parent2Role, setParent2Role] = useState("mom");
  const [parent2Color, setParent2Color] = useState("orange");

  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyAdultName, setNewFamilyAdultName] = useState("");
  const [newFamilyAdultEmail, setNewFamilyAdultEmail] = useState("");
  const [newFamilyChildren, setNewFamilyChildren] = useState("");

  const [custodyGroups, setCustodyGroups] = useState([]);
  const [loadingCustody, setLoadingCustody] = useState(false);
  const [showCreateCustody, setShowCreateCustody] = useState(false);
  const [creatingCustody, setCreatingCustody] = useState(false);
  const [custodyChild, setCustodyChild] = useState("");
  const [custodyName, setCustodyName] = useState("");
  const [custodyCoparentName, setCustodyCoparentName] = useState("");
  const [custodyCoparentEmail, setCustodyCoparentEmail] = useState("");
  const [custodyParentColor, setCustodyParentColor] = useState("blue");
  const [custodyCoparentColor, setCustodyCoparentColor] = useState("orange");

  const [memberEditor, setMemberEditor] = useState(null);
  const [custodyEditor, setCustodyEditor] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const families = allProfiles || [];
  const members = useMemo(() => getMembers(profile, user, myEmail), [profile, user, myEmail]);
  const canEdit = isAdmin === true;

  function selectTab(tabId) {
    setActiveTab(tabId);
    window.localStorage.setItem(ACTIVE_TAB_KEY, tabId);
  }

  function clearMessages() {
    setSavedMessage("");
    setErrorMessage("");
  }

  function showError(error, fallback = "Something went wrong.") {
    console.error(fallback, error);
    setErrorMessage(error?.message || fallback);
  }

  useEffect(() => {
    if (!profile) return;
    setFamilyName(profile.family_name || profile.familyName || "");
    setChildren(normalizeChildren(profile.children || []));
    setParent1Name(profile.parent1_name || profile.parent1Name || user?.displayName || "");
    setParent1Role(profile.parent1_role || profile.parent1Role || "dad");
    setParent1Color(profile.parent1_color || profile.parent1Color || "blue");
    setParent2Name(profile.parent2_name || profile.parent2Name || "");
    setParent2Email(profile.parent2_email || profile.parent2Email || "");
    setParent2Role(profile.parent2_role || profile.parent2Role || "mom");
    setParent2Color(profile.parent2_color || profile.parent2Color || "orange");
  }, [profile, user]);

  useEffect(() => {
    if (!custodyChild && children.length > 0) setCustodyChild(children[0].name);
  }, [children, custodyChild]);

  async function reloadCustodyGroups() {
    if (!myEmail) return;
    setLoadingCustody(true);
    try {
      const custodyQuery = query(collection(db, "custodyGroups"), where("memberEmails", "array-contains", myEmail));
      const snap = await getDocs(custodyQuery);
      setCustodyGroups(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    } catch (error) {
      showError(error, "Error loading custody groups.");
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
    setChildren((current) => [...current, { id: `child-${Date.now()}`, name: value, color: newChildColor }]);
    setNewChild("");
    setNewChildColor("green");
  };

  const handleUpdateChild = (id, updates) => {
    setChildren((current) => current.map((child) => (child.id === id ? { ...child, ...updates } : child)));
  };

  const handleRemoveChild = (childToRemove) => {
    setConfirmAction({
      title: "Remove child?",
      description: `Remove ${childToRemove.name} from this family space?`,
      confirmText: "Remove",
      tone: "danger",
      onConfirm: async () => {
        setChildren((current) => current.filter((child) => child.id !== childToRemove.id));
        setConfirmAction(null);
      },
    });
  };

  const handleSaveFamily = async () => {
    if (!familyId) return setErrorMessage("No active family found.");
    if (!isAdmin) return setErrorMessage("Only a family admin can edit this family.");
    clearMessages();
    setSaving(true);
    selectTab("families");
    try {
      const cleanChildren = children.map((child) => ({
        id: child.id || `child-${child.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: child.name.trim(),
        color: child.color || "green",
      })).filter((child) => child.name);
      await updateActiveFamily({
        familyName: familyName.trim() || "My Family",
        family_name: familyName.trim() || "My Family",
        children: cleanChildren,
        parent1Name: parent1Name.trim(),
        parent1_name: parent1Name.trim(),
        parent1Role,
        parent1_role: parent1Role,
        parent1Color,
        parent1_color: parent1Color,
        parent2Name: parent2Name.trim(),
        parent2_name: parent2Name.trim(),
        parent2Email: normalizeEmail(parent2Email),
        parent2_email: normalizeEmail(parent2Email),
        parent2Role,
        parent2_role: parent2Role,
        parent2Color,
        parent2_color: parent2Color,
      });
      await refreshFamilies?.();
      setSavedMessage("Family changes saved.");
    } catch (error) {
      showError(error, "Error saving family.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return setErrorMessage("Please enter a family name.");
    clearMessages();
    setCreatingFamily(true);
    selectTab("families");
    try {
      const cleanChildren = newFamilyChildren.split(",").map((name, index) => ({
        id: `child-${Date.now()}-${index}`,
        name: name.trim(),
        color: PERSON_COLOR_OPTIONS[(index + 1) % PERSON_COLOR_OPTIONS.length].id,
      })).filter((child) => child.name);
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
      showError(error, "Error creating family.");
    } finally {
      setCreatingFamily(false);
    }
  };

  const saveMemberEditor = async () => {
    if (!memberEditor || !familyId || !isAdmin) return;
    const email = normalizeEmail(memberEditor.email);
    const name = memberEditor.name.trim();
    if (!name && !email) return setErrorMessage("Please enter a name or email for this member.");
    clearMessages();
    setSaving(true);
    selectTab("members");
    try {
      const existingMembers = Array.isArray(profile?.members) ? profile.members : [];
      let updatedMembers = [...existingMembers];
      let updates = {};
      if (memberEditor.source === "owner") {
        updates = { parent1Name: name, parent1_name: name, parent1Role: memberEditor.role, parent1_role: memberEditor.role, parent1Color: memberEditor.color, parent1_color: memberEditor.color };
      } else if (memberEditor.source === "parent2") {
        updates = { parent2Name: name, parent2_name: name, parent2Email: email, parent2_email: email, parent2Role: memberEditor.role, parent2_role: memberEditor.role, parent2Color: memberEditor.color, parent2_color: memberEditor.color };
      } else if (memberEditor.mode === "add") {
        updatedMembers.push({ name, email, role: memberEditor.role, color: memberEditor.color, familyColor: memberEditor.color, isAdmin: memberEditor.admin === true, permissions: defaultPermissions });
        updates = { members: updatedMembers };
      } else {
        updatedMembers = updatedMembers.map((member) => normalizeEmail(member.email) === normalizeEmail(memberEditor.originalEmail) ? { ...member, name, email, role: memberEditor.role, color: memberEditor.color, familyColor: memberEditor.color, isAdmin: memberEditor.admin === true } : member);
        updates = { members: updatedMembers };
      }
      const memberEmails = Array.from(new Set([myEmail, normalizeEmail(parent2Email), email, ...updatedMembers.map((member) => normalizeEmail(member.email))].filter(Boolean)));
      await updateActiveFamily({ ...updates, memberEmails, member_emails: memberEmails });
      await refreshFamilies?.();
      setMemberEditor(null);
      setSavedMessage("Member saved.");
    } catch (error) {
      showError(error, "Error saving member.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (member) => {
    if (!familyId || !isAdmin || member.locked) return;
    clearMessages();
    setSaving(true);
    selectTab("members");
    try {
      const email = normalizeEmail(member.email);
      const existingMembers = Array.isArray(profile?.members) ? profile.members : [];
      const updatedMembers = existingMembers.filter((item) => normalizeEmail(item.email) !== email);
      const memberEmails = getFamilyMemberEmails(profile).filter((item) => normalizeEmail(item) !== email);
      const updates = member.source === "parent2"
        ? { parent2Name: "", parent2_name: "", parent2Email: "", parent2_email: "", parent2Role: "parent", parent2_role: "parent", parent2Color: "orange", parent2_color: "orange", members: updatedMembers, memberEmails, member_emails: memberEmails }
        : { members: updatedMembers, memberEmails, member_emails: memberEmails };
      await updateActiveFamily(updates);
      await refreshFamilies?.();
      setSavedMessage("Member removed.");
    } catch (error) {
      showError(error, "Error deleting member.");
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const handleCreateCustodyGroup = async () => {
    if (!custodyChild.trim()) return setErrorMessage("Please select a child.");
    if (!custodyCoparentEmail.trim()) return setErrorMessage("Please enter the co-parent email.");
    clearMessages();
    setCreatingCustody(true);
    selectTab("custody");
    try {
      const coparentEmail = normalizeEmail(custodyCoparentEmail);
      const groupName = custodyName.trim() || `${custodyChild.trim()} Custody`;
      await addDoc(collection(db, "custodyGroups"), {
        name: groupName,
        type: "custody",
        status: "active",
        children: [{ name: custodyChild.trim(), color: "green" }],
        childNames: [custodyChild.trim()],
        linkedFamilyIds: [familyId].filter(Boolean),
        createdBy: user?.uid || null,
        createdByEmail: myEmail || "",
        ownerId: user?.uid || null,
        ownerEmail: myEmail || "",
        memberEmails: [myEmail, coparentEmail].filter(Boolean),
        coParents: [
          { uid: user?.uid || null, email: myEmail || "", name: parent1Name || user?.displayName || "Parent 1", role: parent1Role || "parent", color: custodyParentColor, custodyColor: custodyParentColor, permissions: { custodyCalendar: { read: true, write: true } } },
          { uid: null, email: coparentEmail, name: custodyCoparentName.trim() || parent2Name || "Co-parent", role: parent1Role === "dad" ? "mom" : "dad", color: custodyCoparentColor, custodyColor: custodyCoparentColor, permissions: { custodyCalendar: { read: true, write: true } } },
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
      showError(error, "Error creating custody group.");
    } finally {
      setCreatingCustody(false);
    }
  };

  const openCustodyEditor = (group) => {
    const currentChildren = normalizeChildren(group.children || []);
    const parents = Array.isArray(group.coParents) ? group.coParents : [];
    setCustodyEditor({
      id: group.id,
      name: group.name || "Custody Group",
      child: currentChildren[0]?.name || "",
      parentName: parents[0]?.name || parent1Name || user?.displayName || "Parent",
      parentEmail: parents[0]?.email || myEmail || "",
      parentRole: parents[0]?.role || parent1Role || "parent",
      parentColor: parents[0]?.color || parents[0]?.custodyColor || "blue",
      coparentName: parents[1]?.name || "",
      coparentEmail: parents[1]?.email || "",
      coparentRole: parents[1]?.role || (parent1Role === "dad" ? "mom" : "dad"),
      coparentColor: parents[1]?.color || parents[1]?.custodyColor || "orange",
    });
  };

  const saveCustodyEditor = async () => {
    if (!custodyEditor || !isAdmin) return;
    clearMessages();
    setSaving(true);
    selectTab("custody");
    try {
      const updatedParents = [
        { uid: user?.uid || null, email: normalizeEmail(custodyEditor.parentEmail) || myEmail || "", name: custodyEditor.parentName.trim() || "Parent", role: custodyEditor.parentRole || "parent", color: custodyEditor.parentColor, custodyColor: custodyEditor.parentColor, permissions: { custodyCalendar: { read: true, write: true } } },
        { uid: null, email: normalizeEmail(custodyEditor.coparentEmail), name: custodyEditor.coparentName.trim() || "Co-parent", role: custodyEditor.coparentRole || "parent", color: custodyEditor.coparentColor, custodyColor: custodyEditor.coparentColor, permissions: { custodyCalendar: { read: true, write: true } } },
      ];
      const memberEmails = Array.from(new Set(updatedParents.map((parent) => normalizeEmail(parent.email)).filter(Boolean)));
      await updateDoc(doc(db, "custodyGroups", custodyEditor.id), {
        name: custodyEditor.name.trim() || "Custody Group",
        children: [{ name: custodyEditor.child.trim(), color: "green" }].filter((child) => child.name),
        childNames: [custodyEditor.child.trim()].filter(Boolean),
        coParents: updatedParents,
        memberEmails,
        updatedAt: serverTimestamp(),
      });
      await reloadCustodyGroups();
      setCustodyEditor(null);
      setSavedMessage("Custody group updated.");
    } catch (error) {
      showError(error, "Error updating custody group.");
    } finally {
      setSaving(false);
    }
  };

  const resetCustodyGroup = async (group) => {
    clearMessages();
    setSaving(true);
    selectTab("custody");
    try {
      const result = await resetCustodyDays({ familyId, userId: user?.uid, custodyGroupId: group.id });
      await reloadCustodyGroups();
      setSavedMessage(`Custody data reset. Deleted ${result.deleted} day(s).`);
    } catch (error) {
      showError(error, "Error resetting custody group.");
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const deleteCustodyGroup = async (group, deleteDays = false) => {
    clearMessages();
    setSaving(true);
    selectTab("custody");
    try {
      if (deleteDays) await resetCustodyDays({ familyId, userId: user?.uid, custodyGroupId: group.id });
      await deleteDoc(doc(db, "custodyGroups", group.id));
      await reloadCustodyGroups();
      setSavedMessage("Custody group deleted.");
    } catch (error) {
      showError(error, "Error deleting custody group.");
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Home className="h-7 w-7" /></div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Family Management</h1>
              <p className="text-sm font-semibold text-slate-500">Private family spaces, children colors, members and shared custody groups.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {isOwner && <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Owner</Badge>}
                {isAdmin && <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>}
                {familyId && <Badge variant="outline" className="text-[10px]">Family ID: {familyId.slice(0, 8)}...</Badge>}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 border-red-200 text-red-500 hover:text-red-600"><LogOut className="h-4 w-4" /> Log out</Button>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => selectTab(tab.id)} />)}
        </div>

        {!canEdit && <Card className="mb-5 border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-800">You have read access. Only a family admin can edit this family space.</p></Card>}
        {savedMessage && <Card className="mb-5 border-green-200 bg-green-50 p-4"><p className="text-sm font-semibold text-green-800">{savedMessage}</p></Card>}
        {errorMessage && <Card className="mb-5 border-red-200 bg-red-50 p-4"><p className="text-sm font-semibold text-red-800">{errorMessage}</p></Card>}

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <p className="text-sm font-black uppercase tracking-wider text-slate-500">Active Family Space</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">{familyName || "My Family"}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">This controls private Family Calendar, Tasks, Meals, Groceries and Notes.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {children.map((child) => {
                  const color = getColorMeta(child.color);
                  return <span key={child.id} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${color.bg} ${color.text} ${color.border}`}>👶 {child.name}</span>;
                })}
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-black uppercase tracking-wider text-slate-500">Quick Stats</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{families.length}</p><p className="text-xs font-bold text-slate-400">Family spaces</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{custodyGroups.length}</p><p className="text-xs font-bold text-slate-400">Custody groups</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{members.length}</p><p className="text-xs font-bold text-slate-400">Family members</p></div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "families" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500"><Users className="h-4 w-4" /> My Families</h2>
              <div className="space-y-3">{families.map((family) => <FamilyCard key={family.id} family={family} active={family.id === activeProfileId} onSelect={() => setActiveProfileId?.(family.id)} />)}</div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><p className="text-sm font-black uppercase tracking-wider text-slate-500">Active Family Details</p><p className="text-sm font-semibold text-slate-400">Edit adults, children, and family-specific colors.</p></div>
                <Button variant="outline" onClick={() => setShowCreateFamily((current) => !current)} className="gap-2">{showCreateFamily ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showCreateFamily ? "Close" : "New Family"}</Button>
              </div>

              {showCreateFamily ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><Label>Family name</Label><Input value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} placeholder="Daniel & Mary Family" className="mt-1" /></div>
                  <div><Label>Second adult name</Label><Input value={newFamilyAdultName} onChange={(e) => setNewFamilyAdultName(e.target.value)} placeholder="Mary" className="mt-1" /></div>
                  <div><Label>Second adult email</Label><Input type="email" value={newFamilyAdultEmail} onChange={(e) => setNewFamilyAdultEmail(e.target.value)} placeholder="email@example.com" className="mt-1" /></div>
                  <div><Label>Children</Label><Input value={newFamilyChildren} onChange={(e) => setNewFamilyChildren(e.target.value)} placeholder="Joaquin, Mady" className="mt-1" /><p className="mt-1 text-xs font-semibold text-slate-400">Default colors are assigned automatically.</p></div>
                  <div className="md:col-span-2"><Button onClick={handleCreateFamily} disabled={creatingFamily || !newFamilyName.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700">{creatingFamily ? "Creating..." : "Create and switch"}</Button></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><Label>Family name</Label><Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} disabled={!canEdit} className="mt-1" /></div>
                  <div><Label>Parent 1 name</Label><Input value={parent1Name} onChange={(e) => setParent1Name(e.target.value)} disabled={!canEdit} className="mt-1" /></div>
                  <div><Label>Parent 1 role</Label><select value={parent1Role} onChange={(e) => setParent1Role(e.target.value)} disabled={!canEdit} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">{roleOptions.slice(0, 3).map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
                  <div><ColorPicker label="Parent 1 family color" value={parent1Color} onChange={setParent1Color} /></div>
                  <div><Label>Parent 2 name</Label><Input value={parent2Name} onChange={(e) => setParent2Name(e.target.value)} disabled={!canEdit} className="mt-1" /></div>
                  <div><Label>Parent 2 email</Label><Input value={parent2Email} onChange={(e) => setParent2Email(e.target.value)} disabled={!canEdit} className="mt-1" /></div>
                  <div><Label>Parent 2 role</Label><select value={parent2Role} onChange={(e) => setParent2Role(e.target.value)} disabled={!canEdit} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">{roleOptions.slice(0, 3).map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
                  <div><ColorPicker label="Parent 2 family color" value={parent2Color} onChange={setParent2Color} /></div>
                  <div className="md:col-span-2">
                    <Label>Children and colors</Label>
                    <div className="mt-3 space-y-3">
                      {children.map((child) => {
                        const classes = colorClasses(child.color);
                        return (
                          <div key={child.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_220px_auto] md:items-center">
                            <Input value={child.name} onChange={(e) => handleUpdateChild(child.id, { name: e.target.value })} disabled={!canEdit} />
                            <div className="flex flex-wrap gap-1.5">
                              {PERSON_COLOR_OPTIONS.map((color) => (
                                <button key={color.id} type="button" disabled={!canEdit} onClick={() => handleUpdateChild(child.id, { color: color.id })} className={`h-7 w-7 rounded-full border-2 ${color.dot} ${child.color === color.id ? "border-slate-900" : "border-white"}`} aria-label={color.label} />
                              ))}
                            </div>
                            <Button type="button" variant="outline" onClick={() => handleRemoveChild(child)} disabled={!canEdit} className={`gap-1 border-red-200 bg-red-50 text-red-700 ${classes.ring}`}><Trash2 className="h-4 w-4" /> Remove</Button>
                          </div>
                        );
                      })}
                    </div>
                    {canEdit && (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
                          <div><Label>New child</Label><Input value={newChild} onChange={(e) => setNewChild(e.target.value)} placeholder="Add child" className="mt-1" /></div>
                          <ColorPicker label="Child color" value={newChildColor} onChange={setNewChildColor} />
                          <Button type="button" variant="outline" onClick={handleAddChild}>Add</Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {canEdit && <div className="md:col-span-2"><Button onClick={handleSaveFamily} disabled={saving} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save family changes"}</Button></div>}
                </div>
              )}
            </Card>
          </div>
        )}

{activeTab === "custody" && (
  <ProfileCustodySection />
)}

        {activeTab === "members" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
            <Card className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500"><Shield className="h-4 w-4" /> Members & Permissions</h2><Button type="button" onClick={() => setMemberEditor({ mode: "add", source: "member", name: "", email: "", role: "caregiver", color: "teal", admin: false })} className="gap-2 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add member</Button></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{members.map((member, index) => <MemberCard key={`${member.source}-${member.email || member.name}-${index}`} member={member} onEdit={(item) => setMemberEditor({ ...item, mode: "edit", originalEmail: item.email })} onDelete={(item) => setConfirmAction({ title: "Delete member?", description: `Remove ${item.name || item.email || "this member"} from this family space?`, confirmText: "Delete member", tone: "danger", onConfirm: () => deleteMember(item) })} />)}</div></Card>
            <Card className="p-5"><h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500"><Palette className="h-4 w-4" /> Color rules</h2><div className="space-y-3 text-sm font-semibold text-slate-500"><p>Children, parents, and members have colors inside each private family space.</p><p>Custody colors are separate and belong to each custody group.</p><div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">Example: Daniel can be blue in Joaquin Custody but green in Daniel & Mary Family.</div></div></Card>
          </div>
        )}

        {activeTab === "settings" && <Card className="p-5"><h2 className="text-xl font-black text-slate-950">Settings</h2><p className="mt-2 text-sm font-semibold text-slate-500">More settings will live here: default location, timezone, notification preferences, and permissions.</p></Card>}
      </div>

      {memberEditor && <Modal title={memberEditor.mode === "add" ? "Add family member" : "Edit family member"} description="Add grandparents, babysitters, caregivers, or family members. This is for the private family space." onClose={() => setMemberEditor(null)} footer={<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setMemberEditor(null)}>Cancel</Button><Button type="button" onClick={saveMemberEditor} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? "Saving..." : "Save member"}</Button></div>}><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><Label>Name</Label><Input value={memberEditor.name} onChange={(e) => setMemberEditor((current) => ({ ...current, name: e.target.value }))} className="mt-1" /></div><div><Label>Email</Label><Input value={memberEditor.email} onChange={(e) => setMemberEditor((current) => ({ ...current, email: e.target.value }))} disabled={memberEditor.source === "owner"} className="mt-1" /></div><div><Label>Role</Label><select value={memberEditor.role} onChange={(e) => setMemberEditor((current) => ({ ...current, role: e.target.value }))} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div><div className="flex items-end"><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={memberEditor.admin === true} onChange={(e) => setMemberEditor((current) => ({ ...current, admin: e.target.checked }))} disabled={memberEditor.source === "owner"} />Admin access</label></div><div className="md:col-span-2"><ColorPicker label="Family color" value={memberEditor.color} onChange={(color) => setMemberEditor((current) => ({ ...current, color }))} /></div></div></Modal>}

      {custodyEditor && <Modal title="Edit custody group" description="This is separate from the private family colors." onClose={() => setCustodyEditor(null)} footer={<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCustodyEditor(null)}>Cancel</Button><Button type="button" onClick={saveCustodyEditor} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Saving..." : "Save custody group"}</Button></div>}><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><Label>Group name</Label><Input value={custodyEditor.name} onChange={(e) => setCustodyEditor((current) => ({ ...current, name: e.target.value }))} className="mt-1" /></div><div><Label>Child</Label><Input value={custodyEditor.child} onChange={(e) => setCustodyEditor((current) => ({ ...current, child: e.target.value }))} className="mt-1" /></div><div><Label>My name</Label><Input value={custodyEditor.parentName} onChange={(e) => setCustodyEditor((current) => ({ ...current, parentName: e.target.value }))} className="mt-1" /></div><div><Label>My email</Label><Input value={custodyEditor.parentEmail} onChange={(e) => setCustodyEditor((current) => ({ ...current, parentEmail: e.target.value }))} className="mt-1" /></div><div><ColorPicker label="My custody color" value={custodyEditor.parentColor} onChange={(color) => setCustodyEditor((current) => ({ ...current, parentColor: color }))} /></div><div><ColorPicker label="Co-parent custody color" value={custodyEditor.coparentColor} onChange={(color) => setCustodyEditor((current) => ({ ...current, coparentColor: color }))} /></div><div><Label>Co-parent name</Label><Input value={custodyEditor.coparentName} onChange={(e) => setCustodyEditor((current) => ({ ...current, coparentName: e.target.value }))} className="mt-1" /></div><div><Label>Co-parent email</Label><Input value={custodyEditor.coparentEmail} onChange={(e) => setCustodyEditor((current) => ({ ...current, coparentEmail: e.target.value }))} className="mt-1" /></div></div></Modal>}

      {confirmAction && <ConfirmModal action={confirmAction} saving={saving} onClose={() => setConfirmAction(null)} />}
    </div>
  );
}

function ConfirmModal({ action, saving, onClose }) {
  const [deleteDays, setDeleteDays] = useState(action.deleteDays === true);
  const danger = action.tone === "danger";
  return <Modal title={action.title} description={action.description} onClose={onClose} footer={<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="button" disabled={saving} onClick={() => action.onConfirm?.(deleteDays)} className={danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}>{saving ? "Working..." : action.confirmText || "Confirm"}</Button></div>}>{action.showDeleteDaysOption && <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800"><input type="checkbox" checked={deleteDays} onChange={(e) => setDeleteDays(e.target.checked)} className="mt-1" />Also delete custody schedule days linked to this group.</label>}</Modal>;
}
