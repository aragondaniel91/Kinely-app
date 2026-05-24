import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
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

function getRunId({ familyId, templateId, dateKey }) {
  return `${familyId}_${templateId}_${dateKey}`.replace(/[^a-zA-Z0-9_-]/g, "_");
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
    createdTaskIds: data.createdTaskIds || data.created_task_ids || [],
  };
}

export function useRoutineRuns({ familyId, canRead, canWrite = false, user = null }) {
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
      let snap;

      try {
        const q = query(
          collection(db, TASK_COLLECTIONS.routineRuns),
          where("familyId", "==", familyId),
          where("date", "==", todayKey)
        );

        snap = await getDocs(q);
      } catch (error) {
        console.warn("Fallback to routineRuns family_id query:", error);

        const q = query(
          collection(db, TASK_COLLECTIONS.routineRuns),
          where("family_id", "==", familyId),
          where("date", "==", todayKey)
        );

        snap = await getDocs(q);
      }

      setRoutineRuns(snap.docs.map(normalizeRoutineRun));
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
      if (!familyId || !canWrite || !template?.id) return;

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
        alert(`There was an error skipping the routine: ${error.message}`);
      }
    },
    [familyId, canWrite, todayKey, user, loadRoutineRuns]
  );

  return {
    routineRuns,
    loadingRoutineRuns,
    loadRoutineRuns,
    skipRoutineToday,
    todayKey,
  };
}
