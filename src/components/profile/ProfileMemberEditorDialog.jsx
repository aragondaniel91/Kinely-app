import {
  Bell,
  CalendarDays,
  CheckSquare,
  CreditCard,
  HeartHandshake,
  Home,
  ListChecks,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PERSON_COLOR_OPTIONS } from "@/lib/personColorUtils";
import {
  FAMILY_ROLE_OPTIONS,
  getMemberRoleMeta,
  normalizeMemberRole,
  roleToPersonType,
  roleToRelationship,
} from "@/lib/memberRoles";
import {
  buildDefaultModuleAccess,
  getMemberModuleAccess,
} from "@/features/tasks/utils/memberModuleVisibility";

export const roleOptions = FAMILY_ROLE_OPTIONS;

const MODULE_ACCESS_CONFIGS = [
  {
    id: "home",
    label: "Home",
    description: "Kinely dashboard and today view.",
    icon: Home,
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Family events and shared schedule.",
    icon: CalendarDays,
    assignmentControls: {
      visibleLabel: "Show in filters",
      visibleDescription: "Include this person in calendar legend and filters.",
      assignableLabel: "Assign events",
      assignableDescription: "Allow events to target this person.",
      readLabel: "View calendar",
      readDescription: "Let this member open calendar events.",
      writeLabel: "Create / edit",
      writeDescription: "Allow creating and changing events.",
    },
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "Task board, assignments, and routines.",
    icon: CheckSquare,
    assignmentControls: {
      visibleLabel: "Show on board",
      visibleDescription: "Display this member on task boards.",
      assignableLabel: "Assign tasks",
      assignableDescription: "Allow tasks to target this person.",
      readLabel: "View tasks",
      readDescription: "Let this member open tasks.",
      writeLabel: "Edit tasks",
      writeDescription: "Allow creating and completing tasks.",
    },
  },
  {
    id: "meals",
    label: "Meals",
    description: "Meal plans, templates, and food planning.",
    icon: UtensilsCrossed,
  },
  {
    id: "lists",
    label: "Lists",
    description: "Groceries, packing, and shared checklists.",
    icon: ListChecks,
  },
  {
    id: "custody",
    label: "Custody",
    description: "Custody calendar, exchanges, and packing.",
    icon: HeartHandshake,
  },
  {
    id: "budget",
    label: "Budget",
    description: "Sensitive custody expenses and reimbursements.",
    icon: CreditCard,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Family and custody reminders.",
    icon: Bell,
  },
];

const MODULE_ACCESS_GROUPS = [
  {
    id: "assignments",
    label: "Presence & assignments",
    description: "Controls who appears in people-based views and who can receive work.",
    moduleIds: ["calendar", "tasks"],
  },
  {
    id: "household",
    label: "Household modules",
    description: "General shared areas for daily family organization.",
    moduleIds: ["home", "meals", "lists", "notifications"],
  },
  {
    id: "sensitive",
    label: "Sensitive spaces",
    description: "Coparenting and financial information need explicit access.",
    moduleIds: ["custody", "budget"],
  },
];

const MODULE_ACCESS_CONFIG_BY_ID = new Map(
  MODULE_ACCESS_CONFIGS.map((config) => [config.id, config])
);

