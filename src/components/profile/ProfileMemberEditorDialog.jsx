import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERSON_COLOR_OPTIONS } from "@/lib/personColorUtils";

export const roleOptions = [
  { value: "parent", label: "Parent" },
  { value: "dad", label: "Dad" },
  { value: "mom", label: "Mom" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "babysitter", label: "Babysitter" },
  { value: "caregiver", label: "Caregiver" },
  { value: "family", label: "Family member" },
];

const roleValues = new Set(roleOptions.map((role) => role.value));

export function normalizeMemberRole(role, fallback = "caregiver") {
  const value = String(role || "").trim().toLowerCase();
  if (value === "member") return "family";
  if (roleValues.has(value)) return value;
  return fallback;
}

function ColorPicker({ value, onChange }) {
  const selected = value || "teal";

  return (
    <div>
      <Label>Family color</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {PERSON_COLOR_OPTIONS.map((color) => {
          const active = selected === color.id;
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

export default function ProfileMemberEditorDialog({ editor, onChange, onClose, onSave, saving = false }) {
  if (!editor) return null;

  const isAdd = editor.mode === "add";
  const isOwner = editor.source === "owner";
  const safeEditor = {
    ...editor,
    name: editor.name || "",
    email: editor.email || "",
    role: normalizeMemberRole(editor.role, isOwner ? "parent" : "caregiver"),
    color: editor.color || "teal",
    admin: editor.admin === true,
  };

  function patch(updates) {
    onChange?.({ ...safeEditor, ...updates });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="relative z-[10000] w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {isAdd ? "Add family member" : "Edit family member"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Manage grandparents, babysitters, caregivers, or family members for this private family space.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              value={safeEditor.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Sra Petra"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              value={safeEditor.email}
              onChange={(event) => patch({ email: event.target.value })}
              disabled={isOwner}
              placeholder="name@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Role</Label>
            <select
              value={safeEditor.role}
              onChange={(event) => patch({ role: event.target.value })}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">
              <input
                type="checkbox"
                checked={safeEditor.admin}
                onChange={(event) => patch({ admin: event.target.checked })}
                disabled={isOwner}
              />
              Admin access
            </label>
          </div>

          <div className="md:col-span-2">
            <ColorPicker value={safeEditor.color} onChange={(color) => patch({ color })} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSave?.(safeEditor)} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? "Saving..." : "Save member"}
          </Button>
        </div>
      </div>
    </div>
  );
}
