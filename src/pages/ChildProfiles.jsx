import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Baby, HeartPulse, Pill, Save, Shirt, ShieldAlert, Stethoscope } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function field(value) {
  return String(value || "");
}

function childName(child) {
  return child?.name || child?.childName || "Child";
}

function createEmptyCareProfile() {
  return {
    basicInfo: {
      dateOfBirth: "",
      age: "",
      height: "",
      weight: "",
      bloodType: "",
      pediatrician: "",
      preferredHospital: "",
    },
    clothingSizes: {
      shirt: "",
      pants: "",
      shoes: "",
      jacket: "",
      notes: "",
    },
    allergies: [],
    medications: [],
    emergencyPlan: {
      emergencyContactName: "",
      emergencyContactPhone: "",
      feverInstructions: "",
      allergyInstructions: "",
      generalNotes: "",
    },
  };
}

function normalizeCareProfile(child) {
  const current = child?.careProfile || child?.care_profile || {};
  const empty = createEmptyCareProfile();

  return {
    basicInfo: { ...empty.basicInfo, ...(current.basicInfo || current.basic_info || {}) },
    clothingSizes: { ...empty.clothingSizes, ...(current.clothingSizes || current.clothing_sizes || {}) },
    allergies: Array.isArray(current.allergies) ? current.allergies : [],
    medications: Array.isArray(current.medications) ? current.medications : [],
    emergencyPlan: { ...empty.emergencyPlan, ...(current.emergencyPlan || current.emergency_plan || {}) },
  };
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) years -= 1;

  return years >= 0 ? String(years) : "";
}

