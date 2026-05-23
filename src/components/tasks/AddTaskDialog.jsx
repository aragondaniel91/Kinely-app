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
  Save,
  Sparkles,
  Users,
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
  getTaskAssigneeValue,
} from "@/features/tasks/utils/taskDialogOptions";

function getDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeName(value, fallback) {
  return String(value || fallback || "").trim();
}

function buildPeopleFromFamily({
  children = [],
  familyChildrenCore = [],
  familyAdults = [],
  familyPeople = [],
  dadName,
  momName,
}) {
  const peopleById = new Map();

  function addPerson(person) {
    if (!person) return;

    const id =
      person.id ||
      person.uid ||
      person.childId ||
      person.child_id ||
      person.email ||
      "";

    const name =
      person.name ||
      person.displayName ||
      person.fullName ||
      person.label ||
      "";

    if (!id || !name) return;

    peopleById.set(id, {
      id,
      name,
      role: person.role || person.relationship || "Family",
      roleType: person.roleType || person.role_type || "",
      childId: person.childId || person.child_id || "",
    });
  }

  peopleById.set("family", {
    id: "family",
    name: "Family",
    role: "Together",
    roleType: "family",
    childId: "",
  });

  [...children, ...familyChildrenCore].forEach((child) => {
    const id = child.id || child.childId || child.child_id || child.name;
    const name = child.name || child.displayName || "Child";

    if (!id || !name) return;

    peopleById.set(id, {
      id,
      name,
      role: "Child",
      roleType: "child",
      childId: child.id || child.childId || child.child_id || id,
    });
  });

  if (dadName) {
    peopleById.set("dad", {
      id: "dad",
      name: normalizeName(dadName, "Dad"),
      role: "Parent",
      roleType: "parent",
      childId: "",
    });
  }

  if (momName) {
    peopleById.set("mom", {
      id: "mom",
      name: normalizeName(momName, "Mom"),
      role: "Parent",
      roleType: "parent",
      childId: "",
    });
  }

  [...familyAdults, ...familyPeople].forEach(addPerson);

  return Array.from(peopleById.values());
}

