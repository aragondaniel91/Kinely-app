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
  CheckCircle2,
  Gift,
  Sparkles,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
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
  getAvailableTaskIcons,
  getDefaultTaskIcon,
  getTaskIconOption,
  inferTaskIconFromTitle,
  getTaskAssigneeValue,
} from "@/features/tasks/utils/taskDialogOptions";

function SelectField({ label, value, onChange, options, helper }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {helper && (
        <p className="mt-1 text-xs font-semibold text-slate-400">
          {helper}
        </p>
      )}
    </div>
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

  const assigneeOptions = useMemo(
    () => buildAssigneeOptions(people),
    [people]
  );

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
  const [dueDate, setDueDate] = useState(editTask?.due_date || editTask?.dueDate || "");
  const [assignedToPersonId, setAssignedToPersonId] = useState(initialAssignee);
  const [icon, setIcon] = useState(
    editTask?.icon || inferTaskIconFromTitle(editTask?.title || "", initialCategory)
  );
  const [iconManuallySelected, setIconManuallySelected] = useState(Boolean(editTask?.icon));
  const [rewardEligible, setRewardEligible] = useState(
    editTask?.rewardEligible ?? editTask?.reward_eligible ?? true
  );
  const [saving, setSaving] = useState(false);

  const selectedAssignee = findAssigneeOption(
    assigneeOptions,
    assignedToPersonId
  );

  const availableIcons = getAvailableTaskIcons(category);
  const suggestedIcon = getTaskIconOption(icon);

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
      <DialogContent className="max-w-lg overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Family task
              </p>

              <DialogTitle className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {editTask ? "Edit task" : "New task"}
              </DialogTitle>

              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                Create a visual task for the right person on the family board.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          <div>
            <Label>Task</Label>
            <Input
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="What needs to be done?"
              className="mt-1 h-11 rounded-2xl"
              onKeyDown={(event) => {
                if (event.key === "Enter" && title.trim()) handleSave();
              }}
            />
          </div>

          <SelectField
            label="Assigned to"
            value={assignedToPersonId}
            onChange={setAssignedToPersonId}
            options={assigneeOptions}
            helper="Tasks follow the person-first Family Tasks board."
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              label="Category"
              value={category}
              onChange={handleCategoryChange}
              options={TASK_CREATE_CATEGORY_OPTIONS}
              helper={TASK_CATEGORY_COPY[category]}
            />

            <SelectField
              label="Priority"
              value={priority}
              onChange={setPriority}
              options={TASK_PRIORITY_OPTIONS}
              helper="Helps the family know what needs attention first."
            />
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <Label>Visual icon</Label>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Smart suggestion based on the task title.
                </p>
              </div>

              <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">
                  Suggested
                </p>
                <p className="text-sm font-black text-slate-900">
                  {suggestedIcon?.label || "Routine"}
                </p>
              </div>
            </div>

            <select
              value={icon}
              onChange={(event) => handleIconChange(event.target.value)}
              className="h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {availableIcons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Due date</Label>
            <div className="mt-1 flex items-center gap-2">
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
              className="w-full rounded-3xl border border-amber-100 bg-amber-50/80 p-4 text-left transition hover:bg-amber-50"
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
                Tip: keep the title short. The wall screen works best with clear labels and big icons.
              </p>
            </div>
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
