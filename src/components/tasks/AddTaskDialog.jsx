import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  AlertTriangle,
  ArrowDownCircle,
  CalendarDays,
  Check,
  ClipboardCheck,
  Flag,
  Heart,
  Home,
  MoreHorizontal,
  Save,
  School,
  Sparkles,
  Star,
  UserRound,
  Users,
  Briefcase,
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
import { Label } from "@/components/ui/label";

import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import {
  TASK_CREATE_CATEGORY_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  buildTaskPayload,
  getDefaultTaskIcon,
  getTaskAssigneeValue,
} from "@/features/tasks/utils/taskDialogOptions";
import { queueFamilyActivity } from "@/services/familyActivityService";

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

function normalizePersonKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dedupePeopleByNameAndRole(people = []) {
  const seen = new Set();

  return people.filter((person) => {
    if (!person?.id || !person?.name) return false;

    const nameKey = normalizePersonKey(person.name);
    const roleKey = String(person.roleType || person.role || "").toLowerCase();

    const isParentLike = [
      "parent",
      "dad",
      "mom",
      "father",
      "mother",
      "owner",
      "admin",
      "co-parent",
      "coparent",
    ].includes(roleKey);

    const key = isParentLike ? `parent-${nameKey}` : `${roleKey}-${nameKey}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
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

  function addPerson(person) {
    if (!person) return;

    const id =
      person.id ||
      person.uid ||
      person.personId ||
      person.person_id ||
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
      uid: person.uid || person.userId || person.user_id || "",
      email: person.email || person.emailAddress || person.email_address || "",
      name,
      role: person.role || person.relationship || "Family",
      roleType: person.roleType || person.role_type || "",
      childId: person.childId || person.child_id || "",
      colorId: person.colorId || person.color_id || person.color || "",
      color: person.color || person.colorId || person.color_id || "",
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

const dueOptions = [
  { value: "none", label: "No date" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "custom", label: "Pick date" },
];

const categoryVisuals = {
  house: {
    icon: Home,
    preview: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    inactive: "bg-emerald-50/80 text-emerald-700 ring-emerald-100",
    active: "bg-emerald-600 text-white shadow-emerald-100",
  },
  school: {
    icon: School,
    preview: "bg-sky-50 text-sky-700 ring-sky-100",
    inactive: "bg-sky-50/80 text-sky-700 ring-sky-100",
    active: "bg-sky-600 text-white shadow-sky-100",
  },
  personal: {
    icon: UserRound,
    preview: "bg-pink-50 text-pink-700 ring-pink-100",
    inactive: "bg-pink-50/80 text-pink-700 ring-pink-100",
    active: "bg-pink-500 text-white shadow-pink-100",
  },
  work: {
    icon: Briefcase,
    preview: "bg-slate-50 text-slate-700 ring-slate-100",
    inactive: "bg-slate-50/90 text-slate-700 ring-slate-100",
    active: "bg-slate-800 text-white shadow-slate-200",
  },
  family: {
    icon: Heart,
    preview: "bg-rose-50 text-rose-700 ring-rose-100",
    inactive: "bg-rose-50/80 text-rose-700 ring-rose-100",
    active: "bg-rose-500 text-white shadow-rose-100",
  },
  other: {
    icon: MoreHorizontal,
    preview: "bg-violet-50 text-violet-700 ring-violet-100",
    inactive: "bg-violet-50/80 text-violet-700 ring-violet-100",
    active: "bg-violet-600 text-white shadow-violet-100",
  },
};

const priorityVisuals = {
  high: {
    icon: AlertTriangle,
    inactive: "bg-red-50/80 text-red-700 ring-red-100",
    active: "bg-red-600 text-white shadow-red-100",
  },
  medium: {
    icon: Flag,
    inactive: "bg-amber-50/80 text-amber-700 ring-amber-100",
    active: "bg-amber-500 text-white shadow-amber-100",
  },
  low: {
    icon: ArrowDownCircle,
    inactive: "bg-emerald-50/80 text-emerald-700 ring-emerald-100",
    active: "bg-emerald-600 text-white shadow-emerald-100",
  },
};

function SegmentedButton({ active, children, icon: Icon, tone, onClick }) {
  const activeTone = tone?.active || "bg-primary text-primary-foreground shadow-primary/15";
  const inactiveTone =
    tone?.inactive || "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-slate-900";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-black ring-1 transition hover:-translate-y-0.5 hover:shadow-sm",
        active
          ? cn(activeTone, "ring-transparent shadow-lg")
          : cn(inactiveTone, "hover:ring-slate-200")
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

function AssigneePill({ person, active, onClick }) {
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
        <p className="max-w-[115px] truncate text-sm font-black text-slate-950">
          {person.name}
        </p>
        <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
          {person.role}
        </p>
      </div>

      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

function DetailBlock({ label, children }) {
  return (
    <div className="rounded-3xl bg-white p-3 ring-1 ring-slate-100">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function AddTaskDialog({
  open,
  onOpenChange,
  onTaskSaved,
  people: boardPeople = [],
  editTask = null,
  initialAssigneePersonId = "",
  initialTaskDraft = null,
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

  const fallbackPeople = useMemo(
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

  const people = useMemo(() => {
    const sourcePeople =
      Array.isArray(boardPeople) && boardPeople.length ? boardPeople : fallbackPeople;

    return dedupePeopleByNameAndRole(sourcePeople);
  }, [boardPeople, fallbackPeople]);

  const categoryOptions =
    Array.isArray(TASK_CREATE_CATEGORY_OPTIONS) && TASK_CREATE_CATEGORY_OPTIONS.length
      ? TASK_CREATE_CATEGORY_OPTIONS
      : fallbackCategories;

  const priorityOptions =
    Array.isArray(TASK_PRIORITY_OPTIONS) && TASK_PRIORITY_OPTIONS.length
      ? TASK_PRIORITY_OPTIONS
      : fallbackPriorities;

  const [title, setTitle] = useState("");
  const [taskKind, setTaskKind] = useState("task");
  const [assignedToPersonId, setAssignedToPersonId] = useState("family");
  const [category, setCategory] = useState("house");
  const [priority, setPriority] = useState("medium");
  const [dueMode, setDueMode] = useState("today");
  const [customDueDate, setCustomDueDate] = useState(getDateKey(0));
  const [rewardEligible, setRewardEligible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const existingDueDate = editTask?.dueDate || editTask?.due_date || "";
    const isChore = Boolean(editTask?.chore || editTask?.isChore || editTask?.is_chore);
    const nextTaskKind = isChore ? "chore" : "task";

    setTitle(editTask?.title || initialTaskDraft?.title || "");
    setTaskKind(nextTaskKind);
    setAssignedToPersonId(
      editTask
        ? getTaskAssigneeValue(editTask)
        : initialTaskDraft?.assignedToPersonId || initialAssigneePersonId || "family"
    );
    setCategory(editTask?.category || initialTaskDraft?.category || "house");
    setPriority(editTask?.priority || initialTaskDraft?.priority || "medium");
    setDueMode(existingDueDate ? "custom" : "today");
    setCustomDueDate(existingDueDate || getDateKey(0));
    setRewardEligible(
      editTask?.rewardEligible ??
        editTask?.reward_eligible ??
        (!editTask && nextTaskKind === "chore")
    );
    setError("");
  }, [open, editTask, initialAssigneePersonId, initialTaskDraft]);

  const selectedPerson =
    people.find((person) => person.id === assignedToPersonId) ||
    people.find((person) => person.id === "family") ||
    people[0];

  function getDueDate() {
    if (dueMode === "none") return "";
    if (dueMode === "today") return getDateKey(0);
    if (dueMode === "tomorrow") return getDateKey(1);
    return customDueDate || "";
  }

  const selectedCategoryVisual = categoryVisuals[category] || categoryVisuals.other;
  const SelectedCategoryIcon = selectedCategoryVisual.icon || MoreHorizontal;
  const selectedPriorityVisual = priorityVisuals[priority] || priorityVisuals.medium;

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
      const assignedEmail = selectedPerson?.email || selectedPerson?.emailAddress || "";
      const taskNotify = assignedEmail && selectedPerson?.id !== "family"
        ? {
            enabled: true,
            target: "selected",
            recipients: [assignedEmail],
            selectedRecipients: [assignedEmail],
          }
        : null;

      const payload = {
        ...buildTaskPayload({
          title: cleanTitle,
          category,
          priority,
          icon: getDefaultTaskIcon(category),
          rewardEligible,
          selectedAssignee: selectedPerson,
          dueDate,
          familyId,
        }),

        chore: taskKind === "chore",
        isChore: taskKind === "chore",
        taskKind,

        linkedListId:
          editTask?.linkedListId ||
          editTask?.linked_list_id ||
          initialTaskDraft?.linkedListId ||
          "",
        linkedListTitle:
          editTask?.linkedListTitle ||
          editTask?.linked_list_title ||
          initialTaskDraft?.linkedListTitle ||
          "",
        linkedEventId:
          editTask?.linkedEventId ||
          editTask?.linked_event_id ||
          initialTaskDraft?.linkedEventId ||
          "",
        linkedEventTitle:
          editTask?.linkedEventTitle ||
          editTask?.linked_event_title ||
          initialTaskDraft?.linkedEventTitle ||
          "",
        source:
          editTask?.source ||
          initialTaskDraft?.source ||
          "manual",

        familyName: profile?.family_name || profile?.familyName || "",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
        updatedByEmail: user?.email || null,
      };

      if (editTask?.id) {
        await updateDoc(doc(db, TASK_COLLECTIONS.tasks, editTask.id), payload);
        queueFamilyActivity({
          familyId,
          user,
          profile,
          module: "tasks",
          type: "task_updated",
          title: `Task updated: ${cleanTitle}`,
          description: selectedPerson?.name
            ? `Assigned to ${selectedPerson.name}`
            : "Family task updated",
          entityType: "task",
          entityId: editTask.id,
          date: dueDate,
          notify: taskNotify,
        });
      } else {
        const taskRef = await addDoc(collection(db, TASK_COLLECTIONS.tasks), {
          ...payload,
          status: "pending",
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
          created_date: new Date().toISOString(),
        });
        queueFamilyActivity({
          familyId,
          user,
          profile,
          module: "tasks",
          type: "task_created",
          title: `Task created: ${cleanTitle}`,
          description: selectedPerson?.name
            ? `Assigned to ${selectedPerson.name}`
            : "Family task created",
          entityType: "task",
          entityId: taskRef.id,
          date: dueDate,
          notify: taskNotify,
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
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-2xl flex-col overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0 bg-gradient-to-br from-white via-secondary/20 to-accent/5 px-4 pb-3 pt-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/15">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Family task
              </p>

              <DialogTitle className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {editTask ? "Edit task" : "Add task"}
              </DialogTitle>

              <DialogDescription className="mt-1 text-sm font-semibold text-slate-500">
                Assign it, name it, choose when it matters.
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
            {!editTask && (initialTaskDraft?.linkedListTitle || initialTaskDraft?.linkedEventTitle) && (
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
                {initialTaskDraft?.linkedListTitle
                  ? `Linked to list: ${initialTaskDraft.linkedListTitle}`
                  : `Linked to event: ${initialTaskDraft.linkedEventTitle}`}
              </div>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label>Assign to</Label>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Swipe if needed
                </span>
              </div>

              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex min-w-max gap-2">
                  {people.map((person) => (
                    <AssigneePill
                      key={person.id}
                      person={person}
                      active={assignedToPersonId === person.id}
                      onClick={() => setAssignedToPersonId(person.id)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-slate-50/75 p-3 ring-1 ring-slate-100">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-7 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1",
                    selectedCategoryVisual.preview
                  )}
                  title={`${category} category`}
                >
                  <SelectedCategoryIcon className="h-5.5 w-5.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <Label>What needs to be done?</Label>

                  <Input
                    value={title}
                    onChange={(event) => {
                      setError("");
                      setTitle(event.target.value);
                    }}
                    placeholder="Example: Brush teeth"
                    className="mt-2 h-12 rounded-2xl border-slate-200 bg-white text-base font-black"
                    autoFocus
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <SegmentedButton
                      active={taskKind === "task"}
                      onClick={() => setTaskKind("task")}
                    >
                      Task
                    </SegmentedButton>

                    <SegmentedButton
                      active={taskKind === "chore"}
                      onClick={() => {
                        setTaskKind("chore");
                        setRewardEligible(true);
                      }}
                    >
                      Chore
                    </SegmentedButton>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-black ring-1",
                        selectedCategoryVisual.preview
                      )}
                    >
                      <SelectedCategoryIcon className="h-4 w-4" />
                      {categoryOptions.find((option) => option.value === category)?.label || "Other"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-slate-50/75 p-3 ring-1 ring-slate-100">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-accent" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Details
                </p>
              </div>

              <div className="grid gap-3">
                <DetailBlock label="When">
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                      </div>

                      <Input
                        type="date"
                        value={customDueDate}
                        onChange={(event) => setCustomDueDate(event.target.value)}
                        className="h-10 rounded-2xl bg-white"
                      />
                    </div>
                  )}
                </DetailBlock>

                <DetailBlock label="Category">
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((option) => {
                      const visual = categoryVisuals[option.value] || categoryVisuals.other;

                      return (
                        <SegmentedButton
                          key={option.value}
                          active={category === option.value}
                          icon={visual.icon}
                          tone={visual}
                          onClick={() => setCategory(option.value)}
                        >
                          {option.label}
                        </SegmentedButton>
                      );
                    })}
                  </div>
                </DetailBlock>

                <DetailBlock label="Importance">
                  <div className="flex flex-wrap gap-2">
                    {priorityOptions.map((option) => {
                      const visual = priorityVisuals[option.value] || priorityVisuals.medium;

                      return (
                        <SegmentedButton
                          key={option.value}
                          active={priority === option.value}
                          icon={visual.icon}
                          tone={visual}
                          onClick={() => setPriority(option.value)}
                        >
                          {option.label}
                        </SegmentedButton>
                      );
                    })}
                  </div>
                </DetailBlock>
              </div>
            </section>

            <section>
              <button
                type="button"
                onClick={() => setRewardEligible((current) => !current)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-[1.75rem] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                  rewardEligible
                    ? "border-accent/20 bg-accent/8 ring-4 ring-accent/5"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                      rewardEligible
                        ? "bg-accent text-accent-foreground"
                        : "bg-slate-50 text-slate-400"
                    )}
                  >
                    <Star className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Counts toward rewards
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      Works for both tasks and chores.
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