function booleanOrFallback(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
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

function HouseholdPresenceEditor({
  livesHere,
  showOnHomeDashboard,
  onChange,
  disabled,
}) {
  function patch(field, nextValue) {
    onChange?.({
      livesHere,
      showOnHomeDashboard,
      [field]: nextValue,
    });
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2">
      <p className="text-sm font-black text-slate-950">Home presence</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-2xl border border-white bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">
          <Switch
            checked={livesHere === true}
            disabled={disabled}
            onCheckedChange={(checked) => patch("livesHere", checked)}
            className="mt-1"
          />
          <span>
            <span className="block font-black text-slate-950">Lives here</span>
            <span className="block text-xs font-semibold text-slate-500">
              Household context only. It does not force Home visibility.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-white bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">
          <Switch
            checked={showOnHomeDashboard === true}
            disabled={disabled}
            onCheckedChange={(checked) => patch("showOnHomeDashboard", checked)}
            className="mt-1"
          />
          <span>
            <span className="block font-black text-slate-950">Show on Home</span>
            <span className="block text-xs font-semibold text-slate-500">
              Include this person in Today by person.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function normalizeEditorModules(editor = {}) {
  const currentModules = editor.modules || {};

  const modules = MODULE_ACCESS_CONFIGS.reduce(
    (modules, config) => {
      const fallbackModules =
        config.id === "lists" && !currentModules.lists && currentModules.groceries
          ? { ...currentModules, lists: currentModules.groceries }
          : currentModules;
      const access = getMemberModuleAccess(
        { ...editor, modules: fallbackModules },
        config.id
      );

      modules[config.id] = {
        ...buildDefaultModuleAccess(),
        ...access,
        ...(fallbackModules[config.id] || {}),
      };

      return modules;
    },
    { ...currentModules }
  );

  return {
    ...modules,
    groceries: modules.lists || modules.groceries || buildDefaultModuleAccess(),
  };
}

function ModuleAccessEditor({ value, onChange, disabled }) {
  const access = {
    ...buildDefaultModuleAccess(),
    ...value,
  };

  function patch(field, nextValue) {
    const nextAccess = {
      ...access,
      [field]: nextValue,
    };

    if (field === "read" && nextValue === false) {
      nextAccess.write = false;
      nextAccess.assignable = false;
    }

    if (field === "visible" && nextValue === false) {
      nextAccess.assignable = false;
    }

    if (field === "visible" && nextValue === true) {
      nextAccess.read = true;
    }

    if (field === "assignable" && nextValue === true) {
      nextAccess.visible = true;
      nextAccess.read = true;
    }

    if (field === "write" && nextValue === true) {
      nextAccess.read = true;
    }

    onChange?.(nextAccess);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex items-start gap-3 rounded-2xl border border-white bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">
        <Switch
          checked={access.read === true}
          disabled={disabled}
          onCheckedChange={(checked) => patch("read", checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-black text-slate-950">View</span>
          <span className="block text-xs font-semibold text-slate-500">
            Let this member open this module.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-white bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">
        <Switch
          checked={access.write === true}
          disabled={disabled}
          onCheckedChange={(checked) => patch("write", checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-black text-slate-950">Edit</span>
          <span className="block text-xs font-semibold text-slate-500">
            Allow creating or changing records.
          </span>
        </span>
      </label>
    </div>
  );
}

function AssignableModuleAccessEditor({ value, onChange, disabled, labels = {} }) {
  const access = {
    ...buildDefaultModuleAccess(),
    ...value,
  };
  const copy = {
    visibleLabel: "Show",
    visibleDescription: "Display this member in module people views.",
    assignableLabel: "Assign",
    assignableDescription: "Allow records to target this person.",
    readLabel: "View",
    readDescription: "Let this member open this module.",
    writeLabel: "Edit",
    writeDescription: "Allow creating and changing records.",
    ...labels,
  };

  function patch(field, nextValue) {
    const nextAccess = {
      ...access,
      [field]: nextValue,
    };

    if (field === "read" && nextValue === false) {
      nextAccess.write = false;
      nextAccess.visible = false;
      nextAccess.assignable = false;
    }

    if (field === "visible" && nextValue === false) {
      nextAccess.assignable = false;
    }

    if (field === "assignable" && nextValue === true) {
      nextAccess.visible = true;
    }

    if (field === "write" && nextValue === true) {
      nextAccess.read = true;
    }

    onChange?.(nextAccess);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex items-start gap-3 rounded-2xl border border-white bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">
        <Switch
          checked={access.visible === true}
          disabled={disabled}
          onCheckedChange={(checked) => patch("visible", checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-black text-slate-950">{copy.visibleLabel}</span>
          <span className="block text-xs font-semibold text-slate-500">
            {copy.visibleDescription}
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-white bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">
        <Switch
          checked={access.assignable === true}
          disabled={disabled}
          onCheckedChange={(checked) => patch("assignable", checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-black text-slate-950">{copy.assignableLabel}</span>
          <span className="block text-xs font-semibold text-slate-500">
            {copy.assignableDescription}
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-white bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">
        <Switch
          checked={access.read === true}
          disabled={disabled}
          onCheckedChange={(checked) => patch("read", checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-black text-slate-950">{copy.readLabel}</span>
          <span className="block text-xs font-semibold text-slate-500">
            {copy.readDescription}
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-white bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">
        <Switch
          checked={access.write === true}
          disabled={disabled}
          onCheckedChange={(checked) => patch("write", checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-black text-slate-950">{copy.writeLabel}</span>
          <span className="block text-xs font-semibold text-slate-500">
            {copy.writeDescription}
          </span>
        </span>
      </label>
    </div>
  );
}

function ModulePermissionsPanel({ modules, onChange, disabled }) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2">
      <div className="mb-3">
        <p className="text-sm font-black text-slate-950">Module permissions</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          Separate home presence, assignability, viewing, and editing for this family space.
        </p>
      </div>

      <div className="space-y-5">
        {MODULE_ACCESS_GROUPS.map((group) => (
          <section key={group.id} className="space-y-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {group.label}
              </p>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
                {group.description}
              </p>
            </div>

            <div className="space-y-3">
              {group.moduleIds.map((moduleId) => {
                const config = MODULE_ACCESS_CONFIG_BY_ID.get(moduleId);
                if (!config) return null;

                const Icon = config.icon;
                const value = modules?.[config.id] || buildDefaultModuleAccess();

                return (
                  <div key={config.id} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-slate-950">{config.label}</span>
                        <span className="block text-xs font-semibold leading-5 text-slate-500">
                          {config.description}
                        </span>
                      </span>
                    </div>

                    {config.assignmentControls ? (
                      <AssignableModuleAccessEditor
                        value={value}
                        onChange={(nextAccess) => onChange?.(config.id, nextAccess)}
                        disabled={disabled}
                        labels={config.assignmentControls}
                      />
                    ) : (
                      <ModuleAccessEditor
                        value={value}
                        onChange={(nextAccess) => onChange?.(config.id, nextAccess)}
                        disabled={disabled}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ChildAssignmentPanel({ modules, onChange, disabled }) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2">
      <div>
        <p className="text-sm font-black text-slate-950">Assignments</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          Children do not need app permissions unless they receive a login later. These controls decide whether they show up as assignable people.
        </p>
      </div>

      <div className="space-y-3">
        {["calendar", "tasks"].map((moduleId) => {
          const config = MODULE_ACCESS_CONFIG_BY_ID.get(moduleId);
          const Icon = config.icon;
          const value = modules?.[moduleId] || buildDefaultModuleAccess({ visible: true, assignable: true });

          return (
            <div key={moduleId} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-950">{config.label}</span>
                  <span className="block text-xs font-semibold leading-5 text-slate-500">
                    {moduleId === "calendar"
                      ? "Show this child in calendar filters and allow event assignment."
                      : "Show this child on task boards and allow task assignment."}
                  </span>
                </span>
              </div>

              <AssignableModuleAccessEditor
                value={{
                  ...buildDefaultModuleAccess({ visible: true, assignable: true }),
                  ...value,
                }}
                onChange={(nextAccess) => onChange?.(moduleId, nextAccess)}
                disabled={disabled}
                labels={{
                  ...(config.assignmentControls || {}),
                  readLabel: "Open module",
                  readDescription: "Only matters if this child gets a login later.",
                  writeLabel: "Edit module",
                  writeDescription: "Usually off for child profiles.",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfileMemberEditorDialog({
  editor,
  onChange,
  onClose,
  onSave,
  saving = false,
  canManageAdminAccess = false,
}) {
  if (!editor) return null;

  const isAdd = editor.mode === "add";
  const isOwner = editor.source === "owner";
  const isChild = editor.source === "child" || editor.type === "child" || editor.role === "child";
  const normalizedModules = normalizeEditorModules(editor);
  const normalizedRole = isChild ? "child" : normalizeMemberRole(editor.role, isOwner ? "parent" : "caregiver");
  const roleMeta = getMemberRoleMeta(normalizedRole);
  const defaultLivesHere = isOwner || isChild || roleMeta?.livesHere === true;

  const safeEditor = {
    ...editor,
    name: editor.name || "",
    email: editor.email || "",
    role: normalizedRole,
    relationship: editor.relationship || editor.memberRelationship || editor.member_relationship || roleToRelationship(normalizedRole),
    type: isChild ? "child" : editor.type || editor.personType || editor.person_type || roleToPersonType(normalizedRole),
    color: editor.color || "teal",
    admin: !isChild && (editor.admin === true || editor.isAdmin === true || editor.is_admin === true),
    livesHere: booleanOrFallback(editor.livesHere ?? editor.lives_here, defaultLivesHere),
    showOnHomeDashboard: booleanOrFallback(
      editor.showOnHomeDashboard ?? editor.show_on_home_dashboard ?? editor.homeDashboard ?? editor.home_dashboard,
      defaultLivesHere
    ),
    modules: normalizedModules,
  };
  const receivesFullAccess = safeEditor.admin;
  const canToggleAdminAccess = !isOwner && !isChild && canManageAdminAccess === true;

  function patch(updates) {
    onChange?.({ ...safeEditor, ...updates });
  }

  function patchModuleAccess(moduleName, nextAccess) {
    const nextModules = {
      ...(safeEditor.modules || {}),
      [moduleName]: nextAccess,
    };

    if (moduleName === "lists") {
      nextModules.groceries = nextAccess;
    }

    patch({
      modules: nextModules,
    });
  }

  function patchHomePresence(nextPresence) {
    const nextModules = { ...(safeEditor.modules || {}) };

    if (nextPresence.showOnHomeDashboard === true) {
      nextModules.home = {
        ...buildDefaultModuleAccess(),
        ...(nextModules.home || {}),
        read: true,
      };
    }

    patch({
      ...nextPresence,
      lives_here: nextPresence.livesHere,
      show_on_home_dashboard: nextPresence.showOnHomeDashboard,
      modules: nextModules,
    });
  }

  function patchRole(nextRole) {
    if (isChild) return;

    const nextMeta = getMemberRoleMeta(nextRole);
    const nextLivesHere = nextMeta?.livesHere === true ? true : safeEditor.livesHere;

    patch({
      role: nextRole,
      relationship: roleToRelationship(nextRole),
      type: roleToPersonType(nextRole),
      livesHere: nextLivesHere,
      lives_here: nextLivesHere,
      showOnHomeDashboard: safeEditor.showOnHomeDashboard,
      show_on_home_dashboard: safeEditor.showOnHomeDashboard,
    });
  }

  function patchAdminAccess(checked) {
    if (!canToggleAdminAccess) return;

    const nextModules = checked ? normalizeEditorModules({ ...safeEditor, modules: safeEditor.modules }) : safeEditor.modules;
    patch({
      admin: checked,
      isAdmin: checked,
      is_admin: checked,
      appRole: checked ? "admin" : undefined,
      app_role: checked ? "admin" : undefined,
      modules: nextModules,
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="relative z-[10000] w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {isChild ? (isAdd ? "Add child" : "Edit child") : isAdd ? "Add family member" : "Edit family member"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {isChild
                ? "Manage child identity, home visibility, color, and assignment behavior."
                : "Manage grandparents, babysitters, caregivers, or family members for this private family space."}
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
              placeholder="Grandma Petra"
              className="mt-1"
            />
          </div>

          <div>
            <Label>{isChild ? "Login email (optional)" : "Email"}</Label>
            <Input
              value={safeEditor.email}
              onChange={(event) => patch({ email: event.target.value })}
              disabled={isOwner}
              placeholder={isChild ? "Only if this child will sign in later" : "name@example.com"}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Role</Label>
            <Select value={safeEditor.role} onValueChange={patchRole} disabled={isChild}>
              <SelectTrigger className="mt-1 h-10 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isChild && (
          <div className="flex items-end">
            <label className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm font-bold transition ${
              safeEditor.admin
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}>
              <span>
                Admin access
                <span className="block text-[11px] font-semibold opacity-70">
                  Full family controls
                </span>
              </span>
              <Switch
                checked={safeEditor.admin}
                onCheckedChange={patchAdminAccess}
                disabled={!canToggleAdminAccess}
              />
            </label>
            {!canToggleAdminAccess && !isOwner && (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Only the family owner can grant or remove admin access.
              </p>
            )}
          </div>
          )}

          <div className="md:col-span-2">
            <ColorPicker
              value={safeEditor.color}
              onChange={(color) => patch({ color })}
            />
          </div>

          {!isOwner && (
            <HouseholdPresenceEditor
              livesHere={safeEditor.livesHere}
              showOnHomeDashboard={safeEditor.showOnHomeDashboard}
              onChange={patchHomePresence}
              disabled={saving}
            />
          )}

          {isChild && (
            <ChildAssignmentPanel
              modules={safeEditor.modules}
              onChange={patchModuleAccess}
              disabled={saving}
            />
          )}

          {!isOwner && !isChild && !receivesFullAccess && (
            <ModulePermissionsPanel
              modules={safeEditor.modules}
              onChange={patchModuleAccess}
              disabled={saving}
            />
          )}

          {!isOwner && !isChild && receivesFullAccess && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 md:col-span-2">
              Admins receive full access to this family space.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSave?.(safeEditor)}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? "Saving..." : "Save member"}
          </Button>
        </div>
      </div>
    </div>
  );
}
