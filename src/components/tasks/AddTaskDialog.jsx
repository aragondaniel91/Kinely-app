import React, { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  CalendarDays,
  Check,
  Home,
  Layers,
  Save,
  Sparkles,
  Star,
  UserRound,
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

import { useTaskBoardPeople } from "@/features/tasks/hooks/useTaskBoardPeople";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import {
  TASK_CATEGORY_COPY,
  TASK_CREATE_CATEGORY_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  buildAssigneeOptions,
  buildTaskPayload,
  findAssigneeOption,
  getDefaultTaskIcon,
  getTaskAssigneeValue,
} from "@/features/tasks/utils/taskDialogOptions";

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTomorrowKey() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const taskKindOptions = [
  {
    value: "task",
    label: "Task",
    description: "One-time family task",
    icon: Layers,
  },
  {
    value: "chore",
    label: "Chore",
    description: "Kid-friendly responsibility",
    icon: Home,
  },
];

const dueDateOptions = [
  { value: "none", label: "No date" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "custom", label: "Pick date" },
];

const fallbackCategoryOptions = [
  { value: "house", label: "House" },
  { value: "school", label: "School" },
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

const fallbackPriorityOptions = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const safeCategoryCopy = {
  house: "Family and home responsibilities.",
  school: "School and learning.",
  personal: "Personal routine or care.",
  work: "Personal or work focus.",
  family: "Shared family moment or responsibility.",
  other: "General task.",
};

const priorityStyles = {
  high: "border-red-100 bg-red-50 text-red-700",
  medium: "border-amber-100 bg-amber-50 text-amber-700",
  low: "border-emerald-100 bg-emerald-50 text-emerald-700",
};

const categoryStyles = {
  house: "border-blue-100 bg-blue-50/80 text-blue-700",
  school: "border-violet-100 bg-violet-50/80 text-violet-700",
  personal: "border-emerald-100 bg-emerald-50/80 text-emerald-700",
  work: "border-slate-200 bg-slate-50 text-slate-700",
  family: "border-rose-100 bg-rose-50/80 text-rose-700",
  other: "border-amber-100 bg-amber-50/80 text-amber-700",
};

function getPersonTone(option = {}) {
  const roleType = option.roleType || "";

  if (roleType === "child") {
    return "border-blue-100 bg-blue-50/75 text-blue-800";
  }

  if (roleType === "parent") {
    return "border-emerald-100 bg-emerald-50/75 text-emerald-800";
  }

  if (roleType === "caregiver") {
    return "border-violet-100 bg-violet-50/75 text-violet-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function AssigneeButton({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[72px] items-center gap-3 rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
        active
          ? "border-primary/25 bg-primary/5 ring-4 ring-primary/5"
          : getPersonTone(option)
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/85 shadow-inner ring-1 ring-white">
        <UserRound className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">
          {option.label}
        </p>
        <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
          {option.role || "Family"}
        </p>
      </div>

      {active && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}

function PillButton({ active, children, className, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-2.5 text-sm font-black transition hover:-translate-y-0.5 hover:shadow-sm",
        active
          ? "border-primary/25 bg-primary text-primary-foreground shadow-lg shadow-primary/15"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        className
      )}
    >
      {children}
    </button>
  );
}

function KindCard({ option, active, onClick }) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
        active
          ? "border-primary/25 bg-primary/5 ring-4 ring-primary/5"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          active ? "bg-primary text-primary-foreground" : "bg-slate-50 text-slate-500"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-950">
          {option.label}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">
          {option.description}
        </p>
      </div>
    </button>
  );
}

