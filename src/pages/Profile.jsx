import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Baby,
  CalendarHeart,
  Check,
  ChevronRight,
  Home,
  LogOut,
  Mail,
  Plus,
  Save,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import ParentColorPicker from "@/components/profile/ParentColorPicker";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const moduleLabels = [
  "Family Calendar",
  "Tasks",
  "Meals",
  "Grocery List",
  "Notes",
];

function normalizeChildren(children) {
  return Array.isArray(children) ? children : [];
}

function childLabel(child, index) {
  if (!child) return `Child ${index + 1}`;
  if (typeof child === "string") return child;
  return child.name || child.displayName || child.fullName || child.firstName || child.childName || `Child ${index + 1}`;
}

function memberList(profile, user, myEmail) {
  const members = Array.isArray(profile?.members) ? profile.members : [];
  const base = [];

  if (profile?.parent1_name || profile?.parent1Name) {
    base.push({
      name: profile.parent1_name || profile.parent1Name,
      role: profile.parent1_role || profile.parent1Role || "parent",
      email: profile.owner_email || profile.ownerEmail || myEmail || "",
      admin: true,
    });
  }

  if (profile?.parent2_name || profile?.parent2Name || profile?.parent2_email || profile?.parent2Email) {
    base.push({
      name: profile.parent2_name || profile.parent2Name || "Co-parent / caregiver",
      role: profile.parent2_role || profile.parent2Role || "parent",
      email: profile.parent2_email || profile.parent2Email || "",
      admin: false,
    });
  }

  members.forEach((member) => {
    const exists = base.some((item) => item.email && member.email && item.email.toLowerCase() === member.email.toLowerCase());
    if (!exists) {
      base.push({
        name: member.name || member.displayName || member.email || "Member",
        role: member.role || "member",
        email: member.email || "",
        admin: member.isAdmin === true || member.is_admin === true,
      });
    }
  });

  if (base.length === 0 && user) {
    base.push({ name: user.displayName || user.email || "Me", role: "owner", email: myEmail || "", admin: true });
  }

  return base;
}

