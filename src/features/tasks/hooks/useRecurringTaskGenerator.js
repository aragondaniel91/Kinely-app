import { useCallback, useEffect, useRef } from "react";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";

function getDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayRecurrenceType() {
  const day = new Date().getDay();

  if (day === 0 || day === 6) return "weekends";

  return "weekdays";
}

function shouldRunToday(template) {
  const recurrence = template.recurrence || template.repeat || "manual";

  if (recurrence === "daily") return true;
  if (recurrence === getTodayRecurrenceType()) return true;

  return false;
}

function getRunId({ familyId, templateId, dateKey }) {
  return `${familyId}_${templateId}_${dateKey}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getAssignedPersonFromTemplate(template, people = []) {
  const assignedPersonId =
    template.assignedToPersonId ||
    template.assigned_to_person_id ||
    template.defaultPersonId ||
    template.default_person_id ||
    "";

  if (assignedPersonId) {
    return people.find((person) => person.id === assignedPersonId) || null;
  }

  return people.find((person) => person.roleType === "child") ||
    people.find((person) => person.id === "family") ||
    people[0] ||
    null;
}

export function useRecurringTaskGenerator({
  familyId,
  canRead,
  canWrite,
  templates = [],
  people = [],
  user = null,
  profile = null,
  onGenerated,
}) {
  const isRunningRef = useRef(false);

  const generateRecurringTasks = useCallback(async () => {
    if (!familyId || !canRead || !canWrite || isRunningRef.current) return;

    const recurringTemplates = templates.filter((template) => {
      if (template.source === "starter") return false;
      if (template.active === false) return false;
      if (!Array.isArray(template.tasks) || template.tasks.length === 0) return false;

      return shouldRunToday(template);
    });

    if (!recurringTemplates.length) return;

    isRunningRef.current = true;

    try {
      const dateKey = getDateKey(0);
      let generatedAny = false;

      for (const template of recurringTemplates) {
        const runId = getRunId({
          familyId,
          templateId: template.id,
          dateKey,
        });

        const runRef = doc(db, TASK_COLLECTIONS.routineRuns, runId);
        const existingRun = await getDoc(runRef);

        if (existingRun.exists()) continue;

        const selectedPerson = getAssignedPersonFromTemplate(template, people);
        const childId =
          selectedPerson?.roleType === "child"
            ? selectedPerson.childId || selectedPerson.id
            : "";

        const batch = writeBatch(db);
        const createdTaskIds = [];

        template.tasks.forEach((task) => {
          const taskRef = doc(collection(db, TASK_COLLECTIONS.tasks));
          createdTaskIds.push(taskRef.id);

          const isChore = task.chore === true || template.type === "chore";
          const rewardEligible = task.rewardEligible !== false;

          batch.set(taskRef, {
            title: task.title,
            category: task.category || template.category || "other",
            priority: task.priority || "medium",
            icon: task.icon || template.icon || "sparkles",

            rewardEligible,
            reward_eligible: rewardEligible,

            chore: isChore,
            isChore,
            is_chore: isChore,
            taskKind: isChore ? "chore" : "task",
            task_kind: isChore ? "chore" : "task",

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

            dueDate: dateKey,
            due_date: dateKey,
            status: "pending",

            familyId,
            family_id: familyId,
            familyName: profile?.family_name || profile?.familyName || "",

            templateId: template.id,
            template_id: template.id,
            templateTitle: template.title,
            template_title: template.title,

            generatedFromRoutine: true,
            generated_from_routine: true,
            routineRunId: runId,
            routine_run_id: runId,

            createdBy: user?.uid || null,
            createdByEmail: user?.email || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            created_date: new Date().toISOString(),
          });
        });

        batch.set(runRef, {
          id: runId,
          familyId,
          family_id: familyId,
          templateId: template.id,
          template_id: template.id,
          templateTitle: template.title,
          template_title: template.title,
          date: dateKey,
          runDate: dateKey,
          run_date: dateKey,
          recurrence: template.recurrence || template.repeat || "manual",
          createdTaskIds,
          created_task_ids: createdTaskIds,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
        });

        await batch.commit();
        generatedAny = true;
      }

      if (generatedAny) {
        await onGenerated?.();
      }
    } catch (error) {
      console.error("Error generating recurring tasks:", error);
    } finally {
      isRunningRef.current = false;
    }
  }, [
    familyId,
    canRead,
    canWrite,
    templates,
    people,
    user,
    profile,
    onGenerated,
  ]);

  useEffect(() => {
    generateRecurringTasks();
  }, [generateRecurringTasks]);

  return {
    generateRecurringTasks,
  };
}
