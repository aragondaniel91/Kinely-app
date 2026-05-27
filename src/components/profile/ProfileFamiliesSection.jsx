import { useEffect, useState } from "react";
import { Check, Plus, Save, Trash2, Users, X } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { PERSON_COLOR_OPTIONS, colorClasses, getColorMeta, normalizeChildren } from "@/lib/personColorUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const roleOptions = [
  { value: "parent", label: "Parent" },
  { value: "dad", label: "Dad" },
  { value: "mom", label: "Mom" },
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function familyNameOf(family) {
  return family?.family_name || family?.familyName || "Family";
}

function getFamilyMemberCount(family) {
  if (Array.isArray(family?.memberEmails)) return family.memberEmails.length;
  if (Array.isArray(family?.member_emails)) return family.member_emails.length;
  if (Array.isArray(family?.members)) return family.members.length + 1;
  return 1;
}

function ColorPicker({ value, onChange, label = "Color", disabled = false }) {
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
              disabled={disabled}
              onClick={() => onChange(color.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

function FamilyCard({ family, active, onSelect }) {
  const children = normalizeChildren(family?.children || []);
  const memberCount = getFamilyMemberCount(family);

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
            {memberCount} member{memberCount === 1 ? "" : "s"} · {children.length} child{children.length === 1 ? "" : "ren"}
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
          children.slice(0, 4).map((child) => {
            const color = getColorMeta(child.colorId || child.color_id || child.color);
            return (
              <span key={child.id || child.name} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${color.bg} ${color.text} ${color.border}`}>
                👶 {child.name}
              </span>
            );
          })
        ) : (
          <span className="text-xs font-bold text-slate-400">No children added</span>
        )}
      </div>
    </button>
  );
}

export default function ProfileFamiliesSection() {
  const {
    user,
    profile,
    familyId,
    isAdmin,
    allProfiles,
    activeProfileId,
    setActiveProfileId,
    createFamily,
    updateActiveFamily,
    refreshFamilies,
  } = useFamily();

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

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const families = allProfiles || [];
  const canEdit = isAdmin === true;

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

  function clearStatus() {
    setMessage("");
    setError("");
  }

  function handleAddChild() {
    const value = newChild.trim();
    if (!value) return;
    setChildren((current) => [
      ...current,
      {
        id: `child-${Date.now()}`,
        name: value,
        color: newChildColor,
        colorId: newChildColor,
        color_id: newChildColor,
      },
    ]);
    setNewChild("");
    setNewChildColor("green");
  }

  function handleUpdateChild(id, updates) {
    setChildren((current) => current.map((child) => (child.id === id ? { ...child, ...updates } : child)));
  }

  function handleRemoveChild(childToRemove) {
    setChildren((current) => current.filter((child) => child.id !== childToRemove.id));
  }

  async function handleSaveFamily() {
    if (!familyId) return setError("No active family found.");
    if (!canEdit) return setError("Only a family admin can edit this family.");

    clearStatus();
    setSaving(true);

    try {
      const cleanChildren = children
        .map((child) => ({
          ...child,
          id: child.id || `child-${String(child.name || "child").toLowerCase().replace(/\s+/g, "-")}`,
          childId: child.childId || child.id || `child-${String(child.name || "child").toLowerCase().replace(/\s+/g, "-")}`,
          name: String(child.name || "").trim(),
          childName: child.childName || String(child.name || "").trim(),
          color: child.colorId || child.color_id || child.color || "green",
          colorId: child.colorId || child.color_id || child.color || "green",
          color_id: child.color_id || child.colorId || child.color || "green",
        }))
        .filter((child) => child.name);

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
      setMessage("Family changes saved.");
    } catch (err) {
      console.error("Error saving family", err);
      setError(err?.message || "Error saving family.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateFamily() {
    if (!newFamilyName.trim()) return setError("Please enter a family name.");

    clearStatus();
    setCreatingFamily(true);

    try {
      const cleanChildren = newFamilyChildren
        .split(",")
        .map((name, index) => ({
          id: `child-${Date.now()}-${index}`,
          childId: `child-${Date.now()}-${index}`,
          name: name.trim(),
          childName: name.trim(),
          color: PERSON_COLOR_OPTIONS[(index + 1) % PERSON_COLOR_OPTIONS.length].id,
          colorId: PERSON_COLOR_OPTIONS[(index + 1) % PERSON_COLOR_OPTIONS.length].id,
          color_id: PERSON_COLOR_OPTIONS[(index + 1) % PERSON_COLOR_OPTIONS.length].id,
        }))
        .filter((child) => child.name);

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
      setMessage("New family space created and selected.");
    } catch (err) {
      console.error("Error creating family", err);
      setError(err?.message || "Error creating family.");
    } finally {
      setCreatingFamily(false);
    }
  }

  return (
    <div className="space-y-5">
      {message && <Card className="border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">{message}</Card>}
      {error && <Card className="border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</Card>}
      {!canEdit && <Card className="border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">You have read access. Only a family admin can edit this family space.</Card>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
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
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-slate-500">Active Family Details</p>
              <p className="text-sm font-semibold text-slate-400">Edit adults, children, and family-specific colors.</p>
            </div>
            {canEdit && (
              <Button variant="outline" onClick={() => setShowCreateFamily((current) => !current)} className="gap-2">
                {showCreateFamily ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showCreateFamily ? "Close" : "New Family"}
              </Button>
            )}
          </div>

          {showCreateFamily ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><Label>Family name</Label><Input value={newFamilyName} onChange={(event) => setNewFamilyName(event.target.value)} placeholder="Daniel & Mary Family" className="mt-1" /></div>
              <div><Label>Second adult name</Label><Input value={newFamilyAdultName} onChange={(event) => setNewFamilyAdultName(event.target.value)} placeholder="Mary" className="mt-1" /></div>
              <div><Label>Second adult email</Label><Input type="email" value={newFamilyAdultEmail} onChange={(event) => setNewFamilyAdultEmail(event.target.value)} placeholder="email@example.com" className="mt-1" /></div>
              <div><Label>Children</Label><Input value={newFamilyChildren} onChange={(event) => setNewFamilyChildren(event.target.value)} placeholder="Joaquin, Mady" className="mt-1" /><p className="mt-1 text-xs font-semibold text-slate-400">Separate children by commas.</p></div>
              <div className="md:col-span-2"><Button onClick={handleCreateFamily} disabled={creatingFamily || !newFamilyName.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700">{creatingFamily ? "Creating..." : "Create and switch"}</Button></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><Label>Family name</Label><Input value={familyName} onChange={(event) => setFamilyName(event.target.value)} disabled={!canEdit} className="mt-1" /></div>
              <div><Label>Parent 1 name</Label><Input value={parent1Name} onChange={(event) => setParent1Name(event.target.value)} disabled={!canEdit} className="mt-1" /></div>
              <div><Label>Parent 1 role</Label><select value={parent1Role} onChange={(event) => setParent1Role(event.target.value)} disabled={!canEdit} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
              <ColorPicker label="Parent 1 family color" value={parent1Color} onChange={setParent1Color} disabled={!canEdit} />
              <div><Label>Parent 2 name</Label><Input value={parent2Name} onChange={(event) => setParent2Name(event.target.value)} disabled={!canEdit} className="mt-1" /></div>
              <div><Label>Parent 2 email</Label><Input value={parent2Email} onChange={(event) => setParent2Email(event.target.value)} disabled={!canEdit} className="mt-1" /></div>
              <div><Label>Parent 2 role</Label><select value={parent2Role} onChange={(event) => setParent2Role(event.target.value)} disabled={!canEdit} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
              <ColorPicker label="Parent 2 family color" value={parent2Color} onChange={setParent2Color} disabled={!canEdit} />

              <div className="md:col-span-2">
                <Label>Children and colors</Label>
                <div className="mt-3 space-y-3">
                  {children.map((child) => {
                    const childColor = child.colorId || child.color_id || child.color || "green";
                    const classes = colorClasses(childColor);
                    return (
                      <div key={child.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_220px_auto] md:items-center">
                        <Input value={child.name} onChange={(event) => handleUpdateChild(child.id, { name: event.target.value })} disabled={!canEdit} />
                        <div className="flex flex-wrap gap-1.5">
                          {PERSON_COLOR_OPTIONS.map((color) => (
                            <button key={color.id} type="button" disabled={!canEdit} onClick={() => handleUpdateChild(child.id, { color: color.id, colorId: color.id, color_id: color.id })} className={`h-7 w-7 rounded-full border-2 ${color.dot} ${childColor === color.id ? "border-slate-900" : "border-white"}`} aria-label={color.label} />
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
                      <div><Label>New child</Label><Input value={newChild} onChange={(event) => setNewChild(event.target.value)} placeholder="Add child" className="mt-1" /></div>
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
    </div>
  );
}