function FamilyCard({ family, active, onSelect }) {
  const children = normalizeChildren(family.children);
  const members = memberList(family, null, null);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-3xl border p-4 text-left transition ${
        active
          ? "border-indigo-300 bg-indigo-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-950">{family.family_name || family.familyName || "Family"}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {members.length} member{members.length === 1 ? "" : "s"} · {children.length} child{children.length === 1 ? "" : "ren"}
          </p>
        </div>

        {active ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
            <Check className="h-4 w-4" />
          </span>
        ) : (
          <ChevronRight className="mt-1 h-5 w-5 text-slate-300" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {children.slice(0, 4).map((child, index) => (
          <span key={`${childLabel(child, index)}-${index}`} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            👶 {childLabel(child, index)}
          </span>
        ))}
        {children.length > 4 && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-400 ring-1 ring-slate-200">+{children.length - 4}</span>}
      </div>
    </button>
  );
}

export default function Profile() {
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
    updateActiveFamily,
    refreshFamilies,
  } = useFamily();

  const navigate = useNavigate();

  const [familyName, setFamilyName] = useState("");
  const [children, setChildren] = useState([]);
  const [newChild, setNewChild] = useState("");

  const [parent1Name, setParent1Name] = useState("");
  const [parent1Role, setParent1Role] = useState("dad");
  const [parent1Color, setParent1Color] = useState("blue");

  const [parent2Name, setParent2Name] = useState("");
  const [parent2Email, setParent2Email] = useState("");
  const [parent2Role, setParent2Role] = useState("mom");
  const [parent2Color, setParent2Color] = useState("amber");

  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!profile) return;

    setFamilyName(profile.family_name || profile.familyName || "");
    setChildren(
      Array.isArray(profile.children)
        ? profile.children.map((child, index) => childLabel(child, index))
        : profile.child_name
          ? [profile.child_name]
          : []
    );

    setParent1Name(profile.parent1_name || profile.parent1Name || user?.displayName || "");
    setParent1Role(profile.parent1_role || profile.parent1Role || "dad");
    setParent1Color(profile.parent1_color || profile.parent1Color || "blue");

    setParent2Name(profile.parent2_name || profile.parent2Name || "");
    setParent2Email(profile.parent2_email || profile.parent2Email || "");
    setParent2Role(profile.parent2_role || profile.parent2Role || "mom");
    setParent2Color(profile.parent2_color || profile.parent2Color || "amber");

    setInviteEmail(profile.parent2_email || profile.parent2Email || "");
  }, [profile, user]);

  const canEdit = isAdmin === true;
  const families = allProfiles || [];
  const members = useMemo(() => memberList(profile, user, myEmail), [profile, user, myEmail]);

  const custodyDrafts = useMemo(() => {
    const cleanChildren = children.filter(Boolean);
    return cleanChildren.map((child) => ({
      id: `custody-${child}`,
      child,
      name: `${child} Custody`,
      coparents: [parent1Name || "Parent 1", parent2Name || "Co-parent"].filter(Boolean),
      status: "Planned",
    }));
  }, [children, parent1Name, parent2Name]);

  const handleAddChild = () => {
    if (!newChild.trim()) return;
    setChildren((prev) => [...prev, newChild.trim()]);
    setNewChild("");
  };

  const handleRemoveChild = (index) => {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!familyId) {
      alert("No active familyId found. The profile cannot be saved.");
      return;
    }

    if (!isAdmin) {
      alert("You do not have admin permission to edit this family.");
      return;
    }

    setSaving(true);
    setSavedMessage("");

    try {
      const cleanChildren = children.map((child) => child.trim()).filter(Boolean);

      const payload = {
        familyName: familyName.trim() || "Mi familia",
        family_name: familyName.trim() || "Mi familia",
        children: cleanChildren,
        parent1Name: parent1Name.trim(),
        parent1_name: parent1Name.trim(),
        parent1Role,
        parent1_role: parent1Role,
        parent1Color,
        parent1_color: parent1Color,
        parent2Name: parent2Name.trim(),
        parent2_name: parent2Name.trim(),
        parent2Email: parent2Email.trim().toLowerCase(),
        parent2_email: parent2Email.trim().toLowerCase(),
        parent2Role,
        parent2_role: parent2Role,
        parent2Color,
        parent2_color: parent2Color,
      };

      await updateActiveFamily(payload);
      await refreshFamilies?.();
      setSavedMessage("Cambios guardados correctamente.");
    } catch (error) {
      console.error("Error saving family profile:", error);
      alert(`Error saving profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInviteEmail = async () => {
    if (!familyId || !isAdmin || !inviteEmail.trim()) return;
    const email = inviteEmail.trim().toLowerCase();
    setSaving(true);
    setSavedMessage("");

    try {
      const existingMembers = Array.isArray(profile?.members) ? profile.members : [];
      const existingMemberEmails = Array.isArray(profile?.memberEmails)
        ? profile.memberEmails
        : Array.isArray(profile?.member_emails)
          ? profile.member_emails
          : [];

      const memberAlreadyExists = existingMembers.some((member) => member.email?.toLowerCase() === email);
      const updatedMembers = memberAlreadyExists
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

      const updatedMemberEmails = Array.from(new Set([...existingMemberEmails, email, myEmail].filter(Boolean)));

      await updateActiveFamily({
        parent2Email: email,
        parent2_email: email,
        members: updatedMembers,
        memberEmails: updatedMemberEmails,
        member_emails: updatedMemberEmails,
      });

      await refreshFamilies?.();
      setParent2Email(email);
      setSavedMessage("Email agregado a esta familia. La otra persona deberá registrarse con ese mismo email para verla.");
    } catch (error) {
      console.error("Error saving invite email:", error);
      alert(`Error saving invite email: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <Home className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Family Management</h1>
              <p className="text-sm font-semibold text-slate-500">
                Separate private family spaces from shared custody calendars.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {isOwner && <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Owner</Badge>}
                {isAdmin && <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>}
                {familyId && <Badge variant="outline" className="text-[10px]">Family ID: {familyId.slice(0, 8)}...</Badge>}
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={handleLogout} className="gap-2 border-red-200 text-red-500 hover:text-red-600">
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>

        {!canEdit && (
          <Card className="mb-6 border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              You have read access. Only a family admin can edit this family space.
            </p>
          </Card>
        )}

        {savedMessage && (
          <Card className="mb-6 border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">{savedMessage}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                    <Home className="h-4 w-4" /> Active Family
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-400">This controls private calendar, tasks, meals and lists.</p>
                </div>
              </div>

              <div className="rounded-3xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
                <p className="text-xl font-black text-slate-950">{familyName || "My Family"}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Private family space
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {moduleLabels.map((module) => (
                    <span key={module} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-100">
                      {module}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <Users className="h-4 w-4" /> My Families
              </h2>

              <div className="space-y-3">
                {families.map((family) => (
                  <FamilyCard
                    key={family.id}
                    family={family}
                    active={family.id === activeProfileId}
                    onSelect={() => setActiveProfileId?.(family.id)}
                  />
                ))}

                {families.length === 0 && <p className="text-sm font-semibold text-slate-400">No family spaces found.</p>}
              </div>

              <Button type="button" variant="outline" className="mt-4 w-full gap-2" disabled>
                <Plus className="h-4 w-4" /> Create another family soon
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <Home className="h-4 w-4" /> Family Space Settings
              </h2>

              <div className="space-y-5">
                <div>
                  <Label>Family name</Label>
                  <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} disabled={!canEdit} placeholder="Daniel & Mary Family" className="mt-1" />
                </div>

                <div>
                  <Label>Children in this family space</Label>
                  <div className="my-3 flex flex-wrap gap-2">
                    {children.map((child, index) => (
                      <span key={`${child}-${index}`} className="flex items-center gap-2 rounded-xl bg-indigo-100 px-3 py-1.5 text-sm font-bold text-indigo-700">
                        👶 {child}
                        {canEdit && <button type="button" onClick={() => handleRemoveChild(index)}><X className="h-4 w-4" /></button>}
                      </span>
                    ))}
                    {children.length === 0 && <p className="text-sm text-muted-foreground">No children added yet.</p>}
                  </div>

                  {canEdit && (
                    <div className="flex gap-2">
                      <Input placeholder="Child name" value={newChild} onChange={(e) => setNewChild(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddChild()} />
                      <Button type="button" variant="outline" onClick={handleAddChild}><Plus className="h-5 w-5" /></Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <Users className="h-4 w-4" /> Parents / Caregivers
              </h2>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border bg-blue-50/40 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Parent 1 name</Label>
                      <Input value={parent1Name} onChange={(e) => setParent1Name(e.target.value)} disabled={!canEdit} placeholder="Daniel" className="mt-1" />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <select value={parent1Role} onChange={(e) => { const role = e.target.value; setParent1Role(role); setParent2Role(role === "dad" ? "mom" : "dad"); }} disabled={!canEdit} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                        <option value="dad">Dad</option>
                        <option value="mom">Mom</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ParentColorPicker label="Parent 1 color" value={parent1Color} onChange={setParent1Color} />
                  </div>
                </div>

                <div className="rounded-2xl border bg-amber-50/40 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Parent 2 name</Label>
                      <Input value={parent2Name} onChange={(e) => setParent2Name(e.target.value)} disabled={!canEdit} placeholder="Name" className="mt-1" />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <select value={parent2Role} onChange={(e) => { const role = e.target.value; setParent2Role(role); setParent1Role(role === "dad" ? "mom" : "dad"); }} disabled={!canEdit} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                        <option value="mom">Mom</option>
                        <option value="dad">Dad</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Parent 2 email</Label>
                      <Input type="email" value={parent2Email} onChange={(e) => setParent2Email(e.target.value)} disabled={!canEdit} placeholder="email@example.com" className="mt-1" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <ParentColorPicker label="Parent 2 color" value={parent2Color} onChange={setParent2Color} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <Shield className="h-4 w-4" /> Members & Permissions
              </h2>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {members.map((member, index) => (
                  <div key={`${member.email}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{member.name || member.email || "Member"}</p>
                        <p className="text-xs font-semibold text-slate-400">{member.email || "No email"}</p>
                      </div>
                      <Badge variant={member.admin ? "secondary" : "outline"}>{member.admin ? "Admin" : member.role}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {moduleLabels.slice(0, 4).map((module) => (
                        <span key={module} className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                          {module}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700"><Mail className="h-4 w-4" /> Invite / connect member</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input type="email" placeholder="email@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={!canEdit} />
                  <Button type="button" disabled={!canEdit || !inviteEmail.trim() || saving} onClick={handleSaveInviteEmail} className="gap-2">
                    <UserPlus className="h-5 w-5" /> Add
                  </Button>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  MVP flow: this authorizes the email. Later this becomes a real email invitation with Firebase Functions.
                </p>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <CalendarHeart className="h-4 w-4" /> Custody Calendars
              </h2>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="font-black text-slate-950">Shared custody spaces are separate from private family spaces.</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Family Calendar, Tasks, Meals and Grocery stay private by family. Custody Calendar is shared only between authorized co-parents.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {custodyDrafts.map((custody) => (
                  <div key={custody.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Baby className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-900">{custody.name}</p>
                        <p className="text-xs font-semibold text-slate-400">Co-parents: {custody.coparents.join(" & ")}</p>
                        <Badge variant="outline" className="mt-2">{custody.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {custodyDrafts.length === 0 && <p className="text-sm font-semibold text-slate-400">Add a child to prepare a custody calendar.</p>}
              </div>

              <Button type="button" variant="outline" disabled className="mt-4 w-full gap-2">
                <Plus className="h-4 w-4" /> Create custody group soon
              </Button>
            </Card>

            {canEdit && (
              <Button type="button" onClick={handleSave} disabled={saving || !familyId || !isAdmin} className="w-full rounded-xl bg-indigo-600 py-6 font-semibold text-white hover:bg-indigo-700">
                <Save className="mr-2 h-5 w-5" /> {saving ? "Saving..." : "Save family changes"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
