import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  collection,
  serverTimestamp,
  writeBatch,
  doc,
} from "firebase/firestore";

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
import { buildAssigneeOptions, findAssigneeOption } from "@/features/tasks/utils/taskDialogOptions";


const TEMPLATE_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "chore", label: "Chores" },
  { value: "weekday", label: "Weekday" },
  { value: "weekend", label: "Weekend" },
  { value: "bedtime", label: "Bedtime" },
  { value: "daily", label: "Daily" },
];

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function TemplateCard({ template, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md",
        active
          ? "border-primary/25 bg-primary/5 ring-4 ring-primary/5"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-slate-700">
          <Layers className="h-5 w-5" />
        </div>

        {active && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>

      <p className="mt-3 text-base font-black text-slate-950">
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
      </div>
    </button>
  );
}

function PersonPill({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-left transition",
        active
          ? "border-primary/20 bg-primary text-primary-foreground shadow-lg shadow-primary/15"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <p className="text-sm font-black">{option.label}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-75">
        {option.role || "Family"}
      </p>
    </button>
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id || ""
  );
  const [selectedPersonId, setSelectedPersonId] = useState(
    initialPersonId || assigneeOptions[0]?.value || "family"
  );
  const [dueDate, setDueDate] = useState(getTodayKey());
  const [saving, setSaving] = useState(false);

  const filteredTemplates = useMemo(() => {
    if (templateTypeFilter === "all") return templates;
    return templates.filter((template) => template.type === templateTypeFilter);
  }, [templates, templateTypeFilter]);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) ||
    filteredTemplates[0] ||
    templates[0];

  const selectedAssignee = findAssigneeOption(assigneeOptions, selectedPersonId);

  const handleApply = async () => {
    if (!familyId || !selectedTemplate || saving) return;

    const templateTasks = Array.isArray(selectedTemplate.tasks)
      ? selectedTemplate.tasks
      : [];

    if (!templateTasks.length) return;

    setSaving(true);

    try {
      const batch = writeBatch(db);
      const childId =
        selectedAssignee?.roleType === "child"
          ? selectedAssignee.childId || selectedAssignee.value
          : "";

      templateTasks.forEach((task) => {
        const taskRef = doc(collection(db, TASK_COLLECTIONS.tasks));

        batch.set(taskRef, {
          title: task.title,
          category: task.category || selectedTemplate.category || "other",
          priority: task.priority || "medium",
          icon: task.icon || selectedTemplate.icon || "sparkles",
          rewardEligible: task.rewardEligible !== false,
          reward_eligible: task.rewardEligible !== false,
          chore: task.chore === true || selectedTemplate.type === "chore",
          isChore: task.chore === true || selectedTemplate.type === "chore",
          is_chore: task.chore === true || selectedTemplate.type === "chore",

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

          dueDate,
          due_date: dueDate,
          status: "pending",

          familyId,
          family_id: familyId,
          familyName: profile?.family_name || profile?.familyName || "",

          templateId: selectedTemplate.id,
          template_id: selectedTemplate.id,
          templateTitle: selectedTemplate.title,
          template_title: selectedTemplate.title,

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
    } catch (error) {
      console.error("Error applying task template:", error);
      alert(`There was an error applying the routine: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange?.(nextOpen)}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden rounded-[2.25rem] border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b bg-gradient-to-br from-white via-secondary/35 to-accent/10 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Routine templates
              </p>

              <DialogTitle className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                Apply routine
              </DialogTitle>

              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                Pick a reusable routine, assign it to a person, and create real tasks for a specific date.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-155px)] overflow-y-auto p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_340px]">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Label>Choose routine</Label>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {filteredTemplates.length} shown · {templates.length} total
                </span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {TEMPLATE_TYPE_FILTERS.map((filter) => {
                  const active = templateTypeFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => {
                        setTemplateTypeFilter(filter.value);
                        const nextTemplate = filter.value === "all"
                          ? templates[0]
                          : templates.find((template) => template.type === filter.value);

                        if (nextTemplate) setSelectedTemplateId(nextTemplate.id);
                      }}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-black transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                          : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    active={selectedTemplate?.id === template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                  />
                ))}
              </div>
            </section>

            <aside className="space-y-5">
              <section>
                <Label>Assign to</Label>
                <div className="mt-2 grid gap-2">
                  {assigneeOptions.map((option) => (
                    <PersonPill
                      key={option.value}
                      option={option}
                      active={selectedPersonId === option.value}
                      onClick={() => setSelectedPersonId(option.value)}
                    />
                  ))}
                </div>
              </section>

              <section>
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
              </section>

              <section className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Preview
                </p>

                <p className="mt-3 text-lg font-black text-slate-950">
                  {selectedTemplate?.title || "Routine"}
                </p>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  {(selectedTemplate?.tasks || []).length} tasks for {selectedAssignee?.label || "Family"}
                </p>

                <div className="mt-3 space-y-2">
                  {(selectedTemplate?.tasks || []).slice(0, 5).map((task, index) => (
                    <div
                      key={`${task.title}-${index}`}
                      className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-slate-700"
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>

        <DialogFooter className="bg-white/95 px-5 pb-4 pt-2">
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