const fallbackCategories = [
  { value: "house", label: "House" },
  { value: "school", label: "School" },
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

const fallbackPriorities = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function OptionButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-2.5 text-sm font-black transition",
        active
          ? "border-primary/25 bg-primary text-primary-foreground shadow-lg shadow-primary/15"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function AssigneeButton({ person, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[64px] items-center gap-3 rounded-3xl border p-3 text-left transition",
        active
          ? "border-primary/25 bg-primary/5 ring-4 ring-primary/5"
          : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
        <Users className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">
          {person.name}
        </p>
        <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {person.role}
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

export default function AddTaskDialog({
  open,
  onOpenChange,
  onTaskSaved,
  editTask = null,
  initialAssigneePersonId = "",
}) {
  const family = useFamily();

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
  } = family || {};

  const people = useMemo(
    () =>
      buildPeopleFromFamily({
        children,
        dadName,
        momName,
        familyChildrenCore,
        familyAdults,
        familyPeople,
      }),
    [children, dadName, momName, familyChildrenCore, familyAdults, familyPeople]
  );

  const categoryOptions =
    Array.isArray(TASK_CREATE_CATEGORY_OPTIONS) && TASK_CREATE_CATEGORY_OPTIONS.length
      ? TASK_CREATE_CATEGORY_OPTIONS
      : fallbackCategories;

  const priorityOptions =
    Array.isArray(TASK_PRIORITY_OPTIONS) && TASK_PRIORITY_OPTIONS.length
      ? TASK_PRIORITY_OPTIONS
      : fallbackPriorities;

  const initialAssignee = editTask
    ? getTaskAssigneeValue(editTask)
    : initialAssigneePersonId || "family";

  const existingDueDate = editTask?.dueDate || editTask?.due_date || "";

  const [title, setTitle] = useState(editTask?.title || "");
  const [taskKind, setTaskKind] = useState(
    editTask?.chore || editTask?.isChore || editTask?.is_chore ? "chore" : "task"
  );
  const [assignedToPersonId, setAssignedToPersonId] = useState(initialAssignee);
  const [category, setCategory] = useState(editTask?.category || "house");
  const [priority, setPriority] = useState(editTask?.priority || "medium");
  const [dueMode, setDueMode] = useState(existingDueDate ? "custom" : "today");
  const [customDueDate, setCustomDueDate] = useState(existingDueDate || getDateKey(0));
  const [rewardEligible, setRewardEligible] = useState(
    editTask?.rewardEligible ?? editTask?.reward_eligible ?? false
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedPerson =
    people.find((person) => person.id === assignedToPersonId) ||
    people.find((person) => person.id === "family") ||
    people[0];

  const shouldShowReward =
    taskKind === "chore" || selectedPerson?.roleType === "child";

  function getDueDate() {
    if (dueMode === "none") return "";
    if (dueMode === "today") return getDateKey(0);
    if (dueMode === "tomorrow") return getDateKey(1);
    return customDueDate || "";
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
      const dueDate = getDueDate();
      const childId =
        selectedPerson?.roleType === "child"
          ? selectedPerson.childId || selectedPerson.id
          : "";

      const payload = {
        title: cleanTitle,
        category,
        priority,
        icon: getDefaultTaskIcon(category),

        assignedTo: selectedPerson?.name || "Family",
        assigned_to: selectedPerson?.name || "Family",
        assignedToName: selectedPerson?.name || "Family",
        assigned_to_name: selectedPerson?.name || "Family",
        assignedToPersonId: selectedPerson?.id || "family",
        assigned_to_person_id: selectedPerson?.id || "family",

        childId,
        child_id: childId,
        assignedChildId: childId,
        assigned_child_id: childId,

        dueDate,
        due_date: dueDate,

        rewardEligible: shouldShowReward ? rewardEligible : false,
        reward_eligible: shouldShowReward ? rewardEligible : false,

        chore: taskKind === "chore",
        isChore: taskKind === "chore",
        is_chore: taskKind === "chore",
        taskKind,
        task_kind: taskKind,

        familyId,
        family_id: familyId,
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
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
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

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Family task
              </p>

              <DialogTitle className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {editTask ? "Edit task" : "Add task"}
              </DialogTitle>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Create a task or chore for the right person and date.
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

          <div className="space-y-5">
            <section>
              <Label>Who is this for?</Label>

              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((person) => (
                  <AssigneeButton
                    key={person.id}
                    person={person}
                    active={assignedToPersonId === person.id}
                    onClick={() => setAssignedToPersonId(person.id)}
                  />
                ))}
              </div>
            </section>

            <section>
              <Label>Task type</Label>

              <div className="mt-2 flex flex-wrap gap-2">
                <OptionButton
                  active={taskKind === "task"}
                  onClick={() => setTaskKind("task")}
                >
                  Task
                </OptionButton>

                <OptionButton
                  active={taskKind === "chore"}
                  onClick={() => {
                    setTaskKind("chore");
                    setRewardEligible(true);
                  }}
                >
                  Chore
                </OptionButton>
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
              <Label>Category</Label>

              <div className="mt-2 flex flex-wrap gap-2">
                {categoryOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    active={category === option.value}
                    onClick={() => setCategory(option.value)}
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>
            </section>

            <section>
              <Label>Due date</Label>

              <div className="mt-2 flex flex-wrap gap-2">
                <OptionButton active={dueMode === "none"} onClick={() => setDueMode("none")}>
                  No date
                </OptionButton>

                <OptionButton active={dueMode === "today"} onClick={() => setDueMode("today")}>
                  Today
                </OptionButton>

                <OptionButton active={dueMode === "tomorrow"} onClick={() => setDueMode("tomorrow")}>
                  Tomorrow
                </OptionButton>

                <OptionButton active={dueMode === "custom"} onClick={() => setDueMode("custom")}>
                  Pick date
                </OptionButton>
              </div>

              {dueMode === "custom" && (
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
                  <OptionButton
                    key={option.value}
                    active={priority === option.value}
                    onClick={() => setPriority(option.value)}
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>
            </section>

            {shouldShowReward && (
              <section>
                <button
                  type="button"
                  onClick={() => setRewardEligible((current) => !current)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-3xl border p-4 text-left transition",
                    rewardEligible
                      ? "border-accent/20 bg-accent/10"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Counts toward rewards
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      Useful for chores and kid responsibilities.
                    </p>
                  </div>

                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border",
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
