import React, { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { AlertCircle, Copy, Edit3, Layers, Plus, Save, Trash2, X } from "lucide-react";

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
      chore: type === "chore",
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
  };
}

function TemplateListItem({ template, active, onEdit, onClone, onDelete }) {
  const isStarter = template.source === "starter";

  return (
    <div
      className={cn(
        "rounded-3xl border p-4 transition",
        active
          ? "border-primary/25 bg-primary/5 ring-4 ring-primary/5"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => (isStarter ? onClone(template) : onEdit(template))}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-base font-black text-slate-950">
            {template.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
            {template.description || "Reusable family routine."}
          </p>
        </button>

        <div className="flex shrink-0 gap-1">
          {isStarter ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => onClone(template)}
              className="h-9 w-9 rounded-full"
              title="Use as starting point"
            >
              <Copy className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => onEdit(template)}
              className="h-9 w-9 rounded-full"
              title="Edit routine"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => onDelete(template)}
            disabled={isStarter}
            className="h-9 w-9 rounded-full border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-40"
            title={isStarter ? "Starter routines cannot be deleted" : "Delete routine"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

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

  const [draft, setDraft] = useState(getEmptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsedTasks = parseTaskLines(
    draft.taskLines,
    draft.category,
    draft.defaultPriority,
    draft.type
  );

  function patch(updates) {
    setError("");
    setDraft((current) => ({ ...current, ...updates }));
  }

  function startNew() {
    setError("");
    setDraft(getEmptyDraft());
  }

  function editTemplate(template) {
    setError("");
    setDraft(buildDraftFromTemplate(template));
  }

  function cloneTemplate(template) {
    setError("");
    setDraft(buildDraftFromTemplate(template, { clone: true }));
  }

  async function saveTemplate() {
    if (!familyId || saving) return;

    const title = draft.title.trim();
    const tasks = parsedTasks;

    if (!title) {
      setError("Please enter a routine title.");
      return;
    }

    if (!tasks.length) {
      setError("Please add at least one task.");
      return;
    }

    setError("");

    setSaving(true);

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
        tasks,
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
      setDraft(getEmptyDraft());
    } catch (error) {
      console.error("Error saving routine:", error);
      setError(error?.message || "There was an error saving the routine.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(template) {
    if (!template?.id || template.source === "starter" || saving) return;

    const confirmed = window.confirm(`Delete "${template.title}" routine?`);
    if (!confirmed) return;

    setSaving(true);

    try {
      await updateDoc(doc(db, TASK_COLLECTIONS.templates, template.id), {
        active: false,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      await onSaved?.();

      if (draft.id === template.id) {
        setDraft(getEmptyDraft());
      }
    } catch (error) {
      console.error("Error deleting routine:", error);
      setError(error?.message || "There was an error deleting the routine.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange?.(nextOpen)}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden rounded-[2.25rem] border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b bg-gradient-to-br from-white via-secondary/35 to-accent/10 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Layers className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Routine manager
              </p>

              <DialogTitle className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                Manage routines
              </DialogTitle>

              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                Create reusable routines and chores, or copy a starter routine and customize it.
              </p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-5 mt-5 flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid max-h-[calc(92vh-155px)] gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label>Your routines</Label>

              <Button
                type="button"
                variant="outline"
                onClick={startNew}
                className="rounded-2xl font-black"
              >
                <Plus className="mr-2 h-4 w-4" />
                New routine
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {familyTemplates.length > 0 ? (
                familyTemplates.map((template) => (
                  <TemplateListItem
                    key={template.id}
                    template={template}
                    active={draft.id === template.id}
                    onEdit={editTemplate}
                    onClone={cloneTemplate}
                    onDelete={deleteTemplate}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center md:col-span-2">
                  <p className="text-lg font-black text-slate-950">
                    No custom routines yet
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Start from scratch or copy a starter routine below.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5">
              <Label>Starter routines</Label>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Click a starter or the copy icon to load it into the editor.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {starterTemplates.map((template) => (
                  <TemplateListItem
                    key={template.id}
                    template={template}
                    active={false}
                    onEdit={editTemplate}
                    onClone={cloneTemplate}
                    onDelete={deleteTemplate}
                  />
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4 rounded-[2rem] border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Editor
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {draft.id ? "Edit routine" : "New routine"}
                </h3>
              </div>

              {(draft.id || draft.title || draft.taskLines) && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={startNew}
                  className="h-9 w-9 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div>
              <Label>Routine title</Label>
              <Input
                value={draft.title}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="Example: Saturday chores"
                className="mt-1 h-11 rounded-2xl"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                placeholder="Short description"
                className="mt-1 h-11 rounded-2xl"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <select
                  value={draft.type}
                  onChange={(event) => patch({ type: event.target.value })}
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
                  onChange={(event) => patch({ category: event.target.value })}
                  className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
                >
                  {TASK_CREATE_CATEGORY_OPTIONS.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Default priority</Label>
              <select
                value={draft.defaultPriority}
                onChange={(event) => patch({ defaultPriority: event.target.value })}
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
              <Label>Tasks</Label>
              <textarea
                value={draft.taskLines}
                onChange={(event) => patch({ taskLines: event.target.value })}
                placeholder={"One task per line\nMake bed\nClean room\nLaundry in basket"}
                className="mt-1 min-h-[170px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {parsedTasks.length} task{parsedTasks.length === 1 ? "" : "s"} in this routine.
              </p>
            </div>
          </aside>
        </div>

        <DialogFooter className="border-t bg-slate-50/70 px-5 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={saving}
            className="rounded-2xl font-black"
          >
            Close
          </Button>

          <Button
            onClick={saveTemplate}
            disabled={saving || !familyId}
            className="rounded-2xl font-black"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : draft.id ? "Save changes" : "Save routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
