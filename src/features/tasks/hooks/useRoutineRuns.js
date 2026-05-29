import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { getFamilyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";

function getDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRunId({ familyId, templateId, dateKey }) {
  return `${familyId}_${templateId}_${dateKey}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getTaskDateKey(task = {}) {
  const raw =
    task.dueDate ||
    task.due_date ||
    task.date ||
    task.taskDate ||
    task.task_date ||
    "";

  if (!raw) return "";

  if (typeof raw === "string") return raw.slice(0, 10);

  if (typeof raw?.toDate === "function") {
    const date = raw.toDate();
    return getDateKeyFromDate(date);
  }

  if (typeof raw?.seconds === "number") {
    return getDateKeyFromDate(new Date(raw.seconds * 1000));
  }

  if (raw instanceof Date) return getDateKeyFromDate(raw);

  return "";
}

function getDateKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isCancelledTask(task = {}) {
  return (
    task.status === "cancelled" ||
    task.status === "canceled" ||
    task.cancelled === true ||
    task.canceled === true
  );
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

  return (
    people.find((person) => person.roleType === "child") ||
    people.find((person) => person.id === "family") ||
    people[0] ||
    null
  );
}

function normalizeRoutineRun(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    ...data,
    familyId: data.familyId || data.family_id || "",
    templateId: data.templateId || data.template_id || "",
    templateTitle: data.templateTitle || data.template_title || "",
    date: data.date || data.runDate || data.run_date || "",
    recurrence: data.recurrence || "manual",
    status: data.status || "generated",
    skipped: data.skipped === true || data.status === "skipped",
    cancelled: data.cancelled === true || data.canceled === true || data.status === "cancelled",
    createdTaskIds: data.createdTaskIds || data.created_task_ids || [],
  };
}

export function useRoutineRuns({
  familyId,
  canRead,
  canWrite = false,
  user = null,
  profile = null,
  people = [],
}) {
  const [routineRuns, setRoutineRuns] = useState([]);
  const [loadingRoutineRuns, setLoadingRoutineRuns] = useState(true);

  const todayKey = getDateKey(0);

  const loadRoutineRuns = useCallback(async () => {
    if (!familyId || !canRead) {
      setRoutineRuns([]);
      setLoadingRoutineRuns(false);
      return;
    }

    setLoadingRoutineRuns(true);

    try {
      const runDocs = await getFamilyScopedDocSnaps(TASK_COLLECTIONS.routineRuns, familyId);
      setRoutineRuns(
        runDocs
          .map(normalizeRoutineRun)
          .filter((run) => run.date === todayKey)
      );
    } catch (error) {
      console.error("Error loading routine runs:", error);
      setRoutineRuns([]);
    } finally {
      setLoadingRoutineRuns(false);
    }
  }, [familyId, canRead, todayKey]);

  useEffect(() => {
    loadRoutineRuns();
  }, [loadRoutineRuns]);

  const skipRoutineToday = useCallback(
    async (template) => {
      if (!familyId || !template?.id) return;

      const runId = getRunId({
        familyId,
        templateId: template.id,
        dateKey: todayKey,
      });

      try {
        await setDoc(
          doc(db, TASK_COLLECTIONS.routineRuns, runId),
          {
            id: runId,
            familyId,
            family_id: familyId,
            templateId: template.id,
            template_id: template.id,
            templateTitle: template.title || "Routine",
            template_title: template.title || "Routine",
            date: todayKey,
            runDate: todayKey,
            run_date: todayKey,
            recurrence: template.recurrence || template.repeat || "manual",
            status: "skipped",
            skipped: true,
            createdTaskIds: [],
            created_task_ids: [],
            skippedAt: serverTimestamp(),
            skipped_at: serverTimestamp(),
            skippedBy: user?.uid || null,
            skipped_by: user?.uid || null,
            createdAt: serverTimestamp(),
            createdBy: user?.uid || null,
          },
          { merge: true }
        );

        await loadRoutineRuns();
      } catch (error) {
        console.error("Error skipping routine today:", error);
        notifyRoutineNotice({
          tone: "danger",
          title: "Could not skip routine",
          message: error.message,
        });
      }
    },
    [familyId, canWrite, todayKey, user, loadRoutineRuns]
  );

  const getExistingRoutineTasksToday = useCallback(
    async (template) => {
      if (!familyId || !template?.id) return [];

      const taskDocs = await getFamilyScopedDocSnaps(TASK_COLLECTIONS.tasks, familyId);

      return taskDocs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((task) => (task.templateId || task.template_id) === template.id)
        .filter((task) => getTaskDateKey(task) === todayKey && !isCancelledTask(task));
    },
    [familyId, todayKey]
  );

  const regenerateRoutineToday = useCallback(
    async (template) => {
      if (!familyId || !template?.id) return;

      const templateTasks = Array.isArray(template.tasks) ? template.tasks : [];

      if (!templateTasks.length) {
        notifyRoutineNotice({
          tone: "warning",
          title: "No tasks to regenerate",
          message: "This routine does not have tasks to regenerate.",
        });
        return;
      }

      const runId = getRunId({
        familyId,
        templateId: template.id,
        dateKey: todayKey,
      });

      try {
        const existingTasksToday = await getExistingRoutineTasksToday(template);

        if (existingTasksToday.length > 0) {
          notifyRoutineNotice({
            tone: "warning",
            title: "Routine already has tasks today",
            message: `This routine already has ${existingTasksToday.length} task${existingTasksToday.length === 1 ? "" : "s"} for today. Recreate is blocked to avoid duplicates.`,
          });
          return;
        }
        const selectedPerson = getAssignedPersonFromTemplate(template, people);
        const childId =
          selectedPerson?.roleType === "child"
            ? selectedPerson.childId || selectedPerson.id
            : "";

        const batch = writeBatch(db);
        const createdTaskIds = [];

        templateTasks.forEach((task) => {
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

            dueDate: todayKey,
            due_date: todayKey,
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

            regenerated: true,
            regenerated_from_routine: true,

            createdBy: user?.uid || null,
            createdByEmail: user?.email || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            created_date: new Date().toISOString(),
          });
        });

        const runRef = doc(db, TASK_COLLECTIONS.routineRuns, runId);

        batch.set(
          runRef,
          {
            id: runId,
            familyId,
            family_id: familyId,
            templateId: template.id,
            template_id: template.id,
            templateTitle: template.title || "Routine",
            template_title: template.title || "Routine",
            date: todayKey,
            runDate: todayKey,
            run_date: todayKey,
            recurrence: template.recurrence || template.repeat || "manual",
            status: "generated",
            skipped: false,
            createdTaskIds,
            created_task_ids: createdTaskIds,
            regeneratedAt: serverTimestamp(),
            regenerated_at: serverTimestamp(),
            regeneratedBy: user?.uid || null,
            regenerated_by: user?.uid || null,
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || null,
          },
          { merge: true }
        );

        await batch.commit();
        await loadRoutineRuns();
      } catch (error) {
        console.error("Error regenerating routine today:", error);
        notifyRoutineNotice({
          tone: "danger",
          title: "Could not regenerate routine",
          message: error.message,
        });
      }
    },
    [familyId, canWrite, todayKey, user, profile, people, loadRoutineRuns, getExistingRoutineTasksToday]
  );

  const cancelRoutineToday = useCallback(
    async (template) => {
      if (!familyId || !template?.id) return;

      const runId = getRunId({
        familyId,
        templateId: template.id,
        dateKey: todayKey,
      });

      try {
        const existingTasksToday = await getExistingRoutineTasksToday(template);
        const batch = writeBatch(db);

        existingTasksToday.forEach((task) => {
          batch.update(doc(db, TASK_COLLECTIONS.tasks, task.id), {
            status: "cancelled",
            cancelled: true,
            canceled: true,
            cancelledAt: serverTimestamp(),
            cancelled_at: serverTimestamp(),
            cancelledBy: user?.uid || null,
            cancelled_by: user?.uid || null,
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || null,
          });
        });

        batch.set(
          doc(db, TASK_COLLECTIONS.routineRuns, runId),
          {
            id: runId,
            familyId,
            family_id: familyId,
            templateId: template.id,
            template_id: template.id,
            templateTitle: template.title || "Routine",
            template_title: template.title || "Routine",
            date: todayKey,
            runDate: todayKey,
            run_date: todayKey,
            recurrence: template.recurrence || template.repeat || "manual",
            status: "cancelled",
            cancelled: true,
            canceled: true,
            skipped: false,
            cancelledTaskIds: existingTasksToday.map((task) => task.id),
            cancelled_task_ids: existingTasksToday.map((task) => task.id),
            cancelledAt: serverTimestamp(),
            cancelled_at: serverTimestamp(),
            cancelledBy: user?.uid || null,
            cancelled_by: user?.uid || null,
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || null,
          },
          { merge: true }
        );

        await batch.commit();
        await loadRoutineRuns();
      } catch (error) {
        console.error("Error cancelling routine today:", error);
        notifyRoutineNotice({
          tone: "danger",
          title: "Could not cancel routine",
          message: error.message,
        });
      }
    },
    [familyId, todayKey, user, loadRoutineRuns, getExistingRoutineTasksToday]
  );

  return {
    routineRuns,
    loadingRoutineRuns,
    loadRoutineRuns,
    skipRoutineToday,
    regenerateRoutineToday,
    cancelRoutineToday,
    todayKey,
  };
}