function SectionHeader({ icon: Icon, eyebrow, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-500">{eyebrow}</p>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        {description && <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

export default function ChildProfiles() {
  const { profile, children = [], isAdmin, updateActiveFamily, refreshFamilies } = useFamily();
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || children[0]?.childId || "");
  const [draftChildren, setDraftChildren] = useState(children);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftChildren(children);
    setSelectedChildId((currentId) => {
      const stillExists = children.some((child) => (child.id || child.childId) === currentId);
      if (stillExists) return currentId;
      return children[0]?.id || children[0]?.childId || "";
    });
  }, [children, profile?.id]);

  const activeChildren = draftChildren.length ? draftChildren : children;
  const selectedChild = useMemo(() => {
    return activeChildren.find((child) => (child.id || child.childId) === selectedChildId) || activeChildren[0] || null;
  }, [activeChildren, selectedChildId]);

  const selectedId = selectedChild?.id || selectedChild?.childId || "";
  const careProfile = normalizeCareProfile(selectedChild);

  function updateSelectedChild(updater) {
    if (!selectedChild) return;
    const id = selectedId;
    setDraftChildren((current) => {
      const source = current.length ? current : children;
      return source.map((child) => {
        const childId = child.id || child.childId;
        if (childId !== id) return child;
        return updater(child);
      });
    });
  }

  function updateCareSection(section, updates) {
    updateSelectedChild((child) => {
      const current = normalizeCareProfile(child);
      return {
        ...child,
        careProfile: {
          ...current,
          [section]: {
            ...current[section],
            ...updates,
          },
        },
      };
    });
  }

  function updateBasicInfo(updates) {
    const nextUpdates = { ...updates };
    if (updates.dateOfBirth !== undefined) {
      nextUpdates.age = calculateAge(updates.dateOfBirth);
    }
    updateCareSection("basicInfo", nextUpdates);
  }

  function addAllergy() {
    updateSelectedChild((child) => {
      const current = normalizeCareProfile(child);
      return {
        ...child,
        careProfile: {
          ...current,
          allergies: [
            ...current.allergies,
            { id: `allergy-${Date.now()}`, name: "", severity: "Mild", reaction: "", emergencyMedication: "", instructions: "" },
          ],
        },
      };
    });
  }

  function updateAllergy(allergyId, updates) {
    updateSelectedChild((child) => {
      const current = normalizeCareProfile(child);
      return {
        ...child,
        careProfile: {
          ...current,
          allergies: current.allergies.map((allergy) => allergy.id === allergyId ? { ...allergy, ...updates } : allergy),
        },
      };
    });
  }

  function removeAllergy(allergyId) {
    updateSelectedChild((child) => {
      const current = normalizeCareProfile(child);
      return {
        ...child,
        careProfile: {
          ...current,
          allergies: current.allergies.filter((allergy) => allergy.id !== allergyId),
        },
      };
    });
  }

  function addMedication() {
    updateSelectedChild((child) => {
      const current = normalizeCareProfile(child);
      return {
        ...child,
        careProfile: {
          ...current,
          medications: [
            ...current.medications,
            { id: `med-${Date.now()}`, name: "", dosage: "", whenToGive: "", requiredAt: "Both homes", notes: "" },
          ],
        },
      };
    });
  }

  function updateMedication(medicationId, updates) {
    updateSelectedChild((child) => {
      const current = normalizeCareProfile(child);
      return {
        ...child,
        careProfile: {
          ...current,
          medications: current.medications.map((medication) => medication.id === medicationId ? { ...medication, ...updates } : medication),
        },
      };
    });
  }

  function removeMedication(medicationId) {
    updateSelectedChild((child) => {
      const current = normalizeCareProfile(child);
      return {
        ...child,
        careProfile: {
          ...current,
          medications: current.medications.filter((medication) => medication.id !== medicationId),
        },
      };
    });
  }

  async function saveChildProfiles() {
    if (!isAdmin) {
      setError("Only a family admin can edit child care profiles.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await updateActiveFamily({ children: activeChildren });
      await refreshFamilies?.();
      setMessage("Child care profile saved.");
    } catch (saveError) {
      console.error("Error saving child care profile:", saveError);
      setError(saveError?.message || "Could not save the child care profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-sm font-bold text-slate-500">
        Loading child profiles...
      </div>
    );
  }

  if (!activeChildren.length) {
    return (
      <div className="min-h-full bg-slate-50 p-4 md:p-6">
        <Card className="mx-auto max-w-3xl rounded-[2rem] border-slate-200 bg-white p-6 text-center shadow-sm">
          <Baby className="mx-auto h-10 w-10 text-indigo-500" />
          <h1 className="mt-3 text-2xl font-black text-slate-950">No children yet</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Add a child from Profile &gt; Members & Access first. Then their care profile will appear here.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <Card className="rounded-[2rem] border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Child Care Profile</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Kids health, sizes, and care notes</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                Store basic care information both homes may need: allergies, medications, clothing sizes, emergency notes, and fever/allergy instructions.
              </p>
              <p className="mt-2 max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                Medical notes are for family coordination only and do not replace professional medical advice. Always follow your pediatrician’s instructions and emergency services guidance.
              </p>
            </div>

            <Button type="button" onClick={saveChildProfiles} disabled={!isAdmin || saving} className="gap-2 rounded-2xl">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>

          {(message || error) && (
            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${message ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              {message || error}
            </div>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="h-fit rounded-[2rem] border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Children</p>
            <div className="mt-3 space-y-2">
              {activeChildren.map((child) => {
                const id = child.id || child.childId;
                const active = id === selectedId;
                const info = normalizeCareProfile(child).basicInfo;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedChildId(id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${active ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👶</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{childName(child)}</p>
                        <p className="text-xs font-semibold text-slate-500">{info.age ? `${info.age} years old` : "Care profile"}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeader icon={HeartPulse} eyebrow="Basic Info" title={childName(selectedChild)} description="Basic health and emergency reference information." />
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Date of birth</Label>
                  <Input type="date" value={field(careProfile.basicInfo.dateOfBirth)} onChange={(event) => updateBasicInfo({ dateOfBirth: event.target.value })} disabled={!isAdmin} className="mt-1" />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input value={field(careProfile.basicInfo.age)} onChange={(event) => updateBasicInfo({ age: event.target.value })} disabled={!isAdmin} className="mt-1" />
                </div>
                <div>
                  <Label>Blood type</Label>
                  <Input value={field(careProfile.basicInfo.bloodType)} onChange={(event) => updateBasicInfo({ bloodType: event.target.value })} disabled={!isAdmin} placeholder="O+, A-, unknown" className="mt-1" />
                </div>
                <div>
                  <Label>Height</Label>
                  <Input value={field(careProfile.basicInfo.height)} onChange={(event) => updateBasicInfo({ height: event.target.value })} disabled={!isAdmin} placeholder="42 in" className="mt-1" />
                </div>
                <div>
                  <Label>Weight</Label>
                  <Input value={field(careProfile.basicInfo.weight)} onChange={(event) => updateBasicInfo({ weight: event.target.value })} disabled={!isAdmin} placeholder="40 lb" className="mt-1" />
                </div>
                <div>
                  <Label>Pediatrician</Label>
                  <Input value={field(careProfile.basicInfo.pediatrician)} onChange={(event) => updateBasicInfo({ pediatrician: event.target.value })} disabled={!isAdmin} className="mt-1" />
                </div>
                <div className="md:col-span-3">
                  <Label>Preferred hospital / urgent care</Label>
                  <Input value={field(careProfile.basicInfo.preferredHospital)} onChange={(event) => updateBasicInfo({ preferredHospital: event.target.value })} disabled={!isAdmin} className="mt-1" />
                </div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeader icon={Shirt} eyebrow="Sizes" title="Clothing sizes" description="Helpful for clothes, school events, travel, and both homes." />
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div><Label>Shirt</Label><Input value={field(careProfile.clothingSizes.shirt)} onChange={(event) => updateCareSection("clothingSizes", { shirt: event.target.value })} disabled={!isAdmin} className="mt-1" /></div>
                <div><Label>Pants</Label><Input value={field(careProfile.clothingSizes.pants)} onChange={(event) => updateCareSection("clothingSizes", { pants: event.target.value })} disabled={!isAdmin} className="mt-1" /></div>
                <div><Label>Shoes</Label><Input value={field(careProfile.clothingSizes.shoes)} onChange={(event) => updateCareSection("clothingSizes", { shoes: event.target.value })} disabled={!isAdmin} className="mt-1" /></div>
                <div><Label>Jacket</Label><Input value={field(careProfile.clothingSizes.jacket)} onChange={(event) => updateCareSection("clothingSizes", { jacket: event.target.value })} disabled={!isAdmin} className="mt-1" /></div>
                <div className="md:col-span-4"><Label>Size notes</Label><Input value={field(careProfile.clothingSizes.notes)} onChange={(event) => updateCareSection("clothingSizes", { notes: event.target.value })} disabled={!isAdmin} className="mt-1" /></div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <SectionHeader icon={ShieldAlert} eyebrow="Allergies" title="Allergies and reactions" description="Track allergy severity, reaction, and emergency medication." />
                <Button type="button" onClick={addAllergy} disabled={!isAdmin} className="gap-2 rounded-2xl"><AlertTriangle className="h-4 w-4" /> Add allergy</Button>
              </div>
              <div className="mt-5 space-y-3">
                {careProfile.allergies.map((allergy) => (
                  <div key={allergy.id} className="rounded-3xl border border-red-100 bg-red-50/50 p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <div><Label>Allergy</Label><Input value={field(allergy.name)} onChange={(event) => updateAllergy(allergy.id, { name: event.target.value })} disabled={!isAdmin} className="mt-1 bg-white" /></div>
                      <div>
                        <Label>Severity</Label>
                        <Select
                          value={field(allergy.severity) || "Mild"}
                          onValueChange={(nextValue) => updateAllergy(allergy.id, { severity: nextValue })}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="mt-1 rounded-xl border-slate-200 bg-white text-sm font-bold text-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mild">Mild</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Severe">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Reaction</Label><Input value={field(allergy.reaction)} onChange={(event) => updateAllergy(allergy.id, { reaction: event.target.value })} disabled={!isAdmin} className="mt-1 bg-white" /></div>
                      <div><Label>Emergency medication</Label><Input value={field(allergy.emergencyMedication)} onChange={(event) => updateAllergy(allergy.id, { emergencyMedication: event.target.value })} disabled={!isAdmin} placeholder="EpiPen, Benadryl" className="mt-1 bg-white" /></div>
                      <div className="md:col-span-4"><Label>Instructions</Label><Input value={field(allergy.instructions)} onChange={(event) => updateAllergy(allergy.id, { instructions: event.target.value })} disabled={!isAdmin} className="mt-1 bg-white" /></div>
                    </div>
                    {isAdmin && <Button type="button" variant="outline" onClick={() => removeAllergy(allergy.id)} className="mt-3 rounded-2xl border-red-200 bg-white text-red-700">Remove allergy</Button>}
                  </div>
                ))}
                {careProfile.allergies.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-400">No allergies added.</p>}
              </div>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <SectionHeader icon={Pill} eyebrow="Medications" title="Medications both homes should know" description="Track medication, dosage, when to give, and where it should be available." />
                <Button type="button" onClick={addMedication} disabled={!isAdmin} className="gap-2 rounded-2xl"><Pill className="h-4 w-4" /> Add medication</Button>
              </div>
              <div className="mt-5 space-y-3">
                {careProfile.medications.map((medication) => (
                  <div key={medication.id} className="rounded-3xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="grid gap-3 md:grid-cols-5">
                      <div><Label>Medication</Label><Input value={field(medication.name)} onChange={(event) => updateMedication(medication.id, { name: event.target.value })} disabled={!isAdmin} className="mt-1 bg-white" /></div>
                      <div><Label>Dosage</Label><Input value={field(medication.dosage)} onChange={(event) => updateMedication(medication.id, { dosage: event.target.value })} disabled={!isAdmin} placeholder="As prescribed" className="mt-1 bg-white" /></div>
                      <div><Label>When to give</Label><Input value={field(medication.whenToGive)} onChange={(event) => updateMedication(medication.id, { whenToGive: event.target.value })} disabled={!isAdmin} className="mt-1 bg-white" /></div>
                      <div>
                        <Label>Required at</Label>
                        <Select
                          value={field(medication.requiredAt) || "Both homes"}
                          onValueChange={(nextValue) => updateMedication(medication.id, { requiredAt: nextValue })}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="mt-1 rounded-xl border-slate-200 bg-white text-sm font-bold text-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Both homes">Both homes</SelectItem>
                            <SelectItem value="Dad's house">Dad's house</SelectItem>
                            <SelectItem value="Mom's house">Mom's house</SelectItem>
                            <SelectItem value="School/daycare">School/daycare</SelectItem>
                            <SelectItem value="As needed">As needed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Notes</Label><Input value={field(medication.notes)} onChange={(event) => updateMedication(medication.id, { notes: event.target.value })} disabled={!isAdmin} className="mt-1 bg-white" /></div>
                    </div>
                    {isAdmin && <Button type="button" variant="outline" onClick={() => removeMedication(medication.id)} className="mt-3 rounded-2xl border-red-200 bg-white text-red-700">Remove medication</Button>}
                  </div>
                ))}
                {careProfile.medications.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-400">No medications added.</p>}
              </div>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeader icon={Stethoscope} eyebrow="Emergency Plan" title="Emergency and care notes" description="Shared notes for fever, allergy events, emergency contacts, and general care." />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div><Label>Emergency contact name</Label><Input value={field(careProfile.emergencyPlan.emergencyContactName)} onChange={(event) => updateCareSection("emergencyPlan", { emergencyContactName: event.target.value })} disabled={!isAdmin} className="mt-1" /></div>
                <div><Label>Emergency contact phone</Label><Input value={field(careProfile.emergencyPlan.emergencyContactPhone)} onChange={(event) => updateCareSection("emergencyPlan", { emergencyContactPhone: event.target.value })} disabled={!isAdmin} className="mt-1" /></div>
                <div className="md:col-span-2"><Label>Fever instructions</Label><Input value={field(careProfile.emergencyPlan.feverInstructions)} onChange={(event) => updateCareSection("emergencyPlan", { feverInstructions: event.target.value })} disabled={!isAdmin} placeholder="Example: Follow pediatrician dosage guidance if temperature reaches the agreed threshold." className="mt-1" /></div>
                <div className="md:col-span-2"><Label>Allergy emergency instructions</Label><Input value={field(careProfile.emergencyPlan.allergyInstructions)} onChange={(event) => updateCareSection("emergencyPlan", { allergyInstructions: event.target.value })} disabled={!isAdmin} placeholder="Example: Use emergency medication as prescribed and call emergency services." className="mt-1" /></div>
                <div className="md:col-span-2"><Label>General notes</Label><Input value={field(careProfile.emergencyPlan.generalNotes)} onChange={(event) => updateCareSection("emergencyPlan", { generalNotes: event.target.value })} disabled={!isAdmin} className="mt-1" /></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
