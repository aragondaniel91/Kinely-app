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
  CheckCircle2,
  Gift,
  Sparkles,
  WandSparkles,
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
import { getTaskIcon } from "@/features/tasks/utils/taskHelpers";
import {
  TASK_CATEGORY_COPY,
  TASK_CREATE_CATEGORY_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  buildAssigneeOptions,
  buildTaskPayload,
  findAssigneeOption,
  getAvailableTaskIcons,
  getDefaultTaskIcon,
  getTaskIconOption,
  inferTaskIconFromTitle,
  getTaskAssigneeValue,
} from "@/features/tasks/utils/taskDialogOptions";

const priorityStyles = {
  high: {
    active: "border-red-200 bg-red-50 text-red-700 ring-red-100",
    idle: "border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700",
    label: "Important",
  },
  medium: {
    active: "border-amber-200 bg-amber-50 text-amber-700 ring-amber-100",
    idle: "border-slate-200 bg-white text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700",
    label: "Normal",
  },
  low: {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100",
    idle: "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
    label: "Light",
  },
};

function getPersonColorClasses(person = {}) {
  return person.colorClasses || {};
}

function AssigneeCard({ option, active, onClick }) {
  const colorClasses = getPersonColorClasses(option.person);
  const initials = String(option.label || "F").charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative min-h-[92px] rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md",
        active
          ? cn(
              colorClasses.borderStrong || colorClasses.border || "border-primary/40",
              colorClasses.bg || "bg-primary/5",
              "ring-4 ring-white"
            )
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      {active && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black",
          active ? "bg-white text-slate-900" : "bg-slate-50 text-slate-500"
        )}
      >
        {initials}
      </div>

      <p className="mt-2 truncate text-sm font-black text-slate-950">
        {option.label}
      </p>

      <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {option.role || "Family"}
      </p>
    </button>
  );
}

function CategoryChip({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-black transition",
        active
          ? "border-primary/20 bg-primary text-primary-foreground shadow-lg shadow-primary/15"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {option.label}
    </button>
  );
}

function PriorityChip({ option, active, onClick }) {
  const style = priorityStyles[option.value] || priorityStyles.medium;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-left transition",
        active ? cn(style.active, "ring-4") : style.idle
      )}
    >
      <p className="text-sm font-black">{option.label}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide opacity-70">
        {style.label}
      </p>
    </button>
  );
}

function IconButton({ option, active, onClick }) {
  const Icon = getTaskIcon({ icon: option.value });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black transition",
        active
          ? "border-accent/25 bg-accent/10 text-accent ring-4 ring-accent/5"
          : "border-slate-200 bg-white text-slate-500 hover:border-accent/25 hover:bg-accent/5 hover:text-accent"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{option.label}</span>
    </button>
  );
}

