import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  Home,
  Layers,
  Moon,
  Repeat,
  School,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

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

import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import {
  buildAssigneeOptions,
  buildTaskPayload,
  findAssigneeOption,
  getDefaultTaskIcon,
} from "@/features/tasks/utils/taskDialogOptions";

function getDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const routineFilters = [
  { value: "all", label: "All", icon: Layers },
  { value: "chore", label: "Chores", icon: Home },
  { value: "weekday", label: "Weekday", icon: School },
  { value: "weekend", label: "Weekend", icon: Sun },
  { value: "bedtime", label: "Bedtime", icon: Moon },
  { value: "daily", label: "Daily", icon: Repeat },
];

const dueOptions = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "custom", label: "Pick date" },
];

function getRoutineIcon(type = "") {
  if (type === "chore") return Home;
  if (type === "weekday") return School;
  if (type === "weekend") return Sun;
  if (type === "bedtime") return Moon;
  if (type === "daily") return Repeat;
  return Layers;
}

function getRoutineTone(type = "") {
  if (type === "chore") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (type === "weekday") return "bg-sky-50 text-sky-700 ring-sky-100";
  if (type === "weekend") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (type === "bedtime") return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  if (type === "daily") return "bg-violet-50 text-violet-700 ring-violet-100";
  return "bg-slate-50 text-slate-600 ring-slate-100";
}

function getCategoryTone(category = "other") {
  if (category === "house" || category === "home") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (category === "school") {
    return "bg-sky-50 text-sky-700 ring-sky-100";
  }

  if (category === "personal") {
    return "bg-pink-50 text-pink-700 ring-pink-100";
  }

  if (category === "work") {
    return "bg-slate-50 text-slate-700 ring-slate-100";
  }

  if (category === "family") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-violet-50 text-violet-700 ring-violet-100";
}

