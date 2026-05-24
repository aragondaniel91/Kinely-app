import React, { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Briefcase,
  Clock,
  Copy,
  Edit3,
  Flag,
  Heart,
  Home,
  Layers,
  Moon,
  MoreHorizontal,
  Plus,
  Repeat,
  RotateCcw,
  Save,
  School,
  Sun,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import {
  TASK_CREATE_CATEGORY_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  getDefaultTaskIcon,
} from "@/features/tasks/utils/taskDialogOptions";

const TEMPLATE_TYPE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekday", label: "Weekday" },
  { value: "weekend", label: "Weekend" },
  { value: "bedtime", label: "Bedtime" },
  { value: "chore", label: "Chore" },
  { value: "custom", label: "Custom" },
];

const RECURRENCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
];

const routineVisuals = {
  daily: { icon: Repeat, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  weekday: { icon: School, tone: "bg-violet-50 text-violet-700 ring-violet-100" },
  weekend: { icon: Sun, tone: "bg-amber-50 text-amber-700 ring-amber-100" },
  bedtime: { icon: Moon, tone: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  chore: { icon: Home, tone: "bg-blue-50 text-blue-700 ring-blue-100" },
  custom: { icon: Layers, tone: "bg-slate-50 text-slate-700 ring-slate-100" },
};

const categoryVisuals = {
  house: { icon: Home, tone: "bg-blue-50 text-blue-700 ring-blue-100" },
  school: { icon: School, tone: "bg-violet-50 text-violet-700 ring-violet-100" },
  personal: { icon: UserRound, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  work: { icon: Briefcase, tone: "bg-slate-100 text-slate-700 ring-slate-200" },
  family: { icon: Heart, tone: "bg-rose-50 text-rose-700 ring-rose-100" },
  other: { icon: MoreHorizontal, tone: "bg-amber-50 text-amber-700 ring-amber-100" },
};

function getRoutineVisual(type = "custom") {
  return routineVisuals[type] || routineVisuals.custom;
}

function getCategoryVisual(category = "other") {
  return categoryVisuals[category] || categoryVisuals.other;
}

function getPriorityTone(priority = "medium") {
  if (priority === "high") return "bg-red-50 text-red-700 ring-red-100";
  if (priority === "low") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function getDefaultRecurrenceForTemplate(template, { clone = false } = {}) {
  const explicitRecurrence = template.recurrence || template.repeat;

  if (explicitRecurrence && explicitRecurrence !== "manual") {
    return explicitRecurrence;
  }

  if (!clone) return explicitRecurrence || "manual";

  const type = template.type || "custom";

  if (type === "weekday") return "weekdays";
  if (type === "weekend") return "weekends";
  if (["daily", "bedtime", "chore"].includes(type)) return "daily";

  return "manual";
}

function getEmptyDraft() {
  return {
    id: "",
    title: "",
    description: "",
    type: "custom",
    category: "house",
    defaultPriority: "medium",
    recurrence: "manual",
    autoGenerate: false,
    assignedToPersonId: "family",
    taskLines: "",
    mode: "new",
  };
}

function tasksToLines(tasks = []) {
  return tasks
    .map((task) => task.title)
    .filter(Boolean)
    .join("\n");
}

function parseTaskLines(taskLines = "", category = "house", priority = "medium", type = "custom") {
  return String(taskLines)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((title) => ({
      title,
      category,
      priority,
      icon: getDefaultTaskIcon(category),
      rewardEligible: true,
      reward_eligible: true,
      chore: type === "chore",
      isChore: type === "chore",
      is_chore: type === "chore",
    }));
}

function buildDraftFromTemplate(template, { clone = false } = {}) {
  return {
    id: clone ? "" : template.id || "",
    title: clone ? `${template.title || "Routine"} copy` : template.title || "",
    description: template.description || "",
    type: template.type || "custom",
    category: template.category || "house",
    defaultPriority: template.tasks?.[0]?.priority || "medium",
    recurrence: getDefaultRecurrenceForTemplate(template, { clone }),
    autoGenerate: clone ? false : Boolean(template.autoGenerate || template.auto_generate),
    assignedToPersonId:
      template.assignedToPersonId ||
      template.assigned_to_person_id ||
      template.defaultPersonId ||
      template.default_person_id ||
      "family",
    taskLines: tasksToLines(template.tasks || []),
    mode: clone ? "copy" : "edit",
  };
}

function RoutineCard({
  template,
  runToday = null,
  hasRunToday = false,
  canWrite = false,
  onRequestAction,
  onEdit,
  onCopy,
  onDelete,
}) {
  const isStarter = template.source === "starter";
  const routineVisual = getRoutineVisual(template.type);
  const RoutineIcon = routineVisual.icon;
  const categoryVisual = getCategoryVisual(template.category);
  const CategoryIcon = categoryVisual.icon;
  const priority = template.tasks?.[0]?.priority || "medium";
  const taskCount = (template.tasks || []).length;
  const recurrence = template.recurrence || template.repeat || "manual";
  const isRecurring = recurrence !== "manual";
  const autoGenerate = Boolean(template.autoGenerate || template.auto_generate);
  const skippedToday = runToday?.skipped === true || runToday?.status === "skipped";
  const assignedName =
    template.assignedToName ||
    template.assigned_to_name ||
    template.defaultPersonName ||
    template.default_person_name ||
    "Family";

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1", routineVisual.tone)}>
          <RoutineIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-black text-slate-950">
              {template.title}
            </p>

            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ring-1",
                isStarter
                  ? "bg-blue-50 text-blue-700 ring-blue-100"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-100"
              )}
            >
              {isStarter ? "Starter" : "Mine"}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
            {template.description || "Reusable family routine."}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1", routineVisual.tone)}>
              <RoutineIcon className="h-3 w-3" />
              {template.type || "custom"}
            </span>

            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1", categoryVisual.tone)}>
              <CategoryIcon className="h-3 w-3" />
              {template.category || "other"}
            </span>

            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1", getPriorityTone(priority))}>
              <Flag className="h-3 w-3" />
              {priority}
            </span>

            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-purple-700 ring-1 ring-purple-100">
              {recurrence}
            </span>

            {isRecurring && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1",
                  autoGenerate
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : "bg-slate-50 text-slate-600 ring-slate-100"
                )}
              >
                {autoGenerate ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {autoGenerate ? "Auto on" : "Auto off"}
              </span>
            )}

            {isRecurring && autoGenerate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1",
                  skippedToday
                    ? "bg-slate-50 text-slate-600 ring-slate-100"
                    : hasRunToday
                      ? "bg-blue-50 text-blue-700 ring-blue-100"
                      : "bg-amber-50 text-amber-700 ring-amber-100"
                )}
              >
                {skippedToday ? (
                  <XCircle className="h-3 w-3" />
                ) : hasRunToday ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {skippedToday ? "Skipped today" : hasRunToday ? "Tasks created today" : "Ready for today"}
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-100">
              <Users className="h-3 w-3" />
              {assignedName}
            </span>

            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-accent">
              {taskCount} tasks
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {isStarter ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(template)}
            className="h-9 rounded-2xl bg-white font-black"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        ) : (
          <>
            {isRecurring && autoGenerate && !hasRunToday && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRequestAction?.("skip", template)}
                  className="h-9 rounded-2xl border-slate-200 bg-slate-50 font-black text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Skip today
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRequestAction?.("run", template)}
                  className="h-9 rounded-2xl border-emerald-200 bg-emerald-50 font-black text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Generate today
                </Button>
              </>
            )}

            {isRecurring && autoGenerate && hasRunToday && skippedToday && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRequestAction?.("runAnyway", template)}
                className="h-9 rounded-2xl border-amber-200 bg-amber-50 font-black text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Create anyway
              </Button>
            )}

            {isRecurring && autoGenerate && hasRunToday && !skippedToday && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRequestAction?.("regenerate", template)}
                className="h-9 rounded-2xl border-blue-200 bg-blue-50 font-black text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Recreate tasks
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => onEdit(template)}
              className="h-9 rounded-2xl bg-white"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onDelete(template)}
              className="h-9 rounded-2xl border-red-200 bg-red-50 font-black text-red-600 hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function getRoutineActionCopy(actionType, template) {
  const title = template?.title || "this routine";

  if (actionType === "skip") {
    return {
      eyebrow: "Skip today",
      title: `Skip “${title}” today?`,
      description:
        "This routine will not generate tasks today. It will still be available for future matching days.",
      confirmLabel: "Skip today",
      tone: "slate",
    };
  }

  if (actionType === "regenerate") {
    return {
      eyebrow: "Recreate tasks today",
      title: `Recreate tasks “${title}”?`,
      description:
        "This will create another set of today's tasks. Use this only if the original tasks were deleted or need to be recreated.",
      confirmLabel: "Recreate tasks",
      tone: "blue",
    };
  }

  if (actionType === "runAnyway") {
    return {
      eyebrow: "Create skipped routine",
      title: `Create “${title}” anyway?`,
      description:
        "This routine was skipped today. Creating anyway will add today's tasks.",
      confirmLabel: "Create anyway",
      tone: "amber",
    };
  }

  return {
    eyebrow: "Generate today",
    title: `Create “${title}” today?`,
    description:
      "This will create today's tasks from this routine.",
    confirmLabel: "Generate today",
    tone: "emerald",
  };
}