export default function AddTaskDialog({
  open,
  onOpenChange,
  onTaskSaved,
  editTask = null,
  initialAssigneePersonId = "",
}) {
  const {
    children = [],
    dadName,
    momName,
    familyChildrenCore = [],
    familyAdults = [],
    familyPeople = [],
    familyId,
    profile,
    user,
  } = useFamily();

  const rawPeople = useTaskBoardPeople({
    children,
    dadName,
    momName,
    familyChildrenCore,
    familyAdults,
    familyPeople,
    profile,
  });

  const people = Array.isArray(rawPeople) ? rawPeople : [];

  const assigneeOptions = useMemo(() => {
    return buildAssigneeOptions(people);
  }, [people]);

  const categoryOptions = Array.isArray(TASK_CREATE_CATEGORY_OPTIONS) && TASK_CREATE_CATEGORY_OPTIONS.length
    ? TASK_CREATE_CATEGORY_OPTIONS
    : fallbackCategoryOptions;

  const priorityOptions = Array.isArray(TASK_PRIORITY_OPTIONS) && TASK_PRIORITY_OPTIONS.length
    ? TASK_PRIORITY_OPTIONS
    : fallbackPriorityOptions;

  const initialAssignee = getTaskAssigneeValue(editTask || {});
  const defaultAssigneeId =
    editTask
      ? initialAssignee
      : initialAssigneePersonId || assigneeOptions[0]?.value || "family";

  const existingCategory = editTask?.category || "house";
  const existingIcon = editTask?.icon || getDefaultTaskIcon(existingCategory);
  const existingDueDate = editTask?.dueDate || editTask?.due_date || "";

  const [title, setTitle] = useState(editTask?.title || "");
  const [taskKind, setTaskKind] = useState(
    editTask?.chore || editTask?.isChore || editTask?.is_chore ? "chore" : "task"
  );
  const [category, setCategory] = useState(existingCategory);
  const [priority, setPriority] = useState(editTask?.priority || "medium");
  const [assignedToPersonId, setAssignedToPersonId] = useState(defaultAssigneeId);
  const [dueDateMode, setDueDateMode] = useState(existingDueDate ? "custom" : "today");
  const [customDueDate, setCustomDueDate] = useState(existingDueDate || getTodayKey());
  const [rewardEligible, setRewardEligible] = useState(
    editTask?.rewardEligible ??
      editTask?.reward_eligible ??
      (taskKind === "chore")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedAssignee = findAssigneeOption(assigneeOptions, assignedToPersonId);
  const selectedCategory = categoryOptions.find(
    (option) => option.value === category
  );
  const selectedIcon = getDefaultTaskIcon(category);

  const shouldShowReward =
    selectedAssignee?.roleType === "child" || taskKind === "chore";

  function getResolvedDueDate() {
    if (dueDateMode === "none") return "";
    if (dueDateMode === "today") return getTodayKey();
    if (dueDateMode === "tomorrow") return getTomorrowKey();
    return customDueDate || "";
  }

  function handleCategoryChange(nextCategory) {
    setCategory(nextCategory);
  }

  async function handleSave() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Please enter a task title.");
      return;
    }

    if (!familyId) {
      setError("Family profile is not ready yet.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const dueDate = getResolvedDueDate();

      const payload = {
        ...buildTaskPayload({
          title: cleanTitle,
          category,
          priority,
          icon: selectedIcon || existingIcon,
          rewardEligible: shouldShowReward ? rewardEligible : false,
          selectedAssignee,
          dueDate,
          familyId,
        }),

        chore: taskKind === "chore",
        isChore: taskKind === "chore",
        is_chore: taskKind === "chore",

        taskKind,
        task_kind: taskKind,

        familyName: profile?.family_name || profile?.familyName || "",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      };

      if (editTask?.id) {
        await updateDoc(doc(db, TASK_COLLECTIONS.tasks, editTask.id), payload);
      } else {
        await addDoc(collection(db, TASK_COLLECTIONS.tasks), {
          ...payload,
          status: "pending",
          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
          createdAt: serverTimestamp(),
          created_date: new Date().toISOString(),
        });
      }

      await onTaskSaved?.();
      onOpenChange?.(false);
    } catch (err) {
      console.error("Error saving task:", err);
      setError(err?.message || "There was an error saving the task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange?.(nextOpen)}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0 border-b bg-gradient-to-br from-white via-secondary/35 to-accent/10 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Family task
              </p>

              <DialogTitle className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {editTask ? "Edit task" : "Add task"}
              </DialogTitle>

              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                Create a clear task or chore for the right person and date.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {error && (
            <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Label>Who is this for?</Label>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Assignment
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {assigneeOptions.map((option) => (
                  <AssigneeButton
                    key={option.value}
                    option={option}
                    active={assignedToPersonId === option.value}
                    onClick={() => setAssignedToPersonId(option.value)}
                  />
                ))}
              </div>
            </section>

            <section>
              <Label>Task type</Label>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {taskKindOptions.map((option) => (
                  <KindCard
                    key={option.value}
                    option={option}
                    active={taskKind === option.value}
                    onClick={() => {
                      setTaskKind(option.value);
                      if (option.value === "chore") setRewardEligible(true);
                    }}
                  />
                ))}
              </div>
            </section>

            <section>
              <Label>Task title</Label>

              <Input
                value={title}
                onChange={(event) => {
                  setError("");
                  setTitle(event.target.value);
                }}
                placeholder="Example: Make bed"
                className="mt-2 h-12 rounded-2xl text-base font-bold"
                autoFocus
              />
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Label>Category</Label>

                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                  Icon by category
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((option) => (
                  <PillButton
                    key={option.value}
                    active={category === option.value}
                    onClick={() => handleCategoryChange(option.value)}
                    className={
                      category === option.value
                        ? ""
                        : categoryStyles[option.value] || categoryStyles.other
                    }
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-400">
                {(TASK_CATEGORY_COPY || safeCategoryCopy)[category] || safeCategoryCopy[category] || "General task."}
              </p>
            </section>

            <section>
              <Label>Due date</Label>

              <div className="mt-2 flex flex-wrap gap-2">
                {dueDateOptions.map((option) => (
                  <PillButton
                    key={option.value}
                    active={dueDateMode === option.value}
                    onClick={() => setDueDateMode(option.value)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>

              {dueDateMode === "custom" && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <Input
                    type="date"
                    value={customDueDate}
                    onChange={(event) => setCustomDueDate(event.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>
              )}
            </section>

            <section>
              <Label>Priority</Label>

              <div className="mt-2 flex flex-wrap gap-2">
                {priorityOptions.map((option) => (
                  <PillButton
                    key={option.value}
                    active={priority === option.value}
                    onClick={() => setPriority(option.value)}
                    className={
                      priority === option.value
                        ? ""
                        : priorityStyles[option.value] || priorityStyles.medium
                    }
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </section>

            {shouldShowReward && (
              <section>
                <button
                  type="button"
                  onClick={() => setRewardEligible((current) => !current)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                    rewardEligible
                      ? "border-accent/20 bg-accent/8 ring-4 ring-accent/5"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                        rewardEligible
                          ? "bg-accent text-accent-foreground"
                          : "bg-slate-50 text-slate-400"
                      )}
                    >
                      <Star className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-950">
                        Counts toward rewards
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        Useful for chores and kid responsibilities.
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                      rewardEligible
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-slate-200 bg-white text-transparent"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                </button>
              </section>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-slate-50/70 px-4 py-3 sm:px-5">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={saving}
            className="rounded-2xl font-black"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl font-black"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : editTask ? "Save changes" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