function SegmentedButton({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-black ring-1 transition hover:-translate-y-0.5 hover:shadow-sm",
        active
          ? "bg-primary text-primary-foreground ring-transparent shadow-lg shadow-primary/15"
          : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

function PersonPill({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
        active
          ? "border-primary/20 bg-primary/5 ring-4 ring-primary/5"
          : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-primary text-primary-foreground" : "bg-slate-50 text-slate-400"
        )}
      >
        <Users className="h-4 w-4" />
      </div>

      <div className="min-w-[72px]">
        <p className="max-w-[120px] truncate text-sm font-black text-slate-950">
          {option.label}
        </p>
        <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
          {option.role || "Family"}
        </p>
      </div>

      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

function RoutineCard({ template, active, onClick }) {
  const Icon = getRoutineIcon(template.type);
  const tone = getRoutineTone(template.type);
  const taskCount = (template.tasks || []).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[1.65rem] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
        active
          ? "border-primary/25 bg-primary/5 ring-4 ring-primary/5"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1", tone)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-black text-slate-950">
              {template.title}
            </p>

            {active && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
            {template.description || "Reusable family routine."}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1", tone)}>
              {template.type || "custom"}
            </span>

            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-accent">
              {taskCount} tasks
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function PreviewTask({ task, index }) {
  const category = task.category || "other";
  const tone = getCategoryTone(category);

  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-white"
    >
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white", tone.split(" ")[0])} />
      <span className="truncate">
        {task.title || `Task ${index + 1}`}
      </span>
    </div>
  );
}

export default function ApplyTaskTemplateDialog({
  open,
  onOpenChange,
  templates = [],
  people = [],
  initialPersonId = "",
  onApplied,
}) {
  const { familyId, user, profile } = useFamily();

  const assigneeOptions = useMemo(() => buildAssigneeOptions(people), [people]);

  const [templateTypeFilter, setTemplateTypeFilter] = useState("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("family");
  const [dueMode, setDueMode] = useState("today");
  const [customDueDate, setCustomDueDate] = useState(getDateKey(0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredTemplates = useMemo(() => {
    if (templateTypeFilter === "all") return templates;
    return templates.filter((template) => template.type === templateTypeFilter);
  }, [templates, templateTypeFilter]);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) ||
    filteredTemplates[0] ||
    templates[0];

  const selectedAssignee = findAssigneeOption(assigneeOptions, selectedPersonId);

  useEffect(() => {
    if (!open) return;

    setTemplateTypeFilter("all");
    setSelectedTemplateId(templates[0]?.id || "");
    setSelectedPersonId(initialPersonId || assigneeOptions[0]?.value || "family");
    setDueMode("today");
    setCustomDueDate(getDateKey(0));
    setError("");
  }, [open, templates, initialPersonId, assigneeOptions]);

  function getDueDate() {
    if (dueMode === "today") return getDateKey(0);
    if (dueMode === "tomorrow") return getDateKey(1);
    return customDueDate || getDateKey(0);
  }

  function handleFilterChange(filterValue) {
    setTemplateTypeFilter(filterValue);

    const nextTemplate =
      filterValue === "all"
        ? templates[0]
        : templates.find((template) => template.type === filterValue);

    setSelectedTemplateId(nextTemplate?.id || "");
  }

  async function handleApply() {
    if (!familyId || !selectedTemplate || saving) return;

    const templateTasks = Array.isArray(selectedTemplate.tasks)
      ? selectedTemplate.tasks
      : [];

    if (!templateTasks.length) {
      setError("This routine does not have any tasks.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const batch = writeBatch(db);
      const dueDate = getDueDate();
      templateTasks.forEach((task) => {
        const category = task.category || selectedTemplate.category || "other";
        const isChore = task.chore === true || selectedTemplate.type === "chore";
        const rewardEligible = task.rewardEligible !== false;

        const taskRef = doc(collection(db, TASK_COLLECTIONS.tasks));

        batch.set(taskRef, {
          ...buildTaskPayload({
            title: task.title,
            category,
            priority: task.priority || "medium",
            icon: task.icon || selectedTemplate.icon || getDefaultTaskIcon(category),
            rewardEligible,
            selectedAssignee,
            dueDate,
            familyId,
          }),

          chore: isChore,
          isChore,
          taskKind: isChore ? "chore" : "task",
          status: "pending",

          familyName: profile?.family_name || profile?.familyName || "",

          templateId: selectedTemplate.id,
          templateTitle: selectedTemplate.title,
          generatedFromRoutine: true,

          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          created_date: new Date().toISOString(),
        });
      });

      await batch.commit();
      await onApplied?.();
      onOpenChange?.(false);
    } catch (err) {
      console.error("Error applying task template:", err);
      setError(err?.message || "There was an error applying the routine.");
    } finally {
      setSaving(false);
    }
  }

  const previewTasks = selectedTemplate?.tasks || [];
  const RoutineIcon = getRoutineIcon(selectedTemplate?.type);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange?.(nextOpen)}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-3xl flex-col overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0 bg-gradient-to-br from-white via-secondary/20 to-accent/5 px-4 pb-3 pt-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/15">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Routine templates
              </p>

              <DialogTitle className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Apply routine
              </DialogTitle>

              <DialogDescription className="mt-1 text-sm font-semibold text-slate-500">
                Choose a routine, assign it, and create tasks for a date.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-3 sm:px-5">
          {error && (
            <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold leading-none text-slate-700">Routine type</p>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {filteredTemplates.length} shown
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {routineFilters.map((filter) => (
                  <SegmentedButton
                    key={filter.value}
                    active={templateTypeFilter === filter.value}
                    icon={filter.icon}
                    onClick={() => handleFilterChange(filter.value)}
                  >
                    {filter.label}
                  </SegmentedButton>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-slate-50/75 p-3 ring-1 ring-slate-100">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-accent" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Choose routine
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <RoutineCard
                    key={template.id}
                    template={template}
                    active={selectedTemplate?.id === template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                  />
                ))}
              </div>

              {!filteredTemplates.length && (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center">
                  <p className="text-sm font-black text-slate-900">
                    No routines in this group
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Try All or create one in Manage routines.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold leading-none text-slate-700">Assign to</p>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Swipe if needed
                </span>
              </div>

              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex min-w-max gap-2">
                  {assigneeOptions.map((option) => (
                    <PersonPill
                      key={option.value}
                      option={option}
                      active={selectedPersonId === option.value}
                      onClick={() => setSelectedPersonId(option.value)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-slate-50/75 p-3 ring-1 ring-slate-100">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  When
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {dueOptions.map((option) => (
                  <SegmentedButton
                    key={option.value}
                    active={dueMode === option.value}
                    onClick={() => setDueMode(option.value)}
                  >
                    {option.label}
                  </SegmentedButton>
                ))}
              </div>

              {dueMode === "custom" && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-100">
                    <CalendarDays className="h-4 w-4" />
                  </div>

                  <Input
                    id="routine-custom-due-date"
                    name="routine-custom-due-date"
                    type="date"
                    value={customDueDate}
                    onChange={(event) => setCustomDueDate(event.target.value)}
                    className="h-10 rounded-2xl bg-white"
                  />
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-accent/10 bg-accent/5 p-3">
              <div className="flex items-start gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1", getRoutineTone(selectedTemplate?.type))}>
                  <RoutineIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950">
                    {selectedTemplate?.title || "Routine"}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {previewTasks.length} tasks will be created for {selectedAssignee?.label || "Family"}.
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {previewTasks.slice(0, 4).map((task, index) => (
                      <PreviewTask
                        key={`${task.title}-${index}`}
                        task={task}
                        index={index}
                      />
                    ))}
                  </div>

                  {previewTasks.length > 4 && (
                    <p className="mt-2 text-xs font-black text-accent">
                      +{previewTasks.length - 4} more tasks
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="shrink-0 bg-transparent px-4 pb-4 pt-1 sm:px-5">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={saving}
            className="rounded-2xl font-black"
          >
            Cancel
          </Button>

          <Button
            onClick={handleApply}
            disabled={!selectedTemplate || saving || !familyId}
            className="rounded-2xl font-black"
          >
            {saving ? "Applying..." : "Apply routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