function RoutineActionConfirmPanel({ action, saving, onCancel, onConfirm }) {
  if (!action) return null;

  const copy = getRoutineActionCopy(action.type, action.template);

  const buttonClass =
    copy.tone === "blue"
      ? "bg-blue-600 hover:bg-blue-700"
      : copy.tone === "amber"
        ? "bg-amber-600 hover:bg-amber-700"
        : copy.tone === "slate"
          ? "bg-slate-700 hover:bg-slate-800"
          : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {copy.eyebrow}
        </p>

        <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
          {copy.title}
        </h3>

        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          {copy.description}
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="rounded-2xl font-black"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className={cn("rounded-2xl font-black text-white", buttonClass)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {saving ? "Working..." : copy.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteRoutinePanel({ template, saving, onCancel, onConfirm }) {
  return (
    <div className="rounded-[2rem] border border-red-100 bg-red-50/70 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
        Delete routine
      </p>

      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        Delete “{template.title}”?
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-red-700">
        This removes the custom routine from your family templates. Existing tasks already created from it will stay on the board.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="rounded-2xl font-black"
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="rounded-2xl bg-red-600 font-black text-white hover:bg-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {saving ? "Deleting..." : "Delete routine"}
        </Button>
      </div>
    </div>
  );
}

export default function ManageTaskTemplatesDialog({
  open,
  onOpenChange,
  templates = [],
  people = [],
  routineRuns = [],
  canWrite = false,
  onSkipRoutineToday,
  onRegenerateRoutineToday,
  onSaved,
}) {
  const { familyId, user } = useFamily();

  const familyTemplates = useMemo(
    () => templates.filter((template) => template.source !== "starter"),
    [templates]
  );

  const starterTemplates = useMemo(
    () => templates.filter((template) => template.source === "starter"),
    [templates]
  );

  const [view, setView] = useState("list");
  const [draft, setDraft] = useState(getEmptyDraft());
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [pendingRoutineAction, setPendingRoutineAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsedTasks = parseTaskLines(
    draft.taskLines,
    draft.category,
    draft.defaultPriority,
    draft.type
  );

  const assigneeOptions = useMemo(() => {
    const basePeople = Array.isArray(people) ? people : [];

    if (basePeople.some((person) => person.id === "family")) {
      return basePeople;
    }

    return [
      {
        id: "family",
        name: "Family",
        role: "Together",
        roleType: "family",
        childId: "",
      },
      ...basePeople,
    ];
  }, [people]);

  const selectedAssignee =
    assigneeOptions.find((person) => person.id === draft.assignedToPersonId) ||
    assigneeOptions.find((person) => person.id === "family") ||
    assigneeOptions[0];

  const runByTemplateId = useMemo(() => {
    const map = new Map();

    (Array.isArray(routineRuns) ? routineRuns : []).forEach((run) => {
      const templateId = run.templateId || run.template_id;
      if (templateId) map.set(templateId, run);
    });

    return map;
  }, [routineRuns]);

  function resetToList() {
    setError("");
    setSaving(false);
    setTemplateToDelete(null);
    setPendingRoutineAction(null);
    setDraft(getEmptyDraft());
    setView("list");
  }

  function startNewRoutine() {
    setError("");
    setTemplateToDelete(null);
    setPendingRoutineAction(null);
    setDraft(getEmptyDraft());
    setView("editor");
  }

  function startEditRoutine(template) {
    setError("");
    setTemplateToDelete(null);
    setDraft(buildDraftFromTemplate(template));
    setView("editor");
  }

  function startCopyRoutine(template) {
    setError("");
    setTemplateToDelete(null);
    setDraft(buildDraftFromTemplate(template, { clone: true }));
    setView("editor");
  }

  function patchDraft(updates) {
    setError("");
    setDraft((current) => ({ ...current, ...updates }));
  }

  function requestDeleteRoutine(template) {
    setError("");
    setTemplateToDelete(template);
    setView("delete");
  }

  async function saveRoutine() {
    if (!familyId || saving) return;

    const title = draft.title.trim();

    if (!title) {
      setError("Please enter a routine title.");
      return;
    }

    if (!parsedTasks.length) {
      setError("Please add at least one task.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        familyId,
        family_id: familyId,
        title,
        description: draft.description.trim(),
        type: draft.type,
        category: draft.category,
        recurrence: draft.recurrence || "manual",
        repeat: draft.recurrence || "manual",
        autoGenerate: draft.recurrence !== "manual" && Boolean(draft.autoGenerate),
        auto_generate: draft.recurrence !== "manual" && Boolean(draft.autoGenerate),

        assignedToPersonId: selectedAssignee?.id || "family",
        assigned_to_person_id: selectedAssignee?.id || "family",
        defaultPersonId: selectedAssignee?.id || "family",
        default_person_id: selectedAssignee?.id || "family",
        assignedToName: selectedAssignee?.name || "Family",
        assigned_to_name: selectedAssignee?.name || "Family",
        defaultPersonName: selectedAssignee?.name || "Family",
        default_person_name: selectedAssignee?.name || "Family",
        assignedRoleType: selectedAssignee?.roleType || selectedAssignee?.role || "family",
        assigned_role_type: selectedAssignee?.roleType || selectedAssignee?.role || "family",
        childId:
          selectedAssignee?.roleType === "child"
            ? selectedAssignee.childId || selectedAssignee.id
            : "",
        child_id:
          selectedAssignee?.roleType === "child"
            ? selectedAssignee.childId || selectedAssignee.id
            : "",

        icon: getDefaultTaskIcon(draft.category),
        active: true,
        tasks: parsedTasks,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      };

      if (draft.id) {
        await updateDoc(doc(db, TASK_COLLECTIONS.templates, draft.id), payload);
      } else {
        await addDoc(collection(db, TASK_COLLECTIONS.templates), {
          ...payload,
          createdAt: serverTimestamp(),
          created_date: new Date().toISOString(),
          createdBy: user?.uid || null,
        });
      }

      await onSaved?.();
      resetToList();
    } catch (err) {
      console.error("Error saving routine:", err);
      setError(err?.message || "There was an error saving the routine.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteRoutine() {
    if (!templateToDelete?.id || saving) return;

    setSaving(true);
    setError("");

    try {
      await updateDoc(doc(db, TASK_COLLECTIONS.templates, templateToDelete.id), {
        active: false,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      await onSaved?.();
      resetToList();
    } catch (err) {
      console.error("Error deleting routine:", err);
      setError(err?.message || "There was an error deleting the routine.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRoutineAction() {
    if (!pendingRoutineAction || saving) return;

    setSaving(true);
    setError("");

    try {
      if (pendingRoutineAction.type === "skip") {
        await onSkipRoutineToday?.(pendingRoutineAction.template);
      } else {
        await onRegenerateRoutineToday?.(pendingRoutineAction.template);
      }

      setPendingRoutineAction(null);
    } catch (err) {
      console.error("Error running routine action:", err);
      setError(err?.message || "There was an error running this routine action.");
    } finally {
      setSaving(false);
    }
  }

  const isEditor = view === "editor";
  const isDelete = view === "delete";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) return;

        if (!nextOpen) {
          resetToList();
        }

        onOpenChange?.(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0 bg-gradient-to-br from-white via-secondary/20 to-accent/5 px-4 pb-3 pt-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/15">
              <Layers className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Routine manager
              </p>

              <DialogTitle className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {isEditor ? (draft.id ? "Edit routine" : "New routine") : isDelete ? "Delete routine" : "Manage routines"}
              </DialogTitle>

              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                {isEditor
                  ? "Create or update a reusable routine for your family."
                  : isDelete
                    ? "Confirm before removing this custom routine."
                    : "Create custom routines or copy starter routines."}
              </p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-4 mt-4 flex shrink-0 items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 sm:mx-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {view === "list" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Your routines
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Custom routines can be edited or deleted.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={startNewRoutine}
                  disabled={saving}
                  className="h-11 rounded-2xl font-black"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New routine
                </Button>
              </div>

              {familyTemplates.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {familyTemplates.map((template) => (
                    <RoutineCard
                      key={template.id}
                      template={template}
                      runToday={runByTemplateId.get(template.id)}
                      hasRunToday={runByTemplateId.has(template.id)}
                      canWrite={canWrite}
                      onRequestAction={(type, template) =>
                        setPendingRoutineAction({ type, template })
                      }
                      onEdit={startEditRoutine}
                      onCopy={startCopyRoutine}
                      onDelete={requestDeleteRoutine}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/75 p-8 text-center">
                  <p className="text-lg font-black text-slate-950">
                    No custom routines yet
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Create one from scratch or copy a starter routine.
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Starter routines
                </h3>
                <p className="text-sm font-semibold text-slate-500">
                  Starters are built into the app. Copy one to customize it.
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {starterTemplates.map((template) => (
                    <RoutineCard
                      key={template.id}
                      template={template}
                      runToday={runByTemplateId.get(template.id)}
                      hasRunToday={runByTemplateId.has(template.id)}
                      canWrite={canWrite}
                      onRequestAction={(type, template) =>
                        setPendingRoutineAction({ type, template })
                      }
                      onEdit={startEditRoutine}
                      onCopy={startCopyRoutine}
                      onDelete={requestDeleteRoutine}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === "editor" && (
            <div className="mx-auto max-w-2xl space-y-4">
              <Button
                type="button"
                variant="ghost"
                onClick={resetToList}
                disabled={saving}
                className="rounded-2xl px-0 font-black text-slate-500 hover:bg-transparent hover:text-slate-950"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to routines
              </Button>

              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/75 p-4 sm:p-5">
                <div>
                  <Label>Routine title</Label>
                  <Input
                    value={draft.title}
                    onChange={(event) => patchDraft({ title: event.target.value })}
                    placeholder="Example: Saturday chores"
                    className="mt-1 h-11 rounded-2xl bg-white"
                  />
                </div>

                <div className="mt-4">
                  <Label>Description</Label>
                  <Input
                    value={draft.description}
                    onChange={(event) => patchDraft({ description: event.target.value })}
                    placeholder="Short description"
                    className="mt-1 h-11 rounded-2xl bg-white"
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <Label>Type</Label>
                    <select
                      value={draft.type}
                      onChange={(event) => patchDraft({ type: event.target.value })}
                      className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
                    >
                      {TEMPLATE_TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <select
                      value={draft.category}
                      onChange={(event) => patchDraft({ category: event.target.value })}
                      className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
                    >
                      {TASK_CREATE_CATEGORY_OPTIONS.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <select
                      value={draft.defaultPriority}
                      onChange={(event) => patchDraft({ defaultPriority: event.target.value })}
                      className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
                    >
                      {TASK_PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Repeats</Label>
                    <select
                      value={draft.recurrence}
                      onChange={(event) => {
                        const recurrence = event.target.value;
                        patchDraft({
                          recurrence,
                          autoGenerate: recurrence === "manual" ? false : draft.autoGenerate,
                        });
                      }}
                      className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
                    >
                      {RECURRENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Default assignee</Label>
                    <select
                      value={draft.assignedToPersonId}
                      onChange={(event) => patchDraft({ assignedToPersonId: event.target.value })}
                      className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
                    >
                      {assigneeOptions.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-500 ring-1 ring-slate-100">
                  Repeats controls future auto-generation. Default assignee decides who receives generated tasks. Manual routines only run when you apply them.
                </div>

                <button
                  type="button"
                  onClick={() =>
                    patchDraft({
                      autoGenerate:
                        draft.recurrence !== "manual" ? !draft.autoGenerate : false,
                    })
                  }
                  disabled={draft.recurrence === "manual"}
                  className={cn(
                    "mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                    draft.recurrence !== "manual" && draft.autoGenerate
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600",
                    draft.recurrence === "manual" && "cursor-not-allowed opacity-60"
                  )}
                >
                  <div>
                    <p className="text-sm font-black">
                      Auto-generate this routine
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      {draft.recurrence === "manual"
                        ? "Manual routines do not auto-generate."
                        : "When enabled, this routine creates tasks automatically on matching days."}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
                      draft.recurrence !== "manual" && draft.autoGenerate
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {draft.recurrence !== "manual" && draft.autoGenerate ? "On" : "Off"}
                  </span>
                </button>

                <div className="mt-4">
                  <Label>Tasks</Label>
                  <textarea
                    value={draft.taskLines}
                    onChange={(event) => patchDraft({ taskLines: event.target.value })}
                    placeholder={"One task per line\nMake bed\nClean room\nLaundry in basket"}
                    className="mt-1 min-h-[170px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {parsedTasks.length} task{parsedTasks.length === 1 ? "" : "s"} in this routine.
                  </p>
                </div>
              </div>
            </div>
          )}

          {view === "delete" && templateToDelete && (
            <div className="mx-auto max-w-xl">
              <Button
                type="button"
                variant="ghost"
                onClick={resetToList}
                disabled={saving}
                className="mb-4 rounded-2xl px-0 font-black text-slate-500 hover:bg-transparent hover:text-slate-950"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to routines
              </Button>

              <DeleteRoutinePanel
                template={templateToDelete}
                saving={saving}
                onCancel={resetToList}
                onConfirm={confirmDeleteRoutine}
              />
            </div>
          )}
        </div>

        <RoutineActionConfirmPanel
          action={pendingRoutineAction}
          saving={saving}
          onCancel={() => setPendingRoutineAction(null)}
          onConfirm={confirmRoutineAction}
        />

        <DialogFooter className="shrink-0 bg-transparent px-4 pb-4 pt-1 sm:px-5">
          {view === "list" ? (
            <Button
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={saving}
              className="rounded-2xl font-black"
            >
              Close
            </Button>
          ) : view === "editor" ? (
            <>
              <Button
                variant="outline"
                onClick={resetToList}
                disabled={saving}
                className="rounded-2xl font-black"
              >
                Cancel
              </Button>

              <Button
                onClick={saveRoutine}
                disabled={saving || !familyId}
                className="rounded-2xl font-black"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : draft.id ? "Save changes" : "Save routine"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={resetToList}
              disabled={saving}
              className="rounded-2xl font-black"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
