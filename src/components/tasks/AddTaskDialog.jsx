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

const categoryCopy = {
  house: "Family and home responsibilities.",
  work: "Personal or work focus.",
  school: "School and learning.",
  personal: "Personal routine or care.",
  family: "Shared family moment or responsibility.",
  other: "General task.",
};

const iconOptions = [
  { value: "bed", label: "Bed" },
  { value: "read", label: "Read" },
  { value: "backpack", label: "Backpack" },
  { value: "plant", label: "Plants" },
  { value: "trash", label: "Trash" },
  { value: "medicine", label: "Medicine" },
  { value: "grocery", label: "Groceries" },
  { value: "dinner", label: "Dinner" },
  { value: "family", label: "Family" },
  { value: "home", label: "Home" },
  { value: "sparkles", label: "Routine" },
];

function getDefaultIcon(category) {
  if (category === "school") return "read";
  if (category === "personal") return "sparkles";
  if (category === "family") return "family";
  if (category === "house") return "home";
  return "sparkles";
}

function getAssigneeFromTask(task) {
  const safeTask = task || {};

  return (
    safeTask.assignedToPersonId ||
    safeTask.assigned_to_person_id ||
    safeTask.personId ||
    safeTask.person_id ||
    safeTask.childId ||
    safeTask.child_id ||
    safeTask.assignedTo ||
    safeTask.assigned_to ||
    "family"
  );
}

export default function AddTaskDialog({ onClose, onSuccess, editTask = null }) {
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

  const assigneeOptions = useMemo(() => {
    const options = people
      .filter((person) => person?.id && person?.name)
      .map((person) => ({
        value: person.id,
        label: person.name,
        role: person.role,
        roleType: person.roleType,
        childId: person.childId || person.child_id || "",
      }));

    return options.length
      ? options
      : [{ value: "family", label: "Family", role: "Together", roleType: "family", childId: "" }];
  }, [people]);

  const fallbackAssignee = assigneeOptions[0]?.value || "family";

  const initialAssignee = assigneeOptions.some(
    (option) => option.value === getAssigneeFromTask(editTask)
  )
    ? getAssigneeFromTask(editTask)
    : fallbackAssignee;

  const [title, setTitle] = useState(editTask?.title || "");
  const [category, setCategory] = useState(editTask?.category || "house");
  const [priority, setPriority] = useState(editTask?.priority || "medium");
  const [dueDate, setDueDate] = useState(editTask?.due_date || editTask?.dueDate || "");
  const [assignedToPersonId, setAssignedToPersonId] = useState(initialAssignee);
  const [icon, setIcon] = useState(editTask?.icon || getDefaultIcon(editTask?.category || "house"));
  const [rewardEligible, setRewardEligible] = useState(
    editTask?.rewardEligible ?? editTask?.reward_eligible ?? true
  );
  const [saving, setSaving] = useState(false);

  const selectedAssignee =
    assigneeOptions.find((option) => option.value === assignedToPersonId) ||
    assigneeOptions[0];

  const handleCategoryChange = (nextCategory) => {
    setCategory(nextCategory);

    if (!icon) {
      setIcon(getDefaultIcon(nextCategory));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    if (!familyId) {
      alert("No active family found.");
      return;
    }

    setSaving(true);

    try {
      const childId =
        selectedAssignee?.roleType === "child"
          ? selectedAssignee.childId || selectedAssignee.value
          : "";

      const payload = {
        title: title.trim(),
        category,
        priority,
        icon,
        rewardEligible,
        reward_eligible: rewardEligible,

        assignedTo: selectedAssignee?.label || "Family",
        assigned_to: selectedAssignee?.label || "Family",
        assignedToName: selectedAssignee?.label || "Family",
        assigned_to_name: selectedAssignee?.label || "Family",
        assignedToPersonId: selectedAssignee?.value || "family",
        assigned_to_person_id: selectedAssignee?.value || "family",

        childId,
        child_id: childId,
        assignedChildId: childId,
        assigned_child_id: childId,

        due_date: dueDate || "",
        dueDate: dueDate || "",
        familyId,
        family_id: familyId,
        updatedAt: serverTimestamp(),
      };

      if (editTask) {
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
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
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
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
              className="mt-1 h-11 rounded-2xl"
              onKeyDown={(event) => {
                if (event.key === "Enter" && title.trim()) handleSave();
              }}
            />
          </div>

          <div>
            <Label>Assigned to</Label>
            <select
              value={assignedToPersonId}
              onChange={(event) => setAssignedToPersonId(event.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {assigneeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Tasks follow the person-first Family Tasks board.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <select
                value={category}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="house">House</option>
                <option value="school">School</option>
                <option value="personal">Personal</option>
                <option value="work">Work</option>
                <option value="family">Family</option>
                <option value="other">Other</option>
              </select>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                {categoryCopy[category]}
              </p>
            </div>

            <div>
              <Label>Priority</Label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                Helps the family know what needs attention first.
              </p>
            </div>
          </div>

          <div>
            <Label>Visual icon</Label>
            <select
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {iconOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Large icons help kids and grandparents recognize tasks quickly.
            </p>
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
          <Button variant="outline" onClick={onClose} className="rounded-2xl font-black">
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
