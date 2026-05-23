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
  Copy,
  Edit3,
  Layers,
  Plus,
  Save,
  Trash2,
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

function getEmptyDraft() {
  return {
    id: "",
    title: "",
    description: "",
    type: "custom",
    category: "house",
    defaultPriority: "medium",
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
    taskLines: tasksToLines(template.tasks || []),
    mode: clone ? "copy" : "edit",
  };
}

function RoutineCard({ template, onEdit, onCopy, onDelete }) {
  const isStarter = template.source === "starter";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-slate-700">
          <Layers className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-slate-950">
            {template.title}
          </p>

          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
            {template.description || "Reusable family routine."}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
              {template.type || "custom"}
            </span>

            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-accent">
              {(template.tasks || []).length} tasks
            </span>

            {isStarter && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">
                starter
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {isStarter ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(template)}
            className="h-10 rounded-2xl font-black"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onEdit(template)}
              className="h-10 rounded-2xl font-black"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onDelete(template)}
              className="h-10 rounded-2xl border-red-200 bg-red-50 font-black text-red-600 hover:bg-red-100 hover:text-red-700"
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsedTasks = parseTaskLines(
    draft.taskLines,
    draft.category,
    draft.defaultPriority,
    draft.type
  );

  function resetToList() {
    setError("");
    setSaving(false);
    setTemplateToDelete(null);
    setDraft(getEmptyDraft());
    setView("list");
  }

  function startNewRoutine() {
    setError("");
    setTemplateToDelete(null);
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
        <DialogHeader className="shrink-0 border-b bg-gradient-to-br from-white via-secondary/35 to-accent/10 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
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
                      onEdit={startEditRoutine}
                      onCopy={startCopyRoutine}
                      onDelete={requestDeleteRoutine}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
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

              <div className="rounded-[2rem] border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
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

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                </div>

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

        <DialogFooter className="shrink-0 bg-white/95 px-4 pb-4 pt-2 sm:px-5">
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