export default function AddTaskDialog({
  onClose,
  onSuccess,
  editTask = null,
  initialAssigneePersonId = "",
}) {
  const {
    children,
    dadName,
    momName,
    familyChildrenCore,
    familyAdults,
    familyPeople,
    profile,
    familyId,
    user,
  } = useFamily();

  const boardChildren = children?.length ? children : familyChildrenCore;

  const { people } = useTaskBoardPeople({
    children: boardChildren,
    dadName,
    momName,
    familyAdults,
    familyPeople,
    profile,
  });

  const peopleById = useMemo(() => {
    return new Map(people.map((person) => [person.id, person]));
  }, [people]);

  const assigneeOptions = useMemo(() => {
    return buildAssigneeOptions(people).map((option) => ({
      ...option,
      person: peopleById.get(option.value),
    }));
  }, [people, peopleById]);

  const initialAssigneeValue = editTask
    ? getTaskAssigneeValue(editTask)
    : initialAssigneePersonId || "family";

  const initialAssignee = assigneeOptions.some(
    (option) => option.value === initialAssigneeValue
  )
    ? initialAssigneeValue
    : assigneeOptions[0]?.value || "family";

  const initialCategory = editTask?.category || "house";

  const [title, setTitle] = useState(editTask?.title || "");
  const [category, setCategory] = useState(initialCategory);
  const [priority, setPriority] = useState(editTask?.priority || "medium");
  const [dueDate, setDueDate] = useState(
    editTask?.due_date || editTask?.dueDate || ""
  );
  const [assignedToPersonId, setAssignedToPersonId] = useState(initialAssignee);
  const [icon, setIcon] = useState(
    editTask?.icon || inferTaskIconFromTitle(editTask?.title || "", initialCategory)
  );
  const [iconManuallySelected, setIconManuallySelected] = useState(
    Boolean(editTask?.icon)
  );
  const [rewardEligible, setRewardEligible] = useState(
    editTask?.rewardEligible ?? editTask?.reward_eligible ?? true
  );
  const [saving, setSaving] = useState(false);

  const selectedAssignee = findAssigneeOption(
    assigneeOptions,
    assignedToPersonId
  );

  const availableIcons = getAvailableTaskIcons(category);
  const suggestedIconValue = inferTaskIconFromTitle(title, category);
  const suggestedIcon = getTaskIconOption(suggestedIconValue);
  const currentIconOption = getTaskIconOption(icon);
  const SuggestedIcon = getTaskIcon({ icon: suggestedIconValue });

  const handleTitleChange = (nextTitle) => {
    setTitle(nextTitle);

    if (!iconManuallySelected) {
      setIcon(inferTaskIconFromTitle(nextTitle, category));
    }
  };

  const handleCategoryChange = (nextCategory) => {
    setCategory(nextCategory);

    if (!iconManuallySelected) {
      setIcon(inferTaskIconFromTitle(title, nextCategory));
      return;
    }

    const nextIcons = getAvailableTaskIcons(nextCategory);
    const currentIconStillValid = nextIcons.some((option) => option.value === icon);

    if (!currentIconStillValid) {
      setIcon(getDefaultTaskIcon(nextCategory));
    }
  };

  const handleIconChange = (nextIcon) => {
    setIcon(nextIcon);
    setIconManuallySelected(true);
  };

  const applySuggestedIcon = () => {
    setIcon(suggestedIconValue);
    setIconManuallySelected(false);
  };

  const handleClose = () => {
    if (!saving) onClose?.();
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;

    if (!familyId) {
      alert("No active family found.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...buildTaskPayload({
          title,
          category,
          priority,
          icon,
          rewardEligible,
          selectedAssignee,
          dueDate,
          familyId,
        }),
        updatedAt: serverTimestamp(),
      };

      if (editTask?.id) {
        await updateDoc(doc(db, TASK_COLLECTIONS.tasks, editTask.id), payload);
      } else {
        await addDoc(collection(db, TASK_COLLECTIONS.tasks), {
          ...payload,
          status: "pending",
          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
          created_date: new Date().toISOString(),
          createdAt: serverTimestamp(),
          familyName: profile?.family_name || profile?.familyName || "",
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving task:", error);
      alert(`There was an error saving the task: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden rounded-[2.25rem] border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b bg-gradient-to-br from-white via-secondary/35 to-accent/10 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Family task
              </p>

              <DialogTitle className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                {editTask ? "Edit task" : "New task"}
              </DialogTitle>

              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                Create a visual task that is clear for kids, caregivers, and the wall screen.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-150px)] overflow-y-auto px-5 py-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_320px]">
            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Label>Who is this for?</Label>
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Person first
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                  {assigneeOptions.map((option) => (
                    <AssigneeCard
                      key={option.value}
                      option={option}
                      active={assignedToPersonId === option.value}
                      onClick={() => setAssignedToPersonId(option.value)}
                    />
                  ))}
                </div>
              </section>

              <section>
                <Label>Task</Label>
                <Input
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Example: Make bed, brush teeth, homework..."
                  className="mt-2 h-14 rounded-3xl border-slate-200 px-4 text-lg font-black"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && title.trim()) handleSave();
                  }}
                />
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Label>Category</Label>
                  <p className="text-xs font-semibold text-slate-400">
                    {TASK_CATEGORY_COPY[category]}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TASK_CREATE_CATEGORY_OPTIONS.map((option) => (
                    <CategoryChip
                      key={option.value}
                      option={option}
                      active={category === option.value}
                      onClick={() => handleCategoryChange(option.value)}
                    />
                  ))}
                </div>
              </section>

              <section>
                <Label>Priority</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <PriorityChip
                      key={option.value}
                      option={option}
                      active={priority === option.value}
                      onClick={() => setPriority(option.value)}
                    />
                  ))}
                </div>
              </section>

              <section>
                <Label>Visual icon</Label>

                <div className="mt-2 rounded-3xl border border-accent/15 bg-accent/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent shadow-sm">
                        <SuggestedIcon className="h-6 w-6" />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
                          Smart suggestion
                        </p>
                        <p className="text-sm font-black text-slate-950">
                          {suggestedIcon?.label || "Routine"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={applySuggestedIcon}
                      className="rounded-2xl font-black"
                    >
                      <WandSparkles className="mr-2 h-4 w-4" />
                      Use suggestion
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
                  {availableIcons.map((option) => (
                    <IconButton
                      key={option.value}
                      option={option}
                      active={icon === option.value}
                      onClick={() => handleIconChange(option.value)}
                    />
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[2rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Preview
                </p>

                <div className="mt-4 rounded-3xl border border-white bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-secondary text-slate-700">
                      {(() => {
                        const PreviewIcon = getTaskIcon({ icon, title, category });
                        return <PreviewIcon className="h-7 w-7" />;
                      })()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-slate-950">
                        {title.trim() || "New task"}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {selectedAssignee?.label || "Family"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                            priorityStyles[priority]?.active ||
                              priorityStyles.medium.active
                          )}
                        >
                          {priority}
                        </span>

                        <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                          {category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Due date</Label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>
              </div>

              {selectedAssignee?.roleType === "child" && (
                <button
                  type="button"
                  onClick={() => setRewardEligible((value) => !value)}
                  className={cn(
                    "w-full rounded-3xl border p-4 text-left transition",
                    rewardEligible
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                      <Gift className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-950">
                        Count toward child reward
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        {rewardEligible
                          ? "This task will count toward the child reward."
                          : "This task will not count toward the child reward."}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              <div className="rounded-3xl border border-accent/15 bg-accent/5 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <p className="text-xs font-semibold leading-5 text-slate-500">
                    Tip: short titles plus smart icons make the wall screen easier for kids and caregivers.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <DialogFooter className="border-t bg-slate-50/70 px-5 py-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="rounded-2xl font-black"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={!title.trim() || saving || !familyId}
            className="rounded-2xl font-black"
          >
            {saving ? "Saving..." : editTask ? "Save changes" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
