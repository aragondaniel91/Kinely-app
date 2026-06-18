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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  daily: { icon: Repeat, tone: "bg-violet-50 text-violet-700 ring-violet-100" },
  weekday: { icon: School, tone: "bg-sky-50 text-sky-700 ring-sky-100" },
  weekend: { icon: Sun, tone: "bg-amber-50 text-amber-700 ring-amber-100" },
  bedtime: { icon: Moon, tone: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  chore: { icon: Home, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  custom: { icon: Layers, tone: "bg-slate-50 text-slate-700 ring-slate-100" },
};

const categoryVisuals = {
  house: { icon: Home, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  school: { icon: School, tone: "bg-sky-50 text-sky-700 ring-sky-100" },
  personal: { icon: UserRound, tone: "bg-pink-50 text-pink-700 ring-pink-100" },
  work: { icon: Briefcase, tone: "bg-slate-50 text-slate-700 ring-slate-100" },
  family: { icon: Heart, tone: "bg-rose-50 text-rose-700 ring-rose-100" },
  other: { icon: MoreHorizontal, tone: "bg-violet-50 text-violet-700 ring-violet-100" },
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
  onDelete,
}) {
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
  const cancelledToday =
    runToday?.cancelled === true ||
    runToday?.canceled === true ||
    runToday?.status === "cancelled";
  const assignedName =
    template.assignedToPersonName ||
    template.assigned_to_person_name ||
    template.assignedToName ||
    template.assigned_to_name ||
    template.defaultPersonName ||
    template.default_person_name ||
    "Family";

  return (
    <div className="rounded-[1.65rem] border border-white/80 bg-white/86 p-3 shadow-[0_10px_24px_rgba(38,50,56,0.045)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-[0_14px_30px_rgba(38,50,56,0.06)]">
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
                "bg-emerald-50 text-emerald-700 ring-emerald-100"
              )}
            >
              Routine
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
                  cancelledToday
                    ? "bg-red-50 text-red-700 ring-red-100"
                    : skippedToday
                      ? "bg-slate-50 text-slate-600 ring-slate-100"
                      : hasRunToday
                        ? "bg-sky-50 text-sky-700 ring-sky-100"
                        : "bg-amber-50 text-amber-700 ring-amber-100"
                )}
              >
                {cancelledToday ? (
                  <XCircle className="h-3 w-3" />
                ) : skippedToday ? (
                  <XCircle className="h-3 w-3" />
                ) : hasRunToday ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {cancelledToday
                  ? "Cancelled today"
                  : skippedToday
                    ? "Skipped today"
                    : hasRunToday
                      ? "Tasks created today"
                      : "Ready for today"}
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

      <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-slate-100 pt-3">
        <>
            {isRecurring && autoGenerate && !hasRunToday && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRequestAction?.("skip", template)}
                  className="h-8 rounded-xl border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Skip today
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRequestAction?.("run", template)}
                  className="h-8 rounded-xl border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Generate today
                </Button>
              </>
            )}

            {isRecurring && autoGenerate && hasRunToday && (skippedToday || cancelledToday) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRequestAction?.("runAnyway", template)}
                className="h-8 rounded-xl border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Create anyway
              </Button>
            )}

            {isRecurring && autoGenerate && hasRunToday && !skippedToday && !cancelledToday && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRequestAction?.("cancel", template)}
                className="h-8 rounded-xl border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100 hover:text-red-800"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Cancel today
              </Button>
            )}

            {isRecurring && autoGenerate && hasRunToday && !skippedToday && !cancelledToday && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRequestAction?.("regenerate", template)}
                className="h-8 rounded-xl border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Recreate tasks
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => onEdit(template)}
              className="h-8 rounded-xl bg-white/90 px-3 text-xs font-black"
            >
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onDelete(template)}
              className="h-8 rounded-xl border-red-200 bg-red-50 px-3 text-xs font-black text-red-600 hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
        </>
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

  if (actionType === "cancel") {
    return {
      eyebrow: "Cancel today",
      title: `Cancel “${title}” for today?`,
      description:
        "This will hide today’s tasks created by this routine and mark this routine as cancelled for today.",
      confirmLabel: "Cancel today",
      tone: "red",
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
    copy.tone === "red"
      ? "bg-red-600 hover:bg-red-700"
      : copy.tone === "blue"
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
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
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
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
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
  onCancelRoutineToday,
  onSaved,
}) {
  const { familyId, user } = useFamily();

  const familyTemplates = useMemo(() => templates, [templates]);

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
        title,
        description: draft.description.trim(),
        type: draft.type,
        category: draft.category,
        recurrence: draft.recurrence || "manual",
        repeat: draft.recurrence || "manual",
        autoGenerate: draft.recurrence !== "manual" && Boolean(draft.autoGenerate),

        assignedToPersonId: selectedAssignee?.id || "family",
        defaultPersonId: selectedAssignee?.id || "family",
        assignedToPersonName: selectedAssignee?.name || "Family",
        defaultPersonName: selectedAssignee?.name || "Family",
        assignedRoleType: selectedAssignee?.roleType || selectedAssignee?.role || "family",
        childId:
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
      } else if (pendingRoutineAction.type === "cancel") {
        await onCancelRoutineToday?.(pendingRoutineAction.template);
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

              <DialogDescription className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                {isEditor
                  ? "Create or update a reusable routine for your family."
                  : isDelete
                    ? "Confirm before removing this custom routine."
                    : "Create and manage your family's reusable routines."}
              </DialogDescription>
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
              <div className="rounded-[1.75rem] border border-white/75 bg-white/70 p-4 shadow-[0_10px_24px_rgba(38,50,56,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                      Your routines
                    </p>

                    <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                      Family-built routines
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Custom routines can be edited, scheduled, or used today.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={startNewRoutine}
                    disabled={saving}
                    className="h-11 rounded-2xl font-black"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    New routine
                  </Button>
                </div>
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
                      onDelete={requestDeleteRoutine}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/60 p-8 text-center shadow-[0_10px_24px_rgba(38,50,56,0.035)]">
                  <p className="text-lg font-black text-slate-950">
                    No custom routines yet
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Create one from scratch when your family is ready.
                  </p>
                </div>
              )}
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
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to routines
              </Button>

              <div className="space-y-4">
                <section className="rounded-[1.75rem] border border-slate-100 bg-slate-50/75 p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                        Routine basics
                      </p>
                      <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                        Name and describe it
                      </h3>
                    </div>

                    <div className={cn("hidden h-11 w-11 items-center justify-center rounded-2xl ring-1 sm:flex", getRoutineVisual(draft.type).tone)}>
                      {React.createElement(getRoutineVisual(draft.type).icon, {
                        className: "h-5 w-5",
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div>
                      <Label htmlFor="routine-template-title">Routine title</Label>
                      <Input
                        id="routine-template-title"
                        name="routine-template-title"
                        value={draft.title}
                        onChange={(event) => patchDraft({ title: event.target.value })}
                        placeholder="Example: Saturday chores"
                        className="mt-1 h-11 rounded-2xl bg-white font-black"
                      />
                    </div>

                    <div>
                      <Label htmlFor="routine-template-description">Description</Label>
                      <Input
                        id="routine-template-description"
                        name="routine-template-description"
                        value={draft.description}
                        onChange={(event) => patchDraft({ description: event.target.value })}
                        placeholder="Short description"
                        className="mt-1 h-11 rounded-2xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label htmlFor="routine-template-type">Type</Label>
                      <Select value={draft.type} onValueChange={(nextValue) => patchDraft({ type: nextValue })}>
                        <SelectTrigger id="routine-template-type" className="mt-1 h-11 rounded-2xl border-slate-200 bg-white text-sm font-black text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="routine-template-category">Category</Label>
                      <Select value={draft.category} onValueChange={(nextValue) => patchDraft({ category: nextValue })}>
                        <SelectTrigger id="routine-template-category" className="mt-1 h-11 rounded-2xl border-slate-200 bg-white text-sm font-black text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_CREATE_CATEGORY_OPTIONS.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="routine-template-priority">Priority</Label>
                      <Select value={draft.defaultPriority} onValueChange={(nextValue) => patchDraft({ defaultPriority: nextValue })}>
                        <SelectTrigger id="routine-template-priority" className="mt-1 h-11 rounded-2xl border-slate-200 bg-white text-sm font-black text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_PRIORITY_OPTIONS.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-slate-100 bg-slate-50/75 p-4 sm:p-5">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                      Routine behavior
                    </p>
                    <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                      Decide when and who
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="routine-template-recurrence">Repeats</Label>
                      <Select
                        value={draft.recurrence}
                        onValueChange={(recurrence) =>
                          patchDraft({
                            recurrence,
                            autoGenerate: recurrence === "manual" ? false : draft.autoGenerate,
                          })
                        }
                      >
                        <SelectTrigger id="routine-template-recurrence" className="mt-1 h-11 rounded-2xl border-slate-200 bg-white text-sm font-black text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRENCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="routine-template-assignee">Default assignee</Label>
                      <Select value={draft.assignedToPersonId} onValueChange={(nextValue) => patchDraft({ assignedToPersonId: nextValue })}>
                        <SelectTrigger id="routine-template-assignee" className="mt-1 h-11 rounded-2xl border-slate-200 bg-white text-sm font-black text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assigneeOptions.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                          ? "Manual routines only run when you apply them."
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
                </section>

                <section className="rounded-[1.75rem] border border-slate-100 bg-slate-50/75 p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                        Task list
                      </p>
                      <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                        One task per line
                      </h3>
                    </div>

                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-accent">
                      {parsedTasks.length} task{parsedTasks.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <Textarea
                    value={draft.taskLines}
                    onChange={(event) => patchDraft({ taskLines: event.target.value })}
                    placeholder={"Make bed\nClean room\nLaundry in basket"}
                    className="min-h-[160px] rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700 focus-visible:ring-ring"
                  />

                  <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-500 ring-1 ring-slate-100">
                    These tasks will use the selected category, priority, default assignee, and reward eligibility.
                  </div>
                </section>

                {parsedTasks.length > 0 && (
                  <section className="rounded-[1.75rem] border border-accent/10 bg-accent/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                      Preview
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {parsedTasks.slice(0, 6).map((task, index) => {
                        const visual = getCategoryVisual(task.category);

                        return (
                          <div
                            key={`${task.title}-${index}`}
                            className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-black text-slate-700 ring-1 ring-white"
                          >
                            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ring-1", visual.tone)}>
                              {React.createElement(visual.icon, {
                                className: "h-3.5 w-3.5",
                              })}
                            </span>
                            <span className="truncate">{task.title}</span>
                          </div>
                        );
                      })}
                    </div>

                    {parsedTasks.length > 6 && (
                      <p className="mt-2 text-xs font-black text-accent">
                        +{parsedTasks.length - 6} more tasks
                      </p>
                    )}
                  </section>
                )}
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
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
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
                <Save className="mr-1.5 h-3.5 w-3.5" />
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
