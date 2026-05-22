import React, { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { CalendarDays, CheckCircle2, Gift, Sparkles } from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { normalizeChildren } from "@/lib/personColorUtils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoryCopy = {
  house: "Family/home responsibilities",
  work: "Personal or work focus",
  school: "School and learning",
  personal: "Private personal task",
  other: "General task",
};

export default function AddTaskDialog({ onClose, onSuccess, editTask = null }) {
  const [title, setTitle] = useState(editTask?.title || "");
  const [category, setCategory] = useState(editTask?.category || "house");
  const [priority, setPriority] = useState(editTask?.priority || "medium");
  const [dueDate, setDueDate] = useState(
    editTask?.due_date || editTask?.dueDate || ""
  );
  const [assignedTo, setAssignedTo] = useState(editTask?.assignedTo || editTask?.assigned_to || "family");
  const [saving, setSaving] = useState(false);

  const { profile, familyId, user } = useFamily();

  const children = normalizeChildren(profile?.children || []);
  const parent1Name = profile?.parent1_name || profile?.parent1Name || user?.displayName || "Me";
  const parent2Name = profile?.parent2_name || profile?.parent2Name || "Co-parent";
  const hasParent2 = Boolean(profile?.parent2_name || profile?.parent2Name || profile?.parent2_email || profile?.parent2Email);

  const assigneeOptions = [
    { value: "family", label: "Family" },
    { value: "parent1", label: parent1Name },
    ...(hasParent2 ? [{ value: "parent2", label: parent2Name }] : []),
    ...children.map((child) => ({ value: `child:${child.id || child.childId || child.name}`, label: child.name || "Child" })),
  ];

  const selectedAssignee = assigneeOptions.find((option) => option.value === assignedTo) || assigneeOptions[0];

  const handleSave = async () => {
    if (!title.trim()) return;

    if (!familyId) {
      alert("No active family found.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        category,
        priority,
        assignedTo,
        assigned_to: assignedTo,
        assignedToName: selectedAssignee?.label || "Family",
        assigned_to_name: selectedAssignee?.label || "Family",
        assignedChildId: assignedTo.startsWith("child:") ? assignedTo.replace("child:", "") : "",
        assigned_child_id: assignedTo.startsWith("child:") ? assignedTo.replace("child:", "") : "",
        due_date: dueDate || "",
        dueDate: dueDate || "",
        familyId,
        family_id: familyId,
        updatedAt: serverTimestamp(),
      };

      if (editTask) {
        await updateDoc(doc(db, "tasks", editTask.id), payload);
      } else {
        await addDoc(collection(db, "tasks"), {
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">
                Family task
              </p>
              <DialogTitle className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {editTask ? "Edit task" : "New task"}
              </DialogTitle>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                Add something the family can track, finish, or turn into a future routine.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          <div>
            <Label>Task</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="mt-1 h-11 rounded-2xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) handleSave();
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">🏠 House</SelectItem>
                  <SelectItem value="work">💼 Work</SelectItem>
                  <SelectItem value="school">📚 School</SelectItem>
                  <SelectItem value="personal">👤 Personal</SelectItem>
                  <SelectItem value="other">📌 Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {categoryCopy[category]}
              </p>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1 h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Helps the family know what needs attention first.
              </p>
            </div>
          </div>

          <div>
            <Label>Assigned to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="mt-1 h-11 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assigneeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === "family" ? "👨‍👩‍👧‍👦" : option.value.startsWith("child:") ? "⭐" : "👤"} {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Choose who this task is for. Kids chores will become more powerful in the next phase.
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
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">
                  Rewards are coming next
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Soon you will be able to turn kids chores into routines with points, rewards, and parent approval.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <p className="text-xs font-semibold leading-5 text-slate-500">
                Tip: use House or School for kid-friendly chores today. A dedicated Kids Chores flow will be added later.
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
